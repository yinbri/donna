import type {
  EvaluateRequest,
  EvaluateResult,
  ResearchRequest,
  ResearchResult,
} from "../contracts";
import { FIXTURE_CONVERSATION, FIXTURE_DOSSIER, FIXTURE_PANEL } from "../fixtures";

export function isStubbed(): boolean {
  return !process.env.BOX_URL?.trim() || !process.env.BOX_SECRET;
}

async function post<T>(baseUrl: string, endpoint: string, body: unknown): Promise<T> {
  const secret = process.env.BOX_SECRET;
  if (!secret) throw new Error("BOX_SECRET is required when BOX_URL is set");
  const url = new URL(endpoint, baseUrl.replace(/\/+$/, "") + "/");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Box-Secret": secret },
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Donna box ${endpoint} returned HTTP ${response.status}`);
  return (await response.json()) as T;
}

/** Call only after a candidate's consent has been recorded. */
export async function research(request: ResearchRequest): Promise<ResearchResult> {
  const url = process.env.BOX_URL?.trim();
  return url ? post(url, "research", request) : FIXTURE_DOSSIER;
}

export async function evaluate(request: EvaluateRequest): Promise<EvaluateResult> {
  const url = process.env.BOX_URL?.trim();
  if (url) return post(url, "evaluate", request);

  const panel = FIXTURE_PANEL;
  const demo = FIXTURE_CONVERSATION;
  const matchesRubric = request.rubric.length === panel.criteria.length &&
    panel.criteria.every((item, i) => item.name === request.rubric[i]);
  const matchesCall = request.transcript.length === demo.transcript.length &&
    demo.transcript.every((turn, i) => {
      const candidate = request.transcript[i];
      return turn.i === candidate.i && turn.role === candidate.role &&
        turn.t === candidate.t && turn.text === candidate.text;
    });
  if (!matchesRubric || !matchesCall) {
    throw new Error("Live evaluation is required for this transcript");
  }

  const turns = new Map(demo.transcript.filter(turn => turn.role === "user")
    .map(turn => [turn.i, turn.text]));
  const criteria = panel.criteria.map(criterion => {
    const quote = turns.get(criterion.evidenceTurn);
    if (!quote) throw new Error("The Donna box fixture cites a missing candidate turn");
    return { ...criterion, quote };
  });
  return { ...panel, criteria };
}
