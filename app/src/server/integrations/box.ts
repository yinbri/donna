import type { EvaluateRequest, EvaluateResult, ResearchRequest, ResearchResult } from "../contracts";
import { FIXTURE_DOSSIER, FIXTURE_PANEL } from "../fixtures";

// Stub owned by the Donna box lane (Dev 3): returns fixtures until the real box call
// (BOX_URL, BOX_SECRET) replaces these bodies. Keep the signatures.

export async function research(_request: ResearchRequest): Promise<ResearchResult> {
  return FIXTURE_DOSSIER;
}

export async function evaluate(_request: EvaluateRequest): Promise<EvaluateResult> {
  return FIXTURE_PANEL;
}
