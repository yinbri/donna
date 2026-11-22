import { decide, finalizeScreen, getCandidate } from "wasp/client/operations";
import type { EvaluateResult } from "../server/contracts";
import type { ApprovalView } from "../server/views";

// Wasp's HTTP client abandons a request after 10 s, but two operations legitimately run longer
// and keep running on the server: scoring a real call, and a live approval that waits for the
// founder in Alter. On a timeout these helpers wait for the server's result instead of failing.

const POLL_MS = 2_000;
const MAX_WAIT_MS = 180_000;
const FAILURE_PREFIX = "Failed: ";

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.message.startsWith("Request timed out"));
}

function isInterruptedFinalize(err: unknown): boolean {
  return isTimeout(err) || (
    err instanceof Error && "statusCode" in err && (err.statusCode === 502 || err.statusCode === 504)
  );
}

const pause = () => new Promise((resolve) => setTimeout(resolve, POLL_MS));

export async function finalizeAndWait(candidateId: string, conversationId: string): Promise<EvaluateResult | null> {
  try {
    return await finalizeScreen({ candidateId, conversationId });
  } catch (err) {
    if (!isInterruptedFinalize(err)) throw err;
  }

  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await pause();
    const candidate = await getCandidate({ id: candidateId });
    if (candidate.status === "EVALUATING") continue;
    if (candidate.conversationId === conversationId && candidate.status !== "CALLING") {
      if (candidate.scorecard) return candidate.scorecard;
      if (candidate.status === "AWAITING_APPROVAL" && candidate.transcript !== null) return null;
    }
    // The server puts a failed screen back to CALLING and records why on the timeline.
    const failure = [...candidate.events].reverse().find((event) => event.detail.startsWith(FAILURE_PREFIX));
    throw new Error(failure ? failure.detail : `Scoring stopped with candidate ${candidateId} in ${candidate.status}`);
  }
  throw new Error(`Scoring candidate ${candidateId} did not finish within ${MAX_WAIT_MS / 1000}s`);
}

export async function decideAndWait(candidateId: string, approvalId: string, approve: boolean): Promise<ApprovalView> {
  try {
    return await decide({ approvalId, approve });
  } catch (err) {
    if (!isTimeout(err)) throw err;
  }

  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await pause();
    const candidate = await getCandidate({ id: candidateId });
    const approval = candidate.approvals.find((a) => a.id === approvalId);
    if (!approval) throw new Error(`Approval ${approvalId} is no longer on candidate ${candidateId}`);
    if (approval.status === "APPROVED" || approval.status === "REJECTED") return approval;
  }
  throw new Error(
    `No decision was recorded for approval ${approvalId} within ${MAX_WAIT_MS / 1000}s; it is still open and can be decided again`,
  );
}
