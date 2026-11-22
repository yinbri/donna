import { panelSpread, PANEL_SPLIT, type UICandidate } from '../dev/uiApi';
import type { Role } from '../server/contracts';

/**
 * Fallback answers for the "Ask Donna" chat, used when the ElevenLabs chat agent is
 * unset or unreachable. No model call: Donna reads the same candidate data the
 * dashboard shows (scores, quotes, panel, approvals) and answers from it.
 */

// Donna never weighs these (AGENTS.md guardrails), so she says so instead of answering.
const PROTECTED = /\b(age|old|young|family|kids?|children|married|pregnan\w*|religio\w*|church|faith|health|disab\w*|race|ethnic\w*|origin|nationality|accent|gender|sexual\w*)\b/i;

const recLabel = (c: UICandidate) =>
  c.evaluation?.recommendation === 'PASS' ? 'Advance' : c.evaluation?.recommendation === 'MAYBE' ? 'Maybe' : c.evaluation ? 'Pass' : 'Not scored yet';

const first = (c: UICandidate) => c.name.split(' ')[0];
const noDot = (s: string) => s.replace(/[.\s]+$/, '');

function profile(c: UICandidate): string {
  const e = c.evaluation;
  if (!e) return `${c.name} hasn't finished a screen yet, so there's nothing to score.`;
  const best = [...e.criteria].sort((a, b) => b.score - a.score)[0];
  const lines = [
    `${c.name}: ${recLabel(c)}, ${e.overall.toFixed(1)} overall.`,
    c.dossier ? `Built ${c.dossier.topProject}.` : '',
    best ? `Strongest on ${best.name.toLowerCase()} (${best.score}/10): "${best.quote}"` : '',
    `Panel: ${e.personas.map((p) => `${p.name} ${p.score}`).join(' · ')}.`,
    e.redFlags.length ? `Watch for: ${e.redFlags.map(noDot).join('; ')}.` : 'No red flags.',
  ];
  return lines.filter(Boolean).join('\n');
}

export function answer(question: string, candidates: UICandidate[], role?: Role): string {
  const q = question.toLowerCase();
  const scored = candidates.filter((c) => c.evaluation).sort((a, b) => b.evaluation!.overall - a.evaluation!.overall);
  const forRole = role ? ` for ${role.title}` : '';

  if (PROTECTED.test(q)) {
    return "I don't look at that, and I don't ask about it on calls. I only score what people built and how they explain it.";
  }

  const named = candidates.find((c) => q.includes(c.name.toLowerCase()) || q.includes(first(c).toLowerCase()));
  if (named) return profile(named);

  if (/disagree|split|panel|conflict/.test(q)) {
    const split = scored.filter((c) => panelSpread(c.evaluation) >= PANEL_SPLIT);
    if (!split.length) return `The panel agreed on everyone${forRole}.`;
    return split
      .map((c) => {
        const ps = [...c.evaluation!.personas].sort((a, b) => b.score - a.score);
        const hi = ps[0];
        const lo = ps[ps.length - 1];
        return `${c.name}: ${hi.name} gave ${hi.score} ("${hi.rationale}") but ${lo.name} gave ${lo.score} ("${lo.rationale}").`;
      })
      .join('\n\n');
  }

  if (/red flag|concern|worr|risk/.test(q)) {
    const flagged = scored.filter((c) => c.evaluation!.redFlags.length);
    if (!flagged.length) return 'No red flags so far.';
    return flagged.map((c) => `${c.name}:\n${c.evaluation!.redFlags.map((f) => `• ${f}`).join('\n')}`).join('\n\n');
  }

  if (/need|approv|wait|pending|me\b/.test(q)) {
    const waiting = candidates.filter((c) => c.status === 'AWAITING_APPROVAL');
    if (!waiting.length) return 'Nothing is waiting on you.';
    return `${waiting.length} waiting on you:\n${waiting
      .map((c) => `• ${c.name}: ${c.approval ? 'intro is drafted, needs your Approve before anything is sent' : 'panel result needs your read'}`)
      .join('\n')}`;
  }

  if (/meet|best|top|advance|shortlist|who should|strongest|hire/.test(q)) {
    const go = scored.filter((c) => c.evaluation!.recommendation === 'PASS');
    if (!go.length) return `No one is a clear advance yet${forRole}. ${scored[0] ? `Closest is ${scored[0].name} at ${scored[0].evaluation!.overall.toFixed(1)}.` : ''}`;
    return `Meet ${go.map((c) => `${c.name} (${c.evaluation!.overall.toFixed(1)})`).join(' and ')}.\n${go
      .map((c) => `${first(c)}: "${c.evaluation!.standoutQuote}"`)
      .join('\n')}`;
  }

  if (/how many|count|stats|summary|overview|today/.test(q)) {
    const booked = candidates.filter((c) => c.status === 'BOOKED').length;
    return `${scored.length} screened${forRole}, ${candidates.filter((c) => c.status === 'AWAITING_APPROVAL').length} waiting on you, ${booked} booked.\nTop score: ${scored[0] ? `${scored[0].name}, ${scored[0].evaluation!.overall.toFixed(1)}` : 'none yet'}.`;
  }

  return `I can answer from the screens I've run${forRole}. Try:\n• Who should I meet this week?\n• Where did the panel disagree?\n• Any red flags?\n• Tell me about ${scored[0] ? first(scored[0]) : 'a candidate'}`;
}

/** Plain-text candidate data for the ElevenLabs chat agent: everything the dashboard shows, nothing it doesn't. */
export function contextFor(candidates: UICandidate[], role?: Role): string {
  const roles = new Map<string, Role>();
  for (const c of candidates) roles.set(c.role.id, c.role);
  if (role) roles.set(role.id, role);
  const roleBlock = [...roles.values()]
    .map((r) => `ROLE ${r.title} at ${r.companyName}. Rubric: ${r.rubric.join('; ')}. Screen questions: ${r.questions.join(' | ')}`)
    .join('\n');

  const people = candidates.map((c) => {
    const e = c.evaluation;
    const lines = [`CANDIDATE ${c.name} (role: ${c.role.title}, status: ${c.status}, recommendation: ${recLabel(c)}${e ? `, overall ${e.overall.toFixed(1)}/10` : ''})`];
    if (c.dossier) {
      lines.push(`Research: ${c.dossier.summary} Top project: ${c.dossier.topProject}.`);
      if (c.dossier.highlights.length) lines.push(`Highlights: ${c.dossier.highlights.join('; ')}`);
      if (c.dossier.claimsToVerify.length) lines.push(`Claims to verify: ${c.dossier.claimsToVerify.join('; ')}`);
    }
    if (e) {
      lines.push(`Criteria: ${e.criteria.map((k) => `${k.name} ${k.score}/10 ("${k.quote}")`).join('; ')}`);
      lines.push(`Panel: ${e.personas.map((p) => `${p.name} ${p.score}/10 (${p.rationale})`).join('; ')}`);
      lines.push(`Standout quote: "${e.standoutQuote}"`);
      lines.push(`Red flags: ${e.redFlags.length ? e.redFlags.join('; ') : 'none'}`);
      lines.push(`Strengths: ${e.feedback.strengths.join('; ')}. To sharpen: ${e.feedback.sharpen}`);
    }
    if (c.transcript?.length) {
      lines.push(`Call transcript:\n${c.transcript.map((t) => `${t.role === 'agent' ? 'Donna' : first(c)}: ${t.text}`).join('\n')}`);
    }
    if (c.approval) lines.push(`Booking: ${c.approval.status} for ${c.approval.slotIso}`);
    return lines.join('\n');
  });
  return [roleBlock, ...people].join('\n\n') || 'No candidates yet.';
}
