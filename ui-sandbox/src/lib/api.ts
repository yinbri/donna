// Every data access in the UI goes through this file. Today it runs on the repo
// fixtures with an in-memory store; at integration only these functions change to
// call the Wasp operations (see contracts/contracts.ts for the signatures).

import { useSyncExternalStore } from 'react';
import rolesFixture from '../../../fixtures/roles.json';
import dossierFixture from '../../../fixtures/dossier.json';
import conversationFixture from '../../../fixtures/conversation.json';
import panelFixture from '../../../fixtures/panel.json';
import approvalFixture from '../../../fixtures/approval.json';
import type {
  Approval,
  EvaluateResult,
  ResearchResult,
  Role,
  StartScreenResult,
  TimelineEvent,
  TranscriptTurn,
  UICandidate,
} from './types';

export const LIVE_AGENT_ID: string | undefined = import.meta.env.VITE_ELEVENLABS_AGENT_ID || undefined;
/** Integrations not wired yet. The UI labels stubbed results honestly. */
export const STUBS = { research: true, evaluate: true, alter: true, traceroot: true };

// ---------- seed data ----------

const extraRoles: Role[] = [
  {
    id: 'role-demo-voice-eng',
    title: 'Voice AI Engineer',
    companyName: 'Acme (demo)',
    founderName: 'Alex',
    rubric: ['Shipped real systems', 'Depth on own project', 'Communication'],
    questions: ['Tell me about a latency problem you fixed.'],
    sourceUrl: null,
    isOfficialPosting: false,
  },
];
const roles: Role[] = [...(rolesFixture as Role[]), ...extraRoles];

const baseDossier = dossierFixture as ResearchResult;
const baseTranscript = conversationFixture.transcript as TranscriptTurn[];
const basePanel = panelFixture as EvaluateResult;

const now = Date.now();
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();
let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function ev(candidateId: string, minsAgo: number, kind: TimelineEvent['kind'], detail: string): TimelineEvent {
  return { id: uid('ev'), candidateId, at: iso(minsAgo), kind, detail };
}

function seed(): UICandidate[] {
  const sam: UICandidate = {
    id: 'cand-sam',
    roleId: roles[0].id,
    name: 'Sam Rivera',
    email: 'sam@example.com',
    githubUser: 'samrivera',
    consentAt: iso(42),
    createdAt: iso(42),
    status: 'AWAITING_APPROVAL',
    dossier: baseDossier,
    conversationId: conversationFixture.conversationId,
    transcript: baseTranscript,
    durationSecs: conversationFixture.durationSecs,
    evaluation: basePanel,
    events: [
      ev('cand-sam', 42, 'applied', 'Applied with GitHub and email'),
      ev('cand-sam', 41, 'research_done', 'Fiber AI and GitHub returned data'),
      ev('cand-sam', 39, 'call_started', 'Browser call with Donna'),
      ev('cand-sam', 37, 'call_ended', '1:36 call, 3 questions'),
      ev('cand-sam', 36, 'evaluated', 'Panel: PASS, 7.6'),
    ],
  };

  const priya: UICandidate = {
    id: 'cand-priya',
    roleId: roles[0].id,
    name: 'Priya Natarajan',
    email: 'priya@example.com',
    linkedinUrl: 'https://www.linkedin.com/in/example',
    consentAt: iso(25),
    createdAt: iso(25),
    status: 'AWAITING_APPROVAL',
    dossier: {
      ...baseDossier,
      summary: 'Fourth-year Waterloo SE student. Built a CRDT-based collaborative editor; one internship on a mobile team.',
      topProject: 'a CRDT collaborative text editor',
      sources: { fiber: true, ploid: false, github: true },
    },
    transcript: baseTranscript,
    durationSecs: 102,
    evaluation: {
      ...basePanel,
      recommendation: 'MAYBE',
      overall: 6.4,
      personas: [
        { name: 'Principal Engineer', score: 8.5, rationale: 'Strong on the data-structure details of the editor.' },
        { name: 'YC Founder', score: 6.0, rationale: 'Unclear what they would own in the first month.' },
        { name: 'BS Detector', score: 4.5, rationale: 'Two resume claims were not backed up on the call.' },
      ],
    },
    events: [
      ev('cand-priya', 25, 'applied', 'Applied with LinkedIn and email'),
      ev('cand-priya', 24, 'research_done', 'Fiber AI and GitHub returned data'),
      ev('cand-priya', 20, 'call_ended', '1:42 call, 3 questions'),
      ev('cand-priya', 19, 'evaluated', 'Panel: MAYBE, 6.4, split'),
    ],
  };

  const marcus: UICandidate = {
    id: 'cand-marcus',
    roleId: roles[0].id,
    name: 'Marcus Lee',
    email: 'marcus@example.com',
    githubUser: 'marcuslee',
    consentAt: iso(14),
    createdAt: iso(14),
    status: 'REJECTED',
    dossier: { ...baseDossier, topProject: 'a to-do app tutorial clone', sources: { fiber: false, ploid: false, github: true } },
    transcript: baseTranscript,
    durationSecs: 71,
    evaluation: {
      ...basePanel,
      recommendation: 'REJECT',
      overall: 3.9,
      personas: [
        { name: 'Principal Engineer', score: 4.0, rationale: 'Could not describe how any of the listed systems worked.' },
        { name: 'YC Founder', score: 4.5, rationale: 'Enthusiastic, but no evidence of shipping.' },
        { name: 'BS Detector', score: 3.0, rationale: 'Answers read like generic AI-polished text.' },
      ],
    },
    events: [
      ev('cand-marcus', 14, 'applied', 'Applied with GitHub and email'),
      ev('cand-marcus', 10, 'evaluated', 'Panel: REJECT, 3.9'),
    ],
  };

  return [sam, priya, marcus];
}

// ---------- store ----------

const KEY = 'donna.ui.candidates.v1';
let candidates: UICandidate[] = load();
const listeners = new Set<() => void>();

function load(): UICandidate[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as UICandidate[];
  } catch {
    /* storage unavailable: fall back to seed */
  }
  return seed();
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(candidates));
  } catch {
    /* ignore */
  }
}
function emit() {
  save();
  listeners.forEach((l) => l());
}
function update(id: string, fn: (c: UICandidate) => UICandidate) {
  candidates = candidates.map((c) => (c.id === id ? fn(c) : c));
  emit();
}
function addEvent(c: UICandidate, kind: TimelineEvent['kind'], detail: string): UICandidate {
  return { ...c, events: [...c.events, { id: uid('ev'), candidateId: c.id, at: new Date().toISOString(), kind, detail }] };
}

export function resetDemo() {
  candidates = seed();
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useCandidates(): UICandidate[] {
  return useSyncExternalStore(subscribe, () => candidates);
}
export function useCandidate(id: string | undefined): UICandidate | undefined {
  const all = useCandidates();
  return all.find((c) => c.id === id);
}
export function listRoles(): Role[] {
  return roles;
}
export function getRole(id: string): Role | undefined {
  return roles.find((r) => r.id === id);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- operations (contract-shaped) ----------

export function createCandidate(input: {
  roleId: string;
  name: string;
  email: string;
  githubUser?: string;
  linkedinUrl?: string;
}): UICandidate {
  const c: UICandidate = {
    id: uid('cand'),
    ...input,
    consentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    status: 'APPLIED',
    events: [],
  };
  candidates = [...candidates, addEvent(c, 'applied', `Applied with ${input.githubUser ? 'GitHub' : 'LinkedIn'} and email`)];
  emit();
  return c;
}

/** Research steps the candidate watches. Calls box/research once integrated. */
export async function research(
  id: string,
  onStep: (step: 'fiber' | 'github' | 'ploid' | 'questions', state: 'run' | 'ok' | 'skip') => void,
): Promise<ResearchResult> {
  update(id, (c) => ({ ...c, status: 'RESEARCHING' }));
  const c = candidates.find((x) => x.id === id)!;
  const steps: Array<['fiber' | 'github' | 'ploid' | 'questions', boolean]> = [
    ['fiber', !!c.linkedinUrl || true],
    ['github', !!c.githubUser],
    ['ploid', false],
    ['questions', true],
  ];
  for (const [s, ok] of steps) {
    onStep(s, 'run');
    await sleep(700);
    onStep(s, ok ? 'ok' : 'skip');
  }
  const firstName = c.name.split(' ')[0];
  const dossier: ResearchResult = {
    ...baseDossier,
    summary: `${firstName}: ${baseDossier.summary}`,
    sources: { fiber: true, ploid: false, github: !!c.githubUser },
  };
  update(id, (x) => addEvent({ ...x, status: 'READY', dossier }, 'research_done', 'Research complete (fixture data)'));
  return dossier;
}

export function startScreen(id: string, fast: boolean): StartScreenResult {
  const c = candidates.find((x) => x.id === id)!;
  const role = getRole(c.roleId)!;
  update(id, (x) => addEvent({ ...x, status: 'CALLING' }, 'call_started', 'Browser call with Donna'));
  return {
    token: '',
    agentId: LIVE_AGENT_ID ?? '',
    dynamicVariables: {
      candidate_name: c.name.split(' ')[0],
      founder_name: role.founderName,
      company_name: role.companyName,
      role_title: role.title,
      top_project: c.dossier?.topProject ?? 'your recent work',
      tailored_questions: (c.dossier?.tailoredQuestions ?? role.questions).join('\n'),
      demo_fast_mode: fast,
    },
  };
}

/** After the call: store transcript, then evaluate. Calls finalizeScreen once integrated. */
export async function finalizeScreen(
  id: string,
  call: { conversationId?: string; transcript?: TranscriptTurn[]; durationSecs?: number },
): Promise<EvaluateResult> {
  const transcript = call.transcript && call.transcript.length > 2 ? call.transcript : baseTranscript;
  const durationSecs = call.durationSecs ?? conversationFixture.durationSecs;
  update(id, (x) =>
    addEvent(
      { ...x, status: 'EVALUATING', conversationId: call.conversationId, transcript, durationSecs },
      'call_ended',
      `${fmtDuration(durationSecs)} call`,
    ),
  );
  await sleep(1500);
  const evaluation = basePanel;
  update(id, (x) =>
    addEvent(
      { ...x, status: evaluation.recommendation === 'REJECT' ? 'REJECTED' : 'AWAITING_APPROVAL', evaluation },
      'evaluated',
      `Panel: ${evaluation.recommendation}, ${evaluation.overall.toFixed(1)} (fixture panel)`,
    ),
  );
  return evaluation;
}

export function proposeBooking(id: string): Approval {
  const c = candidates.find((x) => x.id === id)!;
  const role = getRole(c.roleId)!;
  const first = c.name.split(' ')[0];
  const approval: Approval = {
    ...(approvalFixture as Approval),
    id: uid('appr'),
    candidateId: id,
    status: 'PENDING',
    emailDraft: {
      to: c.email,
      subject: `Interview with ${role.founderName} at ${role.companyName}`,
      body: `Hi ${first}, thanks for the chat with Donna. ${role.founderName} would like to meet on Tuesday Nov 24 at 3:00 PM ET. The calendar invite is attached. Reply here if that doesn't work.`,
    },
    deniedAttempt: null,
  };
  update(id, (x) => addEvent({ ...x, approval }, 'booking_proposed', 'Tue Nov 24, 3:00 PM held for approval'));
  return approval;
}

export async function attemptWithoutApproval(id: string): Promise<void> {
  await sleep(600);
  update(id, (x) => {
    if (!x.approval) return x;
    const deniedAttempt = {
      at: new Date().toISOString(),
      reason: STUBS.alter
        ? 'Stub: Alter not connected yet. Real run returns Alter’s policy denial here.'
        : 'Denied by policy: calendar event creation requires founder approval.',
      auditRef: STUBS.alter ? null : 'alter-audit-…',
    };
    return addEvent({ ...x, approval: { ...x.approval, deniedAttempt } }, 'denied_attempt', 'Donna tried to book without approval. Blocked.');
  });
}

export async function decide(id: string, approve: boolean): Promise<void> {
  await sleep(700);
  update(id, (x) => {
    if (!x.approval) return x;
    const status = approve ? 'APPROVED' : 'REJECTED';
    let next = addEvent({ ...x, approval: { ...x.approval, status } }, approve ? 'approved' : 'rejected', approve ? 'Founder approved' : 'Founder rejected');
    if (approve) {
      next = addEvent({ ...next, status: 'BOOKED' }, 'invite_sent', `Invite sent to ${x.email}`);
    } else {
      next = { ...next, status: 'REJECTED' };
    }
    return next;
  });
}

export function setDecision(id: string, recommendation: 'PASS' | 'MAYBE' | 'REJECT') {
  update(id, (x) =>
    x.evaluation ? { ...x, evaluation: { ...x.evaluation, recommendation } } : x,
  );
}

// ---------- helpers ----------

export function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
}
export function panelSpread(e?: EvaluateResult): number {
  if (!e || e.personas.length === 0) return 0;
  const s = e.personas.map((p) => p.score);
  return Math.max(...s) - Math.min(...s);
}
export const PANEL_SPLIT = 3;
