// Frozen shared types for every lane. Only the Wasp backbone owner edits this file,
// and only with a BUILDLOG.md note and a heads-up to the team. Copy into app/src/server/contracts.ts.

export type CandidateStatus =
  | "APPLIED"
  | "RESEARCHING"
  | "READY"
  | "CALLING"
  | "EVALUATING"
  | "AWAITING_APPROVAL"
  | "BOOKED"
  | "REJECTED";

export type Recommendation = "PASS" | "MAYBE" | "REJECT";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "DENIED_ATTEMPT";

export interface Role {
  id: string;
  title: string;
  companyName: string;
  founderName: string;
  rubric: string[]; // criteria names, e.g. ["Shipped real systems", "Depth on own project", "Communication"]
  questions: string[]; // role-level fallback questions
  sourceUrl: string | null; // YC job posting link
  isOfficialPosting: boolean;
}

// ---------- Box: POST /research ----------
export interface ResearchRequest {
  name: string;
  email: string;
  githubUser?: string;
  linkedinUrl?: string;
  role: Pick<Role, "title" | "companyName" | "rubric">;
}

export interface ResearchResult {
  summary: string;
  topProject: string; // what Donna opens with
  highlights: string[];
  claimsToVerify: string[];
  tailoredQuestions: [string, string, string]; // one must be about topProject
  sources: { fiber: boolean; ploid: boolean; github: boolean };
}

// ---------- Transcript (from ElevenLabs, normalized) ----------
export interface TranscriptTurn {
  i: number; // turn number, 0-based, stable
  role: "agent" | "user";
  text: string;
  t: number; // seconds from call start; the receipts player seeks here
}

// ---------- Box: POST /evaluate ----------
export interface EvaluateRequest {
  dossier: ResearchResult;
  rubric: string[];
  transcript: TranscriptTurn[];
}

export interface PersonaScore {
  name: "Principal Engineer" | "YC Founder" | "BS Detector";
  score: number; // 0-10
  rationale: string;
}

export interface CriterionScore {
  name: string; // one of Role.rubric
  score: number; // 0-10
  evidenceTurn: number; // TranscriptTurn.i of the candidate turn that earned it
  quote: string; // verbatim from that turn
}

export interface EvaluateResult {
  recommendation: Recommendation;
  overall: number; // 0-10
  personas: PersonaScore[];
  criteria: CriterionScore[];
  redFlags: string[];
  standoutQuote: string;
  feedback: { strengths: [string, string]; sharpen: string }; // shown to the candidate, no number
}

// ---------- Wasp operations ----------
export interface StartScreenResult {
  token: string; // signed URL or conversation token for @elevenlabs/react
  agentId: string;
  dynamicVariables: {
    candidate_name: string;
    founder_name: string;
    company_name: string;
    role_title: string;
    top_project: string;
    tailored_questions: string; // newline-joined
    founder_focus: string; // founder's hiring preferences in one line, "None set." when empty
    demo_fast_mode: boolean;
  };
}

export interface Approval {
  id: string;
  candidateId: string;
  slotIso: string;
  status: ApprovalStatus;
  alterRef: string | null;
  emailDraft: { to: string; subject: string; body: string };
  deniedAttempt: { at: string; reason: string; auditRef: string | null } | null;
}

export interface TimelineEvent {
  id: string;
  candidateId: string;
  at: string; // ISO
  kind:
    | "applied"
    | "research_done"
    | "call_started"
    | "call_ended"
    | "evaluated"
    | "booking_proposed"
    | "denied_attempt"
    | "approved"
    | "rejected"
    | "invite_sent";
  detail: string;
}

// Operation signatures (implemented in the Wasp server):
// startScreen(candidateId: string, fast: boolean): Promise<StartScreenResult>
// finalizeScreen(candidateId: string, conversationId: string): Promise<EvaluateResult>
// proposeBooking(candidateId: string, slotIso?: string): Promise<Approval>          // status PENDING
// attemptWithoutApproval(approvalId: string): Promise<Approval>                    // records Alter's real denial
// decide(approvalId: string, approve: boolean): Promise<Approval>                  // APPROVED -> invite sent
