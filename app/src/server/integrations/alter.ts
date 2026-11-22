import type { Approval } from "../contracts";
import { FIXTURE_APPROVAL } from "../fixtures";

// Stub owned by the trust lane (Dev 4): no Alter call happens here yet. Every result says
// "STUB" so the UI never presents it as a real Alter decision. Keep the signatures.

export type BookingProposalInput = {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  founderName: string;
  companyName: string;
  slotIso: string;
};

export type DecisionResult = { alterRef: string | null; inviteSent: boolean; detail: string };

export async function proposeBooking(input: BookingProposalInput): Promise<Pick<Approval, "alterRef" | "emailDraft">> {
  return { alterRef: null, emailDraft: { ...FIXTURE_APPROVAL.emailDraft, to: input.candidateEmail } };
}

export async function attemptWithoutApproval(_approval: Approval): Promise<NonNullable<Approval["deniedAttempt"]>> {
  return {
    at: new Date().toISOString(),
    reason: "STUB: blocked by the in-app gate (Alter is not connected yet)",
    auditRef: null,
  };
}

export async function decide(_approval: Approval, approve: boolean): Promise<DecisionResult> {
  return {
    alterRef: null,
    inviteSent: false,
    detail: approve ? "STUB: approved, no invite sent (Alter is not connected yet)" : "STUB: rejected",
  };
}
