/**
 * Founder hiring preferences, server side. The founder page saves them per role
 * (saveHiringPrefs); startScreen turns them into `founder_focus`, a short line the
 * voice agent uses to pick its follow-ups. Pure functions, no Wasp imports, so
 * scripts/check-focus.ts can test them with tsx.
 *
 * Shape mirrors src/founder/hiringPrefs.ts. Only the fields that should steer a call
 * are kept: level, engineer shape, tech stack, traits and the founder's own words.
 * Weights, must-haves and the bar only re-rank scores, so they stay in the browser.
 */

export type StoredPrefs = {
  seniority: string;
  shape: string;
  stack: string[];
  traits: string[];
  notes: string;
};

/** What the agent gets when the founder set nothing. Never empty: ElevenLabs needs a value. */
export const NO_FOCUS = "None set.";

const MAX_ITEMS = 12;
const MAX_ITEM = 32;
const MAX_NOTES = 300;
const MAX_FOCUS = 600;

// One line of plain text: no braces (prompt variables), no newlines, no control chars.
const clean = (s: unknown, max: number) =>
  typeof s === "string"
    ? s
        .replace(/[{}\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";

const list = (xs: unknown, max = MAX_ITEMS) =>
  Array.isArray(xs)
    ? [...new Set(xs.map((x) => clean(x, MAX_ITEM)).filter(Boolean))].slice(0, max)
    : [];

/** Validates what the browser sent. Returns null when nothing in it would steer a call. */
export function cleanPrefs(raw: unknown): StoredPrefs | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const prefs: StoredPrefs = {
    seniority: clean(r.seniority, 24),
    shape: clean(r.shape, 24),
    stack: list(r.stack),
    traits: list(r.traits, 4),
    notes: clean(r.notes, MAX_NOTES),
  };
  const any =
    (prefs.seniority && prefs.seniority !== "Any") ||
    (prefs.shape && prefs.shape !== "Any") ||
    prefs.stack.length ||
    prefs.traits.length ||
    prefs.notes;
  return any ? prefs : null;
}

/** Parses the Role.hiringPrefs column; bad or missing JSON reads as "nothing set". */
export function parseStored(json: string | null | undefined): StoredPrefs | null {
  if (!json) return null;
  try {
    return cleanPrefs(JSON.parse(json));
  } catch {
    return null;
  }
}

/** The `founder_focus` dynamic variable. */
export function founderFocus(json: string | null | undefined): string {
  const p = parseStored(json);
  if (!p) return NO_FOCUS;
  const parts = [
    p.seniority && p.seniority !== "Any" ? `Level: ${p.seniority}.` : "",
    p.shape && p.shape !== "Any" ? `Engineer shape: ${p.shape}.` : "",
    p.stack.length ? `Tech they want to see: ${p.stack.join(", ")}.` : "",
    p.traits.length ? `Working traits they value: ${p.traits.join(", ")}.` : "",
    p.notes ? `In the founder's words: ${p.notes}` : "",
  ].filter(Boolean);
  return parts.join(" ").slice(0, MAX_FOCUS);
}
