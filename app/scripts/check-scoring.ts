// npm run check:scoring   (from app/, no server needed)
// Checks the scorecard built from a call's ElevenLabs analysis: real numbers only, and every
// quote taken word for word from a candidate turn of the transcript.
import type { TranscriptTurn } from "../src/server/contracts";
import { scoreFromCallAnalysis } from "../src/server/scoring";

const RUBRIC = ["Shipped real systems", "Depth on own project", "Communication"];

const transcript: TranscriptTurn[] = [
  { i: 0, role: "agent", t: 0, text: "Hi Jo, this is Donna, an AI assistant. This call is recorded. How did you test the cache?" },
  { i: 1, role: "user", t: 8, text: "I replayed a day of production traffic against it. The eviction path broke first, because two workers freed the same key." },
  { i: 2, role: "agent", t: 21, text: "Which part did you personally build?" },
  { i: 3, role: "user", t: 25, text: "The eviction logic and the replay harness were mine. I did not touch the dashboard." },
  { i: 4, role: "agent", t: 33, text: "What went wrong with the billing migration?" },
  { i: 5, role: "user", t: 37, text: "Honestly, I don't know. I wasn't on that part." },
];

const numeric = (score: number, rationale: string) => ({ scoring_mode: "numeric_uniform", score, max_score: 10, rationale, result: "success" });
const value = (v: string | null) => ({ value: v });

const analysis = {
  evaluation_criteria_results: {
    shipped_real_systems: numeric(8, "Described a real replay test and what failed."),
    depth_on_own_project: numeric(7, "Named exactly which parts were theirs."),
    communication: numeric(5, "Clear, but could not answer the billing question."),
    no_protected_topics: { scoring_mode: "binary", score: null, max_score: 100, rationale: "No protected topic.", result: "success" },
  },
  data_collection_results: {
    // Different case and punctuation from the transcript, as the analysis often returns it.
    evidence_shipped_real_systems: value("the eviction path broke first because two workers freed the same key"),
    evidence_depth_on_own_project: value("The eviction logic and the replay harness were mine."),
    evidence_communication: value("Honestly, I don't know. I wasn't on that part."),
    standout_quote: value("I replayed a day of production traffic against it."),
    red_flags: value("Could not explain the billing migration listed on the resume."),
    feedback_strength_1: value("You explained exactly what broke in your cache and why."),
    feedback_strength_2: value("You were precise about which parts you built."),
    feedback_sharpen: value("Only list work you can talk through in detail."),
  },
};

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `: ${detail}`}`);
  if (!ok) failed++;
}

const scored = scoreFromCallAnalysis(analysis, transcript, RUBRIC);
if (!("scorecard" in scored)) {
  check("numeric analysis gives a scorecard", false, scored.unusable);
} else {
  const card = scored.scorecard;
  check("three criteria, named after the rubric", card.criteria.map((c) => c.name).join("|") === RUBRIC.join("|"), JSON.stringify(card.criteria.map((c) => c.name)));
  check("scores are the analysis's own numbers", card.criteria.map((c) => c.score).join(",") === "8,7,5");
  check("overall is their mean; 6.7 is a MAYBE", card.overall === 6.7 && card.recommendation === "MAYBE", `${card.overall} ${card.recommendation}`);
  for (const criterion of card.criteria) {
    const turn = transcript.find((t) => t.i === criterion.evidenceTurn);
    check(`"${criterion.name}" quote is word for word in a candidate turn`, turn?.role === "user" && turn.text.includes(criterion.quote), JSON.stringify(criterion));
  }
  check("a quote with different punctuation resolves to the transcript's sentence", card.criteria[0].evidenceTurn === 1 && card.criteria[0].quote.startsWith("The eviction path broke first"), card.criteria[0].quote);
  check("a quote spanning two sentences resolves to the whole turn", card.criteria[2].quote === transcript[5].text, card.criteria[2].quote);
  check("no personas are invented", card.personas.length === 0);
  check("feedback and red flag come from the analysis", card.feedback.sharpen.startsWith("Only list") && card.redFlags.length === 1);
  check("standout quote is word for word", transcript[1].text.includes(card.standoutQuote) && card.standoutQuote.length > 0, card.standoutQuote);
}

const roleSpecific = scoreFromCallAnalysis(analysis, transcript, ["Owns features end to end, front end and back end", "System design (APIs, cloud, storage)", "Depth on own project", "Communication"]);
check(
  "a role-specific rubric gets only the items the analysis judged",
  "scorecard" in roleSpecific && roleSpecific.scorecard.criteria.map((c) => c.name).join("|") === "Owns features end to end, front end and back end|Depth on own project|Communication",
  JSON.stringify(roleSpecific),
);

const binaryOnly = {
  ...analysis,
  evaluation_criteria_results: Object.fromEntries(
    Object.entries(analysis.evaluation_criteria_results).map(([id, c]) => [id, { ...c, scoring_mode: "binary", score: null }]),
  ),
};
check("pass/fail-only analysis is refused, not turned into numbers", "unusable" in scoreFromCallAnalysis(binaryOnly, transcript, RUBRIC));

const invented = { ...analysis, data_collection_results: { ...analysis.data_collection_results, evidence_shipped_real_systems: value("I designed the whole payments platform from scratch.") } };
const withoutInvented = scoreFromCallAnalysis(invented, transcript, RUBRIC);
check(
  "a quote the candidate never said drops that criterion",
  "scorecard" in withoutInvented && withoutInvented.scorecard.criteria.length === 2 && !withoutInvented.scorecard.criteria.some((c) => c.name === RUBRIC[0]),
  JSON.stringify(withoutInvented),
);
check("no analysis at all is refused", "unusable" in scoreFromCallAnalysis(null, transcript, RUBRIC));

console.log(failed === 0 ? "ALL PASS" : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
