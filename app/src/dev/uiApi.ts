// Drop-in replacement for ui-sandbox/src/lib/api.ts, backed by the real Wasp operations.
// Function names match the sandbox; signature changes are listed in dev2/ui-integration.md.

import { config } from "wasp/client";
import {
  attemptWithoutApproval as attemptWithoutApprovalOp,
  createCandidate as createCandidateOp,
  decide as decideOp,
  finalizeScreen as finalizeScreenOp,
  getCandidate,
  getIntegrationStatus,
  listCandidates,
  listRoles,
  proposeBooking as proposeBookingOp,
  startScreen as startScreenOp,
  useQuery,
} from "wasp/client/operations";
import type {
  Approval,
  CandidateStatus,
  EvaluateResult,
  ResearchResult,
  Role,
  StartScreenResult,
  TimelineEvent,
  TranscriptTurn,
} from "../server/contracts";
import type { CandidateView, IntegrationStatus } from "../server/views";

/** The sandbox's UICandidate, plus `role` (replaces the sandbox's getRole(c.roleId)). */
export interface UICandidate {
  id: string;
  roleId: string;
  role: Role;
  name: string;
  email: string;
  githubUser?: string;
  linkedinUrl?: string;
  consentAt: string;
  createdAt: string;
  status: CandidateStatus;
  dossier?: ResearchResult;
  conversationId?: string;
  transcript?: TranscriptTurn[];
  durationSecs?: number; // undefined until finalizeScreen has run
  evaluation?: EvaluateResult;
  approval?: Approval; // the newest approval
  events: TimelineEvent[];
  audioUrl?: string; // absolute: the audio route is served by the Wasp server, not the client
  traceUrl?: string;
}

/** What the stubbed ElevenLabs integration returns from startScreen; finalize it with STUB_CONVERSATION_ID. */
export const STUB_AGENT_ID = "stub-agent";
export const STUB_CONVERSATION_ID = "fixture-conv-001";

export function isStubScreen(s: StartScreenResult): boolean {
  return s.agentId === STUB_AGENT_ID;
}

function toUI(c: CandidateView): UICandidate {
  return {
    id: c.id,
    roleId: c.roleId,
    role: c.role,
    name: c.name,
    email: c.email,
    githubUser: c.githubUser ?? undefined,
    linkedinUrl: c.linkedinUrl ?? undefined,
    consentAt: c.consentAt,
    createdAt: c.createdAt,
    status: c.status,
    dossier: c.dossier ?? undefined,
    conversationId: c.conversationId ?? undefined,
    transcript: c.transcript ?? undefined,
    durationSecs: c.durationSecs ?? undefined,
    evaluation: c.scorecard ?? undefined,
    approval: c.approvals.at(-1),
    events: c.events,
    audioUrl: c.audioUrl ? `${config.apiUrl}${c.audioUrl}` : undefined,
    traceUrl: c.traceUrl ?? undefined,
  };
}

// ---------- hooks (re-render when an action invalidates these queries) ----------

export function useRoles(): Role[] {
  return useQuery(listRoles).data ?? [];
}

export function useCandidates(): UICandidate[] {
  const { data } = useQuery(listCandidates, {});
  return data ? data.map(toUI) : [];
}

export function useCandidate(id: string | undefined): UICandidate | undefined {
  const { data } = useQuery(getCandidate, { id: id ?? "" }, { enabled: !!id });
  return data ? toUI(data) : undefined;
}

/** Which integrations are live (true) or returning fixtures (false); undefined while loading. */
export function useIntegrationStatus(): IntegrationStatus | undefined {
  return useQuery(getIntegrationStatus).data;
}

// ---------- operations ----------

export async function createCandidate(input: {
  roleId: string;
  name: string;
  email: string;
  githubUser?: string;
  linkedinUrl?: string;
  consent: boolean;
}): Promise<UICandidate> {
  return toUI(await createCandidateOp(input));
}

type ResearchStep = "fiber" | "github" | "ploid" | "questions";
const RESEARCH_POLL_MS = 1000;
const RESEARCH_TIMEOUT_MS = 90_000;

/**
 * Research already started on the server inside createCandidate. This waits for it to finish.
 * The server reports no per-step progress: every step shows "run" until the dossier lands,
 * then each source is "ok" or "skip" from dossier.sources.
 */
export async function research(
  id: string,
  onStep: (step: ResearchStep, state: "run" | "ok" | "skip") => void,
): Promise<ResearchResult> {
  const steps: ResearchStep[] = ["fiber", "github", "ploid", "questions"];
  steps.forEach((s) => onStep(s, "run"));
  const deadline = Date.now() + RESEARCH_TIMEOUT_MS;
  for (;;) {
    const c = await getCandidate({ id });
    if (c.status !== "APPLIED" && c.status !== "RESEARCHING") {
      if (!c.dossier) {
        steps.forEach((s) => onStep(s, "skip"));
        const detail = c.events.find((e) => e.kind === "research_done")?.detail ?? "no research_done event";
        throw new Error(`Research for candidate ${id} returned no dossier: ${detail}`);
      }
      const { sources } = c.dossier;
      onStep("fiber", sources.fiber ? "ok" : "skip");
      onStep("github", sources.github ? "ok" : "skip");
      onStep("ploid", sources.ploid ? "ok" : "skip");
      onStep("questions", "ok");
      return c.dossier;
    }
    if (Date.now() > deadline) {
      throw new Error(`Research for candidate ${id} still ${c.status} after ${RESEARCH_TIMEOUT_MS / 1000}s`);
    }
    await new Promise((r) => setTimeout(r, RESEARCH_POLL_MS));
  }
}

export async function startScreen(id: string, fast: boolean): Promise<StartScreenResult> {
  return startScreenOp({ candidateId: id, fast });
}

/** The server reads transcript and duration from ElevenLabs; only conversationId is sent. */
export async function finalizeScreen(id: string, call: { conversationId?: string }): Promise<EvaluateResult> {
  if (!call.conversationId) {
    throw new Error(
      `finalizeScreen(${id}) needs the ElevenLabs conversationId returned by startSession ` +
        `(use STUB_CONVERSATION_ID when isStubScreen(startScreen result) is true)`,
    );
  }
  return finalizeScreenOp({ candidateId: id, conversationId: call.conversationId });
}

export async function proposeBooking(id: string, slotIso?: string): Promise<Approval> {
  return proposeBookingOp({ candidateId: id, slotIso });
}

async function openApprovalId(candidateId: string): Promise<string> {
  const c = await getCandidate({ id: candidateId });
  const open = c.approvals.filter((a) => a.status === "PENDING" || a.status === "DENIED_ATTEMPT").at(-1);
  if (!open) throw new Error(`Candidate ${candidateId} has no PENDING or DENIED_ATTEMPT approval; call proposeBooking first`);
  return open.id;
}

/** Takes the candidate id like the sandbox; acts on that candidate's newest open approval. */
export async function attemptWithoutApproval(candidateId: string): Promise<void> {
  await attemptWithoutApprovalOp({ approvalId: await openApprovalId(candidateId) });
}

/** Takes the candidate id like the sandbox; acts on that candidate's newest open approval. */
export async function decide(candidateId: string, approve: boolean): Promise<void> {
  await decideOp({ approvalId: await openApprovalId(candidateId), approve });
}

export function setDecision(id: string, recommendation: "PASS" | "MAYBE" | "REJECT"): never {
  throw new Error(
    `setDecision(${id}, ${recommendation}): the backend has no operation to override a recommendation`,
  );
}

export function resetDemo(): never {
  throw new Error("resetDemo: the backend has no reset operation; run `wasp db seed` from app/ instead");
}

// ---------- helpers ----------

export function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function panelSpread(e?: EvaluateResult): number {
  if (!e || e.personas.length === 0) return 0;
  const s = e.personas.map((p) => p.score);
  return Math.max(...s) - Math.min(...s);
}

export const PANEL_SPLIT = 3;
