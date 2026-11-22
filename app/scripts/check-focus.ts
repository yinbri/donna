// npm run check:focus   (from app/, no server needed)
// Checks the founder_focus line the voice agent gets from a role's saved hiring preferences:
// empty prefs read as "None set.", junk is dropped, and nothing can open a prompt variable.
import { cleanPrefs, founderFocus, NO_FOCUS, parseStored } from "../src/server/hiringFocus";

let failed = 0;
const check = (name: string, ok: boolean, got?: unknown) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `\n     got: ${JSON.stringify(got)}`}`);
  if (!ok) failed++;
};

// Nothing set, or only ranking settings, means no focus.
check("null column", founderFocus(null) === NO_FOCUS, founderFocus(null));
check("bad JSON", founderFocus("{not json") === NO_FOCUS, founderFocus("{not json"));
check("defaults only", cleanPrefs({ seniority: "Any", shape: "Any", stack: [], traits: [], notes: "  " }) === null);
check("weights alone don't steer a call", cleanPrefs({ weights: { Communication: 3 }, bar: 8 }) === null);

// The full shape from the founder page.
const full = JSON.stringify(
  cleanPrefs({
    seniority: "Senior",
    shape: "Infra / backend",
    pace: "Ship fast",
    stack: ["Postgres", "Redis", "Postgres", ""],
    traits: ["High ownership", "Low ego"],
    notes: "Has been on call for something real users depend on.",
    weights: { Communication: 2 },
  }),
);
const focus = founderFocus(full);
check("level", focus.includes("Level: Senior."), focus);
check("shape", focus.includes("Engineer shape: Infra / backend."), focus);
check("stack, deduped", focus.includes("Tech they want to see: Postgres, Redis."), focus);
check("traits", focus.includes("Working traits they value: High ownership, Low ego."), focus);
check("notes", focus.includes("In the founder's words: Has been on call"), focus);
check("ranking-only fields left out", !/weight|bar|Ship fast/i.test(focus), focus);

// Hostile or oversized input stays one short line with no prompt variables.
const nasty = founderFocus(
  JSON.stringify(
    cleanPrefs({
      stack: Array.from({ length: 40 }, (_, i) => `Tool${i} {{candidate_name}}`),
      traits: ["a", "b", "c", "d", "e", "f"],
      notes: "line one\nline two {{tailored_questions}} " + "x".repeat(2000),
    }),
  ),
);
check("no braces", !/[{}]/.test(nasty), nasty);
check("no newlines", !/\n/.test(nasty), nasty);
check("capped at 600 chars", nasty.length <= 600, nasty.length);
const stored = parseStored(JSON.stringify(cleanPrefs({ stack: Array.from({ length: 40 }, (_, i) => `T${i}`), traits: ["a", "b", "c", "d", "e"] })));
check("at most 12 stack items", stored?.stack.length === 12, stored?.stack.length);
check("at most 4 traits", stored?.traits.length === 4, stored?.traits.length);
check("non-object input", cleanPrefs("Postgres") === null && cleanPrefs(42) === null);

console.log(failed ? `\n${failed} check(s) failed` : "\nAll focus checks passed");
process.exit(failed ? 1 : 0);
