import { finalizeScreen, getCandidate } from "wasp/client/operations";
import type { EvaluateResult } from "../server/contracts";

const POLL_MS = 2_000;
const MAX_WAIT_MS = 180_000;
const FAILURE_PREFIX = "Failed: ";

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.message.startsWith("Request timed out"));
}

/**
 * Wasp's HTTP client abandons a request after 10 s, but scoring a real call takes longer
 * (ElevenLabs post-processing, then the panel) and the server keeps going. On a timeout this
 * waits for the server's result instead of reporting a failure.
 */
export async function finalizeAndWait(candidateId: string, conversationId: string): Promise<EvaluateResult> {
  try {
    return await finalizeScreen({ candidateId, conversationId });
  } catch (err) {
    if (!isTimeout(err)) throw err;
  }

  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const candidate = await getCandidate({ id: candidateId });
    if (candidate.status === "EVALUATING") continue;
    if (candidate.scorecard && candidate.conversationId === conversationId) return candidate.scorecard;
    // The server puts a failed screen back to CALLING and records why on the timeline.
    const failure = [...candidate.events].reverse().find((event) => event.detail.startsWith(FAILURE_PREFIX));
    throw new Error(failure ? failure.detail : `Scoring stopped with candidate ${candidateId} in ${candidate.status}`);
  }
  throw new Error(`Scoring candidate ${candidateId} did not finish within ${MAX_WAIT_MS / 1000}s`);
}
