import { useCallback, useEffect, useState } from 'react';
import type { EvaluateResult, Role } from '../server/contracts';
import type { UICandidate } from '../dev/uiApi';

/**
 * The founder's own take on what "good" looks like for one role. Kept in this browser,
 * per role. Weights, must-haves and the bar re-rank the scores the panel already gave;
 * nothing here changes a score or what Donna asks on a call. The profile and notes are
 * handed to Ask Donna so her answers lean the founder's way.
 */

export const SENIORITY = ['Any', 'Early career', 'Mid-level', 'Senior', 'Staff+'] as const;
export const SHAPE = ['Any', 'Generalist', 'Product-minded', 'Infra / backend', 'AI / ML'] as const;
export const PACE = ['Ship fast', 'Balanced', 'Rigor first'] as const;

export const WEIGHTS = [
  { label: 'Ignore', value: 0 },
  { label: 'Low', value: 0.5 },
  { label: 'Normal', value: 1 },
  { label: 'High', value: 2 },
  { label: 'Top', value: 3 },
] as const;

/** A must-have criterion needs at least this score, out of 10. */
export const MUST_HAVE_MIN = 6;
const DEFAULT_BAR = 7;

export interface HiringPrefs {
  seniority: (typeof SENIORITY)[number];
  shape: (typeof SHAPE)[number];
  pace: (typeof PACE)[number];
  weights: Record<string, number>; // rubric item -> weight
  mustHave: string[]; // rubric items
  bar: number; // fit score that counts as "above your bar"
  notes: string;
}

export function defaultPrefs(): HiringPrefs {
  return { seniority: 'Any', shape: 'Any', pace: 'Balanced', weights: {}, mustHave: [], bar: DEFAULT_BAR, notes: '' };
}

export function isDefault(p: HiringPrefs): boolean {
  return (
    p.seniority === 'Any' &&
    p.shape === 'Any' &&
    p.pace === 'Balanced' &&
    Object.values(p.weights).every((w) => w === 1) &&
    p.mustHave.length === 0 &&
    p.bar === DEFAULT_BAR &&
    !p.notes.trim()
  );
}

const key = (roleId: string) => `donna.hiringPrefs.${roleId}`;

function load(roleId: string): HiringPrefs {
  try {
    const raw = localStorage.getItem(key(roleId));
    return raw ? { ...defaultPrefs(), ...(JSON.parse(raw) as Partial<HiringPrefs>) } : defaultPrefs();
  } catch {
    return defaultPrefs();
  }
}

// Same-tab listeners, so the panel, the ranked list and Ask Donna stay in step.
const listeners = new Set<() => void>();

export function useHiringPrefs(roleId: string | undefined) {
  const [prefs, setState] = useState<HiringPrefs>(() => (roleId ? load(roleId) : defaultPrefs()));

  useEffect(() => {
    if (!roleId) return setState(defaultPrefs());
    setState(load(roleId));
    const sync = () => setState(load(roleId));
    listeners.add(sync);
    return () => void listeners.delete(sync);
  }, [roleId]);

  const setPrefs = useCallback(
    (next: HiringPrefs) => {
      if (!roleId) return;
      setState(next);
      try {
        localStorage.setItem(key(roleId), JSON.stringify(next));
      } catch {
        // Private window or blocked storage: keep the change for this view only.
      }
      listeners.forEach((l) => l());
    },
    [roleId],
  );

  return [prefs, setPrefs] as const;
}

/** Same name test the rubric chips use; tolerant of case and punctuation. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const weightOf = (p: HiringPrefs, name: string) => {
  const hit = Object.entries(p.weights).find(([k]) => norm(k) === norm(name));
  return hit ? hit[1] : 1;
};

export interface Fit {
  score: number; // weighted 0-10
  aboveBar: boolean;
  missed: string[]; // must-haves scored below MUST_HAVE_MIN
}

/** Re-weights the panel's criterion scores by what this founder cares about. */
export function fitFor(e: EvaluateResult | undefined, p: HiringPrefs): Fit | undefined {
  if (!e) return undefined;
  let sum = 0;
  let total = 0;
  for (const k of e.criteria) {
    const w = weightOf(p, k.name);
    sum += k.score * w;
    total += w;
  }
  const score = total > 0 ? Math.round((sum / total) * 10) / 10 : e.overall;
  // A must-have the scorecard left out is unknown, not failed.
  const missed = p.mustHave.filter((m) => {
    const k = e.criteria.find((c) => norm(c.name) === norm(m));
    return k !== undefined && k.score < MUST_HAVE_MIN;
  });
  return { score, aboveBar: score >= p.bar && missed.length === 0, missed };
}

/** Ranks by fit: must-have misses sink, then by weighted score. */
export function rankByFit(list: UICandidate[], p: HiringPrefs) {
  return list
    .map((c) => ({ c, fit: fitFor(c.evaluation, p) }))
    .sort((a, b) => {
      const am = a.fit?.missed.length ? 1 : 0;
      const bm = b.fit?.missed.length ? 1 : 0;
      if (am !== bm) return am - bm;
      return (b.fit?.score ?? -1) - (a.fit?.score ?? -1);
    });
}

/** Plain text for the Ask Donna agent, so her picks follow the founder's preferences. */
export function prefsContext(p: HiringPrefs, role: Role): string {
  if (isDefault(p)) return '';
  const weights = role.rubric
    .map((r) => `${r}: ${WEIGHTS.find((w) => w.value === weightOf(p, r))?.label ?? 'Normal'}`)
    .join('; ');
  return [
    `FOUNDER HIRING PREFERENCES for ${role.title} (rank and recommend with these in mind; never use them to weigh protected traits):`,
    `Looking for: ${p.seniority === 'Any' ? 'any level' : p.seniority}, ${p.shape === 'Any' ? 'any engineer shape' : p.shape}, ${p.pace.toLowerCase()}.`,
    `Criterion weights: ${weights}.`,
    p.mustHave.length ? `Must-haves (score ${MUST_HAVE_MIN}+): ${p.mustHave.join('; ')}.` : '',
    `Bar to advance: weighted fit ${p.bar}/10.`,
    p.notes.trim() ? `In the founder's words: ${p.notes.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
