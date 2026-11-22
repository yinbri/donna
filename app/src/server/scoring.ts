import type { CriterionScore, EvaluateResult, Recommendation, TranscriptTurn } from "./contracts";

// Two ways to score a real call while the Donna box is not live:
// - scoreFromScorer: the ElevenLabs scorer agent grades the transcript against agent/scoring-guidelines.md.
// - scoreFromCallAnalysis: ElevenLabs' own post-call analysis, the fallback when the scorer is not set up.
//
// Builds a scorecard from ElevenLabs' own post-call analysis of a real call. Used while the Donna
// box (the 3-persona panel) is not live, so a real person is never shown the fixture panel's scores.
// Nothing here is invented: each score is the analysis's own 0-10 number, and each quote must be
// found in a candidate turn of the stored transcript. A criterion that fails either test is left out.

export type ScoreSource = "llm_scorer" | "call_analysis" | "panel" | "fixture";
export type CallScore = { scorecard: EvaluateResult } | { unusable: string };

const PASS_AT = 7;
const MAYBE_AT = 4.5;
const MIN_QUOTE_OVERLAP = 0.6;

// Ids of the numeric criteria configured on the Donna agent, in rubric order. Each has a matching
// `evidence_<id>` data field holding the candidate sentence the score rests on.
const ANALYSIS_CRITERIA = ["shipped_real_systems", "depth_on_own_project", "communication"] as const;

type AnalysisCriterion = { rationale?: unknown; score?: unknown; max_score?: unknown; scoring_mode?: unknown };
type CallAnalysis = {
  evaluation_criteria_results?: Record<string, AnalysisCriterion>;
  data_collection_results?: Record<string, { value?: unknown }>;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const toId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9']+/g, " ").trim().split(" ").filter(Boolean);

function textValue(data: CallAnalysis["data_collection_results"], id: string): string {
  const value = data?.[id]?.value;
  return typeof value === "string" ? value.trim() : "";
}

/** The analysis's score on our 0-10 scale, or null when it gave no numeric score. */
function scoreOutOfTen(criterion: AnalysisCriterion | undefined): number | null {
  if (!criterion || criterion.scoring_mode !== "numeric_uniform") return null;
  const { score, max_score: max } = criterion;
  if (typeof score !== "number" || typeof max !== "number" || max <= 0) return null;
  return round1((Math.min(Math.max(score, 0), max) / max) * 10);
}

function rubricName(id: string, rubric: string[], taken: Set<string>): string | null {
  const exact = rubric.find((item) => toId(item) === id);
  if (exact) return exact;
  // Role-specific rubrics word "shipped real systems" their own way ("Owns features end to end").
  // It is their first item that is neither of the other two criteria.
  if (id !== "shipped_real_systems") return null;
  return rubric.find((item) => !taken.has(item) && !ANALYSIS_CRITERIA.some((other) => toId(item) === other)) ?? null;
}

/**
 * Finds where the candidate said `quote`. The analysis sometimes changes punctuation or trims a
 * sentence, so this matches on words and returns the transcript's own wording: the shortest
 * sentence (or whole turn, for a quote spanning sentences) that holds most of the quote's words.
 */
function locate(quote: string, transcript: TranscriptTurn[]): { turn: number; quote: string } | null {
  const wanted = words(quote);
  if (wanted.length < 2) return null;

  let best: { turn: number; quote: string; overlap: number; length: number } | null = null;
  for (const turn of transcript) {
    if (turn.role !== "user") continue;
    const whole = turn.text.trim();
    for (const slice of new Set([...(whole.match(/[^.!?]+[.!?]*/g) ?? []).map((s) => s.trim()), whole])) {
      if (!slice) continue;
      const have = new Set(words(slice));
      const overlap = wanted.filter((word) => have.has(word)).length / wanted.length;
      if (!best || overlap > best.overlap || (overlap === best.overlap && have.size < best.length)) {
        best = { turn: turn.i, quote: slice, overlap, length: have.size };
      }
    }
  }
  return best && best.overlap >= MIN_QUOTE_OVERLAP ? { turn: best.turn, quote: best.quote } : null;
}

export function scoreFromCallAnalysis(analysis: unknown, transcript: TranscriptTurn[], rubric: string[]): CallScore {
  if (!analysis || typeof analysis !== "object") return { unusable: "the call has no analysis" };
  const { evaluation_criteria_results: results, data_collection_results: data } = analysis as CallAnalysis;
  if (!results) return { unusable: "the analysis has no criteria results" };

  const criteria: CriterionScore[] = [];
  const rationales: { score: number; text: string }[] = [];
  const skipped: string[] = [];
  const taken = new Set<string>();
  for (const id of ANALYSIS_CRITERIA) {
    const name = rubricName(id, rubric, taken);
    const score = scoreOutOfTen(results[id]);
    const evidence = locate(textValue(data, `evidence_${id}`), transcript);
    if (!name || score === null || !evidence) {
      const why = !name ? "no matching rubric item" : score === null ? "no numeric score" : "evidence quote not in the transcript";
      skipped.push(`${id}: ${why}`);
      continue;
    }
    taken.add(name);
    criteria.push({ name, score, evidenceTurn: evidence.turn, quote: evidence.quote });
    const rationale = results[id]?.rationale;
    if (typeof rationale === "string" && rationale.trim()) rationales.push({ score, text: rationale.trim() });
  }
  if (criteria.length === 0) return { unusable: skipped.join("; ") };

  const overall = round1(criteria.reduce((sum, criterion) => sum + criterion.score, 0) / criteria.length);
  const recommendation: Recommendation = overall >= PASS_AT ? "PASS" : overall >= MAYBE_AT ? "MAYBE" : "REJECT";
  const byScore = [...rationales].sort((a, b) => b.score - a.score);
  const redFlags = textValue(data, "red_flags");

  return {
    scorecard: {
      recommendation,
      overall,
      // The persona panel belongs to the Donna box; one analysis is not three personas.
      personas: [],
      criteria,
      redFlags: redFlags && !/^(none|n\/a|no red flags?)\.?$/i.test(redFlags) ? [redFlags] : [],
      standoutQuote: locate(textValue(data, "standout_quote"), transcript)?.quote ?? "",
      feedback: {
        strengths: [
          textValue(data, "feedback_strength_1") || byScore[0]?.text || "",
          textValue(data, "feedback_strength_2") || byScore[1]?.text || "",
        ],
        sharpen: textValue(data, "feedback_sharpen") || byScore.at(-1)?.text || "",
      },
    },
  };
}

// ---------- ElevenLabs scorer agent (agent/scoring-guidelines.md) ----------

// A criterion at or below this caps the recommendation at MAYBE: one missing pillar is not a PASS.
const FLOOR_FOR_PASS = 2;
const PERSONAS = ["Principal Engineer", "YC Founder", "BS Detector"] as const;

type ScorerReply = {
  criteria?: { name?: unknown; score?: unknown; evidenceTurn?: unknown; quote?: unknown; rationale?: unknown }[];
  personas?: { name?: unknown; score?: unknown; rationale?: unknown }[];
  redFlags?: unknown;
  standoutQuote?: unknown;
  feedback?: { strengths?: unknown; sharpen?: unknown };
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const clampScore = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(Math.max(v, 0), 10)) : null);

/** The JSON object in the scorer's reply, tolerating code fences or a stray sentence around it. */
function parseReply(raw: string): ScorerReply | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as ScorerReply;
  } catch {
    return null;
  }
}

/**
 * Turns the scorer agent's reply into a scorecard. The model scores; this code checks: each rubric
 * criterion needs a 0-10 score and a quote found in a candidate turn (the transcript's own wording is
 * kept), personas must be the three named reviewers, and the overall score and recommendation are
 * computed here from the criteria, never taken from the model.
 */
export function scoreFromScorer(raw: string, transcript: TranscriptTurn[], rubric: string[]): CallScore {
  const reply = parseReply(raw);
  if (!reply) return { unusable: "the scorer's reply was not JSON" };

  const given = Array.isArray(reply.criteria) ? reply.criteria : [];
  const criteria: CriterionScore[] = [];
  const skipped: string[] = [];
  for (const name of rubric) {
    const item = given.find((c) => toId(str(c?.name)) === toId(name));
    const score = clampScore(item?.score);
    const evidence = item ? locate(str(item.quote), transcript) : null;
    if (!item || score === null || !evidence) {
      skipped.push(`${name}: ${!item ? "not scored" : score === null ? "no numeric score" : "evidence quote not in the transcript"}`);
      continue;
    }
    criteria.push({ name, score, evidenceTurn: evidence.turn, quote: evidence.quote });
  }
  if (criteria.length === 0) return { unusable: skipped.join("; ") || "the scorer returned no criteria" };
  if (skipped.length) console.warn(`Scorer criteria left out: ${skipped.join("; ")}`);

  const personas = PERSONAS.flatMap((name) => {
    const p = (Array.isArray(reply.personas) ? reply.personas : []).find((x) => str(x?.name) === name);
    const score = clampScore(p?.score);
    return p && score !== null && str(p.rationale) ? [{ name, score, rationale: str(p.rationale) }] : [];
  });

  const overall = round1(criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length);
  let recommendation: Recommendation = overall >= PASS_AT ? "PASS" : overall >= MAYBE_AT ? "MAYBE" : "REJECT";
  if (recommendation === "PASS" && criteria.some((c) => c.score <= FLOOR_FOR_PASS)) recommendation = "MAYBE";

  const strengths = Array.isArray(reply.feedback?.strengths) ? reply.feedback!.strengths.map(str) : [];
  return {
    scorecard: {
      recommendation,
      overall,
      personas,
      criteria,
      redFlags: Array.isArray(reply.redFlags) ? reply.redFlags.map(str).filter(Boolean) : [],
      standoutQuote: locate(str(reply.standoutQuote), transcript)?.quote ?? "",
      feedback: { strengths: [strengths[0] ?? "", strengths[1] ?? ""], sharpen: str(reply.feedback?.sharpen) },
    },
  };
}
