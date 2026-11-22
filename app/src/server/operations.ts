import { HttpError, prisma } from "wasp/server";
import type {
  AskDonna,
  AttemptWithoutApproval,
  CreateCandidate,
  Decide,
  FinalizeScreen,
  GetCandidate,
  GetIntegrationStatus,
  ListCandidates,
  ListRoles,
  ProposeBooking,
  SaveHiringPrefs,
  StartScreen,
} from "wasp/server/operations";
import type { Approval as ApprovalRow, Candidate, Role as RoleRow } from "wasp/entities";
import type {
  Approval,
  EvaluateResult,
  ResearchResult,
  StartScreenResult,
  TimelineEvent,
  TranscriptTurn,
} from "./contracts";
import * as alter from "./integrations/alter";
import * as box from "./integrations/box";
import * as elevenlabs from "./integrations/elevenlabs";
import * as github from "./integrations/github";
import * as traceroot from "./integrations/traceroot";
import { traced, traceUrlFor } from "./integrations/traceroot";
import { FIXTURE_CONVERSATION } from "./fixtures";
import { cleanPrefs, founderFocus } from "./hiringFocus";
import { scoreFromCallAnalysis, scoreFromScorer, type ScoreSource } from "./scoring";
import {
  candidateInclude,
  logEvent,
  parseJson,
  setStatus,
  toApproval,
  toApprovalView,
  toCandidateView,
  toRoleView,
} from "./pipeline";
import type { ApprovalView, CandidateView, IntegrationStatus, Plain, RoleView } from "./views";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `${field} must be a non-empty string, got ${JSON.stringify(value)}`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireString(value, field);
}

async function loadCandidate(id: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id }, include: { role: true } });
  if (!candidate) throw new HttpError(404, `Candidate ${id} not found`);
  return candidate;
}

async function loadApproval(id: string) {
  const row = await prisma.approval.findUnique({ where: { id } });
  if (!row) throw new HttpError(404, `Approval ${id} not found`);
  return row;
}

// Once an approval is APPROVED or REJECTED nothing may act on it again: a second attempt or
// decision on an approved booking would send a second invite.
function requireOpenApproval(row: { id: string; status: string }): void {
  if (row.status !== "PENDING" && row.status !== "DENIED_ATTEMPT") {
    throw new HttpError(409, `Approval ${row.id} is already ${row.status}`);
  }
}

// A screen can start while research is still running, so research finishing late must not
// rewind a candidate who is already CALLING or beyond.
async function markReadyIfResearching(candidateId: string): Promise<void> {
  await prisma.candidate.updateMany({ where: { id: candidateId, status: "RESEARCHING" }, data: { status: "READY" } });
}

// ---------- Queries ----------

export const listRoles: ListRoles<void, RoleView[]> = async () => {
  const roles = await prisma.role.findMany({ orderBy: { createdAt: "asc" } });
  return roles.map(toRoleView);
};

export const listCandidates: ListCandidates<{ roleId?: string } | undefined, CandidateView[]> = async (args) => {
  const roleId = optionalString(args?.roleId, "roleId");
  const rows = await prisma.candidate.findMany({
    where: roleId ? { roleId } : undefined,
    include: candidateInclude,
    orderBy: { createdAt: "desc" },
  });
  const views = rows.map(toCandidateView);
  // Stable sort keeps newest-first among equal scores and among unscored candidates.
  return views.sort((a, b) => (b.scorecard?.overall ?? -1) - (a.scorecard?.overall ?? -1));
};

export const getCandidate: GetCandidate<{ id: string }, CandidateView> = async (args) => {
  const id = requireString(args?.id, "id");
  const row = await prisma.candidate.findUnique({ where: { id }, include: candidateInclude });
  if (!row) throw new HttpError(404, `Candidate ${id} not found`);
  return toCandidateView(row);
};

// An integration counts as live only when its own module says so. box.ts and traceroot.ts
// start as fixture stubs, so an env var being set does not mean the real call is wired: their
// owners add `export function isStubbed()` when it is. Until then they are reported as stubbed.
function reportsLive(integration: object): boolean {
  const isStubbed = (integration as { isStubbed?: () => boolean }).isStubbed;
  return typeof isStubbed === "function" && !isStubbed();
}

export const getIntegrationStatus: GetIntegrationStatus<void, IntegrationStatus> = async () => ({
  elevenlabs: reportsLive(elevenlabs),
  box: reportsLive(box),
  // alter.ts has no isStubbed(); it exposes alterMode(), which is what its own calls branch on.
  alter: alter.alterMode() === "live",
  traceroot: reportsLive(traceroot),
});

// ---------- Actions ----------

type CreateCandidateInput = {
  roleId: string;
  name: string;
  email: string;
  githubUser?: string;
  linkedinUrl?: string;
  consent: boolean;
};

export const createCandidate: CreateCandidate<CreateCandidateInput, CandidateView> = async (args) => {
  if (args?.consent !== true) throw new HttpError(400, "consent must be true to apply");
  const roleId = requireString(args.roleId, "roleId");
  const name = requireString(args.name, "name");
  const email = requireString(args.email, "email");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, `email is not valid: ${JSON.stringify(email)}`);
  const githubUser = optionalString(args.githubUser, "githubUser");
  const linkedinUrl = optionalString(args.linkedinUrl, "linkedinUrl");

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new HttpError(404, `Role ${roleId} not found`);

  const candidate = await prisma.candidate.create({
    data: { roleId, name, email, githubUser, linkedinUrl, consentAt: new Date(), status: "APPLIED" },
  });
  await logEvent(candidate.id, "applied", `${name} applied for ${role.title}`);
  await setStatus(candidate.id, "RESEARCHING");

  const roleView = toRoleView(role);
  void runResearch(candidate.id, {
    name,
    email,
    githubUser,
    linkedinUrl,
    role: { title: roleView.title, companyName: roleView.companyName, rubric: roleView.rubric },
  });

  const row = await prisma.candidate.findUniqueOrThrow({ where: { id: candidate.id }, include: candidateInclude });
  return toCandidateView(row);
};

/**
 * Where a dossier comes from: the Donna box when it is live; otherwise the candidate's own public GitHub repos
 * when they typed a username; otherwise the box stub. A GitHub lookup that fails throws, so that candidate
 * continues without a dossier instead of being asked about the fixture's project.
 */
function research(request: Parameters<typeof box.research>[0]): Promise<ResearchResult> {
  if (!reportsLive(box) && request.githubUser?.trim()) return github.researchFromGithub(request);
  return box.research(request);
}

async function runResearch(candidateId: string, request: Parameters<typeof box.research>[0]): Promise<void> {
  try {
    const dossier = await traced("research", { candidateId }, () => research(request));
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { dossier: JSON.stringify(dossier), traceUrl: traceUrlFor(candidateId) },
    });
    await markReadyIfResearching(candidateId);
    await logEvent(candidateId, "research_done", dossier.summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Research failed for candidate ${candidateId}:`, err);
    try {
      await markReadyIfResearching(candidateId);
      await logEvent(candidateId, "research_done", `Research failed, continuing without a dossier: ${message}`);
    } catch (saveErr) {
      console.error(`Could not record research failure for candidate ${candidateId}:`, saveErr);
    }
  }
}

export const startScreen: StartScreen<{ candidateId: string; fast?: boolean }, Plain<StartScreenResult>> = async (args) => {
  const candidateId = requireString(args?.candidateId, "candidateId");
  const candidate = await loadCandidate(candidateId);
  const role = toRoleView(candidate.role);
  const dossier = parseJson<ResearchResult>(candidate.dossier, "dossier", candidateId);

  const session = await elevenlabs.startSession();
  const result: StartScreenResult = {
    token: session.token,
    agentId: session.agentId,
    dynamicVariables: {
      candidate_name: candidate.name,
      founder_name: role.founderName,
      company_name: role.companyName,
      role_title: role.title,
      top_project: dossier?.topProject ?? "your recent work",
      tailored_questions: (dossier?.tailoredQuestions ?? role.questions).join("\n"),
      founder_focus: founderFocus(candidate.role.hiringPrefs),
      demo_fast_mode: args.fast === true,
    },
  };
  await setStatus(candidateId, "CALLING");
  await logEvent(candidateId, "call_started", elevenlabs.isStubbed() ? "ElevenLabs stubbed" : "");
  return result;
};

// Research can fail and still leave the candidate READY; the panel then scores the call alone.
function emptyDossier(questions: string[]): ResearchResult {
  const [q0 = "", q1 = "", q2 = ""] = questions;
  return {
    summary: "No research available.",
    topProject: "your recent work",
    highlights: [],
    claimsToVerify: [],
    tailoredQuestions: [q0, q1, q2],
    sources: { fiber: false, ploid: false, github: false },
  };
}

export const finalizeScreen: FinalizeScreen<{ candidateId: string; conversationId: string }, Plain<EvaluateResult> | null> = async (
  args,
) => {
  const candidateId = requireString(args?.candidateId, "candidateId");
  const conversationId = requireString(args.conversationId, "conversationId");
  const key = `${candidateId}:${conversationId}`;
  let run = finalizing.get(key);
  if (!run) {
    run = runFinalize(candidateId, conversationId).finally(() => finalizing.delete(key));
    finalizing.set(key, run);
  }
  return run;
};

// The browser abandons a request after 10 s (Wasp's HTTP client default), but scoring a real call
// takes longer and keeps running here. The client then polls or asks again, so runs for the same
// conversation share one promise and a conversation that is already scored is not scored twice.
const finalizing = new Map<string, Promise<EvaluateResult | null>>();

async function runFinalize(candidateId: string, conversationId: string): Promise<EvaluateResult | null> {
  const candidate = await loadCandidate(candidateId);
  const stored = parseJson<EvaluateResult>(candidate.scorecard, "scorecard", candidateId);
  if (
    candidate.conversationId === conversationId &&
    candidate.status !== "CALLING" &&
    candidate.status !== "EVALUATING" &&
    (stored || (candidate.status === "AWAITING_APPROVAL" && candidate.transcript !== null))
  ) return stored;

  const role = toRoleView(candidate.role);
  const dossier = parseJson<ResearchResult>(candidate.dossier, "dossier", candidateId) ?? emptyDossier(role.questions);

  await prisma.candidate.update({ where: { id: candidateId }, data: { status: "EVALUATING", conversationId } });
  const progress: FinalizeProgress = { stage: "call_ended" };
  try {
    return await fetchAndScore(candidateId, conversationId, role, dossier, progress);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Back to CALLING so the screen can be finalized again, with the reason on the timeline:
    // by now the client has usually stopped waiting and can only learn it from the candidate.
    try {
      await setStatus(candidateId, "CALLING");
      await logEvent(candidateId, progress.stage, `Failed: ${message}`);
    } catch (saveErr) {
      console.error(`Could not record the finalize failure for candidate ${candidateId}:`, saveErr);
    }
    throw err;
  }
}

type FinalizeProgress = { stage: "call_ended" | "evaluated" };

function dossierSummary(d: ResearchResult): string {
  return [
    d.summary,
    d.topProject && `Top project: ${d.topProject}.`,
    d.highlights.length ? `Highlights: ${d.highlights.join("; ")}.` : "",
    d.claimsToVerify.length ? `Claims to verify: ${d.claimsToVerify.join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

const SCORE_SOURCE_LABELS: Record<ScoreSource, string> = {
  llm_scorer: "scored by the ElevenLabs LLM against the scoring guidelines",
  call_analysis: "scored from the call by ElevenLabs' analysis",
  panel: "3-persona panel",
  fixture: "fixture panel",
};

async function fetchAndScore(
  candidateId: string,
  conversationId: string,
  role: RoleView,
  dossier: ResearchResult,
  progress: FinalizeProgress,
): Promise<EvaluateResult | null> {
  const conversation = await traced("fetch_conversation", { candidateId, conversationId }, () =>
    elevenlabs.fetchConversation(conversationId),
  );
  const transcript: TranscriptTurn[] = conversation.transcript;
  // The scorecard does not need the audio, so a failed download costs only the receipts player.
  let audioPath: string | null = null;
  let audioNote = ", no audio";
  try {
    audioPath = await elevenlabs.downloadAudio(conversationId, candidateId);
    if (audioPath) audioNote = "";
  } catch (err) {
    console.error(`Audio download failed for candidate ${candidateId} (conversation ${conversationId}):`, err);
    audioNote = `, audio download failed: ${err instanceof Error ? err.message : String(err)}`;
  }
  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      transcript: JSON.stringify(transcript),
      durationSecs: conversation.durationSecs,
      analysis: JSON.stringify(conversation.analysis ?? null),
      audioPath,
    },
  });
  await logEvent(candidateId, "call_ended", `${transcript.length} turns, ${conversation.durationSecs}s${audioNote}`);
  progress.stage = "evaluated";

  const fixtureCall = elevenlabs.isStubbed() || conversationId === FIXTURE_CONVERSATION.conversationId;
  let evaluation: (EvaluateResult & { source: ScoreSource }) | null = null;
  if (fixtureCall || (reportsLive(box) && transcript.some((turn) => turn.role === "user"))) {
    try {
      const scorecard = await traced("evaluate", { candidateId }, () =>
        box.evaluate({ dossier, rubric: role.rubric, transcript }),
      );
      evaluation = { ...scorecard, source: fixtureCall ? "fixture" : "panel" };
    } catch (err) {
      if (fixtureCall || !(err instanceof box.EvaluationUnavailableError)) throw err;
    }
  }

  let unscoredReason = "";
  if (!evaluation && !elevenlabs.isScorerStubbed() && transcript.some((turn) => turn.role === "user")) {
    try {
      const raw = await traced("score_with_llm", { candidateId }, () =>
        elevenlabs.scoreScreen({
          roleTitle: role.title,
          companyName: role.companyName,
          rubric: role.rubric,
          dossier: dossierSummary(dossier),
          transcript,
        }),
      );
      const scored = scoreFromScorer(raw, transcript, role.rubric);
      if ("scorecard" in scored) evaluation = { ...scored.scorecard, source: "llm_scorer" };
      else console.warn(`Scorer reply for candidate ${candidateId} was unusable (${scored.unusable}); using the call analysis`);
    } catch (err) {
      console.error(`Scoring candidate ${candidateId} with the ElevenLabs scorer failed; using the call analysis:`, err);
    }
  }
  if (!evaluation) {
    try {
      const fromCall = scoreFromCallAnalysis(conversation.analysis, transcript, role.rubric);
      if ("scorecard" in fromCall) evaluation = { ...fromCall.scorecard, source: "call_analysis" };
      else unscoredReason = fromCall.unusable;
    } catch (err) {
      console.error(`Scoring candidate ${candidateId} from the call analysis failed:`, err);
      unscoredReason = "call analysis could not be read";
    }
  }

  const status = evaluation?.recommendation === "REJECT" ? "REJECTED" : "AWAITING_APPROVAL";
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { scorecard: evaluation ? JSON.stringify(evaluation) : null, status, traceUrl: traceUrlFor(candidateId) },
  });
  await logEvent(
    candidateId,
    "evaluated",
    evaluation
      ? `${evaluation.recommendation}, overall ${evaluation.overall} (${SCORE_SOURCE_LABELS[evaluation.source]})`
      : `Saved for founder review without a score: ${unscoredReason}`,
  );
  return evaluation;
}

// The gate requires a PENDING approval. Rows saved before the trust lane landed recorded a denied
// attempt as DENIED_ATTEMPT; the gate now keeps those PENDING with deniedAttempt set.
function toGateApproval(row: ApprovalRow): Approval {
  const approval = toApproval(row);
  return approval.status === "DENIED_ATTEMPT" ? { ...approval, status: "PENDING" } : approval;
}

function bookingInput(candidate: Candidate & { role: RoleRow }, slotIso?: string): alter.BookingInput {
  return {
    candidate: { id: candidate.id, name: candidate.name, email: candidate.email },
    role: { title: candidate.role.title, companyName: candidate.role.companyName, founderName: candidate.role.founderName },
    slotIso,
  };
}

async function callGate(step: string, approvalId: string | null, run: () => Promise<alter.AlterOutcome>) {
  try {
    return await run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Approval gate ${step} failed${approvalId ? ` for approval ${approvalId}` : ""}:`, err);
    throw new HttpError(502, `Approval gate ${step} failed: ${message}`);
  }
}

const EVENT_KINDS: ReadonlySet<string> = new Set<TimelineEvent["kind"]>([
  "applied",
  "research_done",
  "call_started",
  "call_ended",
  "evaluated",
  "booking_proposed",
  "denied_attempt",
  "approved",
  "rejected",
  "invite_sent",
]);

// The gate types its kinds against the contract, but its events are stored as plain strings, so an
// unknown kind is written as the step's own kind with the original kept in the detail.
async function saveGateEvents(candidateId: string, outcome: alter.AlterOutcome, fallback: TimelineEvent["kind"]) {
  for (const e of outcome.events) {
    const known = EVENT_KINDS.has(e.kind);
    if (!known) console.warn(`Approval gate returned unknown event kind ${JSON.stringify(e.kind)}; saved as ${fallback}`);
    await prisma.event.create({
      data: {
        candidateId,
        at: new Date(e.at),
        kind: known ? e.kind : fallback,
        detail: known ? e.detail : `[${e.kind}] ${e.detail}`,
      },
    });
  }
  if (outcome.candidateStatus) await setStatus(candidateId, outcome.candidateStatus);
}

function gateRowData(outcome: alter.AlterOutcome) {
  const { approval } = outcome;
  return {
    slotIso: approval.slotIso,
    status: approval.status,
    alterRef: approval.alterRef,
    emailDraft: JSON.stringify(approval.emailDraft),
    deniedAttempt: approval.deniedAttempt ? JSON.stringify(approval.deniedAttempt) : null,
    // Links persist across steps: a later step that returns none keeps the earlier one.
    ...(outcome.approvalUrl ? { approvalUrl: outcome.approvalUrl } : {}),
    ...(outcome.calendarUrl ? { calendarUrl: outcome.calendarUrl } : {}),
  };
}

export const proposeBooking: ProposeBooking<{ candidateId: string; slotIso?: string }, ApprovalView> = async (args) => {
  const candidateId = requireString(args?.candidateId, "candidateId");
  const slotIso = optionalString(args.slotIso, "slotIso");
  if (slotIso && Number.isNaN(Date.parse(slotIso))) {
    throw new HttpError(400, `slotIso is not an ISO date: ${JSON.stringify(slotIso)}`);
  }
  const candidate = await loadCandidate(candidateId);

  const outcome = await callGate("propose", null, () => alter.proposeBooking(bookingInput(candidate, slotIso)));
  const row = await prisma.approval.create({ data: { candidateId, ...gateRowData(outcome) } });
  await saveGateEvents(candidateId, outcome, "booking_proposed");
  return toApprovalView(row);
};

export const attemptWithoutApproval: AttemptWithoutApproval<{ approvalId: string }, ApprovalView> = async (args) => {
  const approvalId = requireString(args?.approvalId, "approvalId");
  const row = await loadApproval(approvalId);
  requireOpenApproval(row);
  const candidate = await loadCandidate(row.candidateId);

  const outcome = await callGate("attemptWithoutApproval", approvalId, () =>
    alter.attemptWithoutApproval(toGateApproval(row), bookingInput(candidate, row.slotIso)),
  );
  const updated = await prisma.approval.update({ where: { id: approvalId }, data: gateRowData(outcome) });
  await saveGateEvents(row.candidateId, outcome, "denied_attempt");
  return toApprovalView(updated);
};

export const decide: Decide<{ approvalId: string; approve: boolean }, ApprovalView> = async (args) => {
  const approvalId = requireString(args?.approvalId, "approvalId");
  if (typeof args.approve !== "boolean") {
    throw new HttpError(400, `approve must be a boolean, got ${JSON.stringify(args.approve)}`);
  }
  const approve = args.approve;
  const inFlight = deciding.get(approvalId);
  if (inFlight) {
    if (inFlight.approve !== approve) {
      throw new HttpError(409, `Approval ${approvalId} is already being ${inFlight.approve ? "approved" : "rejected"}`);
    }
    return inFlight.run;
  }
  const run = runDecide(approvalId, approve).finally(() => deciding.delete(approvalId));
  deciding.set(approvalId, { approve, run });
  return run;
};

// A live approval waits inside the request for the founder to approve in Alter (up to
// ALTER_APPROVAL_WAIT_MS), far past the 10 s the browser waits. A client that asks again during
// that wait joins it instead of starting a second booking.
const deciding = new Map<string, { approve: boolean; run: Promise<ApprovalView> }>();

async function runDecide(approvalId: string, approve: boolean): Promise<ApprovalView> {
  const row = await loadApproval(approvalId);
  requireOpenApproval(row);
  const candidate = await loadCandidate(row.candidateId);

  const outcome = await callGate("decide", approvalId, () =>
    alter.decide(toGateApproval(row), approve, bookingInput(candidate, row.slotIso)),
  );
  const updated = await prisma.approval.update({ where: { id: approvalId }, data: gateRowData(outcome) });
  await saveGateEvents(row.candidateId, outcome, approve ? "approved" : "rejected");
  return toApprovalView(updated);
}

// ---------- Ask Donna chat ----------

// The founder page saves its hiring preferences here so the voice screen can use them.
// Only the call-relevant part is kept (see hiringFocus.ts); null clears it.
type HiringPrefsInput = {
  roleId: string;
  // What the founder page sends; extra ranking-only fields are ignored and every field is re-checked.
  prefs: { seniority?: string; shape?: string; stack?: string[]; traits?: string[]; notes?: string } | null;
};
export const saveHiringPrefs: SaveHiringPrefs<HiringPrefsInput, { saved: boolean }> = async (args) => {
  const roleId = requireString(args?.roleId, "roleId");
  const prefs = cleanPrefs(args.prefs);
  const updated = await prisma.role.updateMany({ where: { id: roleId }, data: { hiringPrefs: prefs ? JSON.stringify(prefs) : null } });
  if (updated.count === 0) throw new HttpError(404, `Role ${roleId} not found`);
  return { saved: prefs !== null };
};

type AskDonnaInput = { question: string; founderName: string; scope: string; candidates: string; history?: string };

const clip = (s: string, max: number) => (s.length > max ? s.slice(s.length - max) : s);

/** The founder chat. Returns null when the chat agent isn't configured, so the client falls back to its sandbox answers. */
export const askDonna: AskDonna<AskDonnaInput, { text: string } | null> = async (args) => {
  const question = requireString(args?.question, "question");
  if (elevenlabs.isChatStubbed()) return null;
  const text = await elevenlabs.chat({
    question: question.slice(0, 2_000),
    founderName: optionalString(args.founderName, "founderName") ?? "the founder",
    scope: optionalString(args.scope, "scope") ?? "the open roles",
    candidates: (optionalString(args.candidates, "candidates") ?? "No candidates yet.").slice(0, 40_000),
    history: clip(optionalString(args.history, "history") ?? "", 8_000),
  });
  if (!text) throw new HttpError(502, "ElevenLabs chat returned an empty reply");
  return { text };
};
