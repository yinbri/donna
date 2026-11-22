import type {
  Approval,
  CandidateStatus,
  EvaluateResult,
  ResearchResult,
  Role,
  TimelineEvent,
  TranscriptTurn,
} from "./contracts";
import type { ScoreSource } from "./scoring";

// Wasp operation payloads must be SuperJSON values, and interfaces (as in contracts.ts) have no
// index signature. Plain<T> rewrites an interface as an equivalent object type that does.
export type Plain<T> = T extends Date ? T : T extends object ? { [K in keyof T]: Plain<T[K]> } : T;

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type RoleView = Plain<Role>;

/** The contract Approval plus the gate's links, present only when the gate returned them. */
export type ApprovalView = Plain<Approval> & {
  approvalUrl?: string; // live Alter: where the founder approves
  calendarUrl?: string; // live: the booked Google event; stub: a prefilled Calendar link (nothing sent)
};

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
  scorecard: (EvaluateResult & { source?: ScoreSource }) | null; // source: where the scores came from
  role: RoleView;
  events: TimelineEvent[]; // oldest first
}> & { approvals: ApprovalView[]; analysis: JsonValue }; // approvals oldest first; analysis: raw ElevenLabs analysis
