export type {
  Approval,
  CandidateStatus,
  CriterionScore,
  EvaluateResult,
  PersonaScore,
  Recommendation,
  ResearchResult,
  Role,
  StartScreenResult,
  TimelineEvent,
  TranscriptTurn,
} from '../../../contracts/contracts';

import type {
  Approval,
  CandidateStatus,
  EvaluateResult,
  ResearchResult,
  TimelineEvent,
  TranscriptTurn,
} from '../../../contracts/contracts';

/** What the UI holds per candidate. Mirrors the Prisma Candidate row once Wasp lands. */
export interface UICandidate {
  id: string;
  roleId: string;
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
  durationSecs?: number;
  evaluation?: EvaluateResult;
  approval?: Approval;
  events: TimelineEvent[];
  audioUrl?: string;
  traceUrl?: string;
}
