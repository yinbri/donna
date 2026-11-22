import { HttpError, prisma } from "wasp/server";
import type {
  AttemptWithoutApproval,
  CreateCandidate,
  Decide,
  FinalizeScreen,
  GetCandidate,
  ListCandidates,
  ListRoles,
  ProposeBooking,
  StartScreen,
} from "wasp/server/operations";
import type { Approval, EvaluateResult, ResearchResult, StartScreenResult, TranscriptTurn } from "./contracts";
import * as alter from "./integrations/alter";
import * as box from "./integrations/box";
import * as elevenlabs from "./integrations/elevenlabs";
import { traced, traceUrlFor } from "./integrations/traceroot";
import {
  candidateInclude,
  defaultSlotIso,
  logEvent,
  parseJson,
  setStatus,
  toApproval,
  toCandidateView,
  toRoleView,
} from "./pipeline";
import type { CandidateView, Plain, RoleView } from "./views";

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

async function runResearch(candidateId: string, request: Parameters<typeof box.research>[0]): Promise<void> {
  try {
    const dossier = await traced("research", { candidateId }, () => box.research(request));
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

export const finalizeScreen: FinalizeScreen<{ candidateId: string; conversationId: string }, Plain<EvaluateResult>> = async (
  args,
) => {
  const candidateId = requireString(args?.candidateId, "candidateId");
  const conversationId = requireString(args.conversationId, "conversationId");
  const candidate = await loadCandidate(candidateId);
  const role = toRoleView(candidate.role);
  const dossier = parseJson<ResearchResult>(candidate.dossier, "dossier", candidateId) ?? emptyDossier(role.questions);

  await prisma.candidate.update({ where: { id: candidateId }, data: { status: "EVALUATING", conversationId } });

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
      analysis: JSON.stringify(conversation.analysis ?? null),
      audioPath,
    },
  });
  await logEvent(candidateId, "call_ended", `${transcript.length} turns, ${conversation.durationSecs}s${audioNote}`);

  const scorecard = await traced("evaluate", { candidateId }, () =>
    box.evaluate({ dossier, rubric: role.rubric, transcript }),
  );
  const status = scorecard.recommendation === "REJECT" ? "REJECTED" : "AWAITING_APPROVAL";
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { scorecard: JSON.stringify(scorecard), status, traceUrl: traceUrlFor(candidateId) },
  });
  await logEvent(candidateId, "evaluated", `${scorecard.recommendation}, overall ${scorecard.overall}`);
  return scorecard;
};

export const proposeBooking: ProposeBooking<{ candidateId: string; slotIso?: string }, Plain<Approval>> = async (args) => {
  const candidateId = requireString(args?.candidateId, "candidateId");
  const requestedSlot = optionalString(args.slotIso, "slotIso");
  if (requestedSlot && Number.isNaN(Date.parse(requestedSlot))) {
    throw new HttpError(400, `slotIso is not an ISO date: ${JSON.stringify(requestedSlot)}`);
  }
  const slotIso = requestedSlot ?? defaultSlotIso();
  const candidate = await loadCandidate(candidateId);

  const proposal = await alter.proposeBooking({
    candidateId,
    candidateName: candidate.name,
    candidateEmail: candidate.email,
    founderName: candidate.role.founderName,
    companyName: candidate.role.companyName,
    slotIso,
  });
  const row = await prisma.approval.create({
    data: {
      candidateId,
      slotIso,
      status: "PENDING",
      alterRef: proposal.alterRef,
      emailDraft: JSON.stringify(proposal.emailDraft),
    },
  });
  await logEvent(candidateId, "booking_proposed", `Slot ${slotIso}, approval ${row.id}`);
  return toApproval(row);
};

export const attemptWithoutApproval: AttemptWithoutApproval<{ approvalId: string }, Plain<Approval>> = async (args) => {
  const approvalId = requireString(args?.approvalId, "approvalId");
  const row = await loadApproval(approvalId);
  requireOpenApproval(row);
  const denied = await alter.attemptWithoutApproval(toApproval(row));
  const updated = await prisma.approval.update({
    where: { id: approvalId },
    data: { deniedAttempt: JSON.stringify(denied), status: "DENIED_ATTEMPT" },
  });
  await logEvent(row.candidateId, "denied_attempt", denied.reason);
  return toApproval(updated);
};

export const decide: Decide<{ approvalId: string; approve: boolean }, Plain<Approval>> = async (args) => {
  const approvalId = requireString(args?.approvalId, "approvalId");
  if (typeof args.approve !== "boolean") {
    throw new HttpError(400, `approve must be a boolean, got ${JSON.stringify(args.approve)}`);
  }
  const row = await loadApproval(approvalId);
  requireOpenApproval(row);

  const result = await alter.decide(toApproval(row), args.approve);
  const updated = await prisma.approval.update({
    where: { id: approvalId },
    data: { status: args.approve ? "APPROVED" : "REJECTED", alterRef: result.alterRef ?? row.alterRef },
  });
  await setStatus(row.candidateId, args.approve ? "BOOKED" : "REJECTED");
  await logEvent(row.candidateId, args.approve ? "approved" : "rejected", result.detail);
  if (args.approve && result.inviteSent) {
    await logEvent(row.candidateId, "invite_sent", `Invite for ${row.slotIso}`);
  }
  return toApproval(updated);
};
