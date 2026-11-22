import { useCallback, useEffect, useState } from 'react';
import type { EvaluateResult, Role } from '../server/contracts';
import type { UICandidate } from '../dev/uiApi';
import { saveHiringPrefs } from 'wasp/client/operations';

/**
 * The founder's own take on what "good" looks like for one role. Kept in this browser,
 * per role. Weights, must-haves and the bar re-rank the scores the panel already gave, and
 * tech stack matches (found in the dossier and transcript) add a small, visible boost.
 * Nothing here changes a panel score. The profile, personality traits and notes are handed
 * to Ask Donna, and are also saved to the role on the server (saveHiringPrefs) so Donna can
 * pick her follow-ups on the voice screen with them in mind.
 */

export const SENIORITY = ['Any', 'Early career', 'Mid-level', 'Senior', 'Staff+'] as const;
export const SHAPE = ['Any', 'Generalist', 'Product-minded', 'Infra / backend', 'AI / ML'] as const;
export const PACE = ['Ship fast', 'Balanced', 'Rigor first'] as const;

/** Preset stack chips; founders can add their own. Aliases widen the text match. */
export const STACK_PRESETS = ['TypeScript', 'Python', 'Go', 'Rust', 'React', 'Node.js', 'Postgres', 'Redis', 'Kubernetes', 'AWS', 'LLMs', 'iOS / Swift'] as const;
const STACK_ALIASES: Record<string, string[]> = {
  typescript: ['typescript', 'ts'],
  'node js': ['node', 'nodejs', 'node js'],
  postgres: ['postgres', 'postgresql', 'pgslice'],
  kubernetes: ['kubernetes', 'k8s'],
  llms: ['llm', 'llms', 'gpt', 'openai', 'anthropic', 'claude', 'rag', 'embeddings'],
  'ios swift': ['ios', 'swift', 'swiftui'],
  react: ['react', 'next js', 'nextjs'],
  aws: ['aws', 'lambda', 's3', 'dynamodb'],
};
/** Up to this much is added to fit when a candidate shows every stack item you picked. */
export const STACK_BOOST = 0.5;

/** Work-style traits only. Never protected traits; Ask Donna is told the same. */
export const TRAITS = [
  'High ownership',
  'Bias to action',
  'Clear communicator',
  'Low ego',
  'Customer-obsessed',
  'Thrives in ambiguity',
  'Detail-oriented',
  'Fast learner',
  'Collaborative',
  'Strong opinions, loosely held',
] as const;
export const MAX_TRAITS = 4;

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
  stack: string[]; // tech the founder wants to see
  traits: string[]; // personality / working traits, up to MAX_TRAITS
}

export function defaultPrefs(): HiringPrefs {
  return { seniority: 'Any', shape: 'Any', pace: 'Balanced', weights: {}, mustHave: [], bar: DEFAULT_BAR, notes: '', stack: [], traits: [] };
}

export function isDefault(p: HiringPrefs): boolean {
  return (
    p.seniority === 'Any' &&
    p.shape === 'Any' &&
    p.pace === 'Balanced' &&
    Object.values(p.weights).every((w) => w === 1) &&
    p.mustHave.length === 0 &&
    p.bar === DEFAULT_BAR &&
    !p.notes.trim() &&
    p.stack.length === 0 &&
    p.traits.length === 0
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

// Server copy for the voice screen. Debounced so dragging the bar or typing notes sends one
// request; failures only log, because ranking and Ask Donna keep working from this browser.
const pending = new Map<string, number>();
function syncToServer(roleId: string, prefs: HiringPrefs, delay = 800) {
  window.clearTimeout(pending.get(roleId));
  pending.set(
    roleId,
    window.setTimeout(() => {
      pending.delete(roleId);
      saveHiringPrefs({ roleId, prefs }).catch((err: unknown) => console.warn('Could not save hiring preferences for the call', err));
    }, delay),
  );
}
// Preferences saved before the server copy existed get sent once per role per page load.
const synced = new Set<string>();

export function useHiringPrefs(roleId: string | undefined) {
  const [prefs, setState] = useState<HiringPrefs>(() => (roleId ? load(roleId) : defaultPrefs()));

  useEffect(() => {
    if (!roleId) return setState(defaultPrefs());
    const initial = load(roleId);
    setState(initial);
    if (!synced.has(roleId) && !isDefault(initial)) syncToServer(roleId, initial, 0);
    synced.add(roleId);
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
      syncToServer(roleId, next);
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
  score: number; // weighted 0-10, plus the stack boost
  aboveBar: boolean;
  missed: string[]; // must-haves scored below MUST_HAVE_MIN
  stackHits: string[]; // picked stack items seen in research or on the call
}

/** Everything Donna knows about a candidate as one lowercase string, for stack matching. */
function candidateText(c: UICandidate): string {
  const d = c.dossier;
  return norm(
    [
      d?.summary,
      d?.topProject,
      ...(d?.highlights ?? []),
      ...(c.transcript ?? []).filter((t) => t.role === 'user').map((t) => t.text),
    ]
      .filter(Boolean)
      .join(' '),
  );
}

export function stackHits(c: UICandidate, stack: string[]): string[] {
  if (!stack.length) return [];
  const text = ` ${candidateText(c)} `;
  return stack.filter((s) => (STACK_ALIASES[norm(s)] ?? [norm(s)]).some((a) => text.includes(` ${a} `)));
}

/** Re-weights the panel's criterion scores by what this founder cares about. */
export function fitFor(e: EvaluateResult | undefined, p: HiringPrefs, hits: string[] = []): Fit | undefined {
  if (!e) return undefined;
  let sum = 0;
  let total = 0;
  for (const k of e.criteria) {
    const w = weightOf(p, k.name);
    sum += k.score * w;
    total += w;
  }
  const base = total > 0 ? sum / total : e.overall;
  const boost = p.stack.length ? (STACK_BOOST * hits.length) / p.stack.length : 0;
  const score = Math.min(10, Math.round((base + boost) * 10) / 10);
  // A must-have the scorecard left out is unknown, not failed.
  const missed = p.mustHave.filter((m) => {
    const k = e.criteria.find((c) => norm(c.name) === norm(m));
    return k !== undefined && k.score < MUST_HAVE_MIN;
  });
  return { score, aboveBar: score >= p.bar && missed.length === 0, missed, stackHits: hits };
}

/** Ranks by fit: must-have misses sink, then by weighted score. */
export function rankByFit(list: UICandidate[], p: HiringPrefs) {
  return list
    .map((c) => ({ c, fit: fitFor(c.evaluation, p, stackHits(c, p.stack)) }))
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
    p.stack.length ? `Tech stack they want to see: ${p.stack.join(', ')}. Favor candidates whose research or call shows real use of these.` : '',
    p.traits.length ? `Working traits they value: ${p.traits.join(', ')}. Point to transcript evidence for these; do not guess.` : '',
    `Bar to advance: weighted fit ${p.bar}/10.`,
    p.notes.trim() ? `In the founder's words: ${p.notes.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
