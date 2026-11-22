import type {
  Approval,
  CandidateStatus,
  EvaluateResult,
  ResearchResult,
  Role,
  TimelineEvent,
  TranscriptTurn,
} from "./contracts";

// Wasp operation payloads must be SuperJSON values, and interfaces (as in contracts.ts) have no
// index signature. Plain<T> rewrites an interface as an equivalent object type that does.
export type Plain<T> = T extends Date ? T : T extends object ? { [K in keyof T]: Plain<T[K]> } : T;

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type RoleView = Plain<Role>;

/** true = live, false = returning fixture data. */
export type IntegrationStatus = { elevenlabs: boolean; box: boolean; alter: boolean; traceroot: boolean };

export type CandidateView = Plain<{
  id: string;
  roleId: string;
  name: string;
  email: string;
  githubUser: string | null;
  linkedinUrl: string | null;
  consentAt: string; // ISO
  createdAt: string; // ISO
  status: CandidateStatus;
  conversationId: string | null;
  audioPath: string | null;
  audioUrl: string | null; // GET /api/audio/:candidateId, set only when audio is stored
  traceUrl: string | null;
  dossier: ResearchResult | null;
  transcript: TranscriptTurn[] | null;
  durationSecs: number | null; // call length from ElevenLabs, set by finalizeScreen
  scorecard: EvaluateResult | null;
  role: RoleView;
  approvals: Approval[]; // oldest first
  events: TimelineEvent[]; // oldest first
}> & { analysis: JsonValue }; // analysis: raw ElevenLabs analysis
