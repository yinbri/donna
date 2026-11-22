import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Role } from '../server/contracts';
import type { UICandidate } from '../dev/uiApi';
import { initials } from './FounderSidebar';

/**
 * Overview tab: a month calendar and the list of what's coming up.
 * Interviews come from approvals (slotIso); screens and applications come from the timeline.
 * Sample events (SAMPLE_PLAN) fill the next few weeks so the demo calendar isn't empty; they are
 * flagged `sample` and the page says so. Accent marks an intro still waiting on Approve, nothing else.
 */

type Kind = 'interview' | 'proposed' | 'onsite' | 'debrief' | 'screen' | 'applied';
type CalEvent = { id: string; at: Date; kind: Kind; title: string; who: UICandidate; role?: Role; sample?: boolean };

const KIND_LABEL: Record<Kind, string> = {
  interview: 'Intro call',
  proposed: 'Intro · needs Approve',
  onsite: 'Onsite',
  debrief: 'Panel debrief',
  screen: 'Voice screen',
  applied: 'Applied',
};
const UPCOMING_KINDS = new Set<Kind>(['interview', 'proposed', 'onsite', 'debrief']);
const TAG: Partial<Record<Kind, string>> = { interview: 'Booked', proposed: 'Needs Approve', onsite: 'Onsite', debrief: 'Debrief' };

// [days from today, hour, minute, kind], one per candidate in score order. Weekends roll to Monday.
const SAMPLE_PLAN: [number, number, number, Kind][] = [
  [-3, 11, 0, 'interview'],
  [-1, 16, 0, 'debrief'],
  [1, 10, 0, 'interview'],
  [2, 14, 30, 'onsite'],
  [3, 11, 0, 'proposed'],
  [4, 16, 0, 'debrief'],
  [7, 9, 30, 'interview'],
  [9, 13, 0, 'onsite'],
  [11, 15, 0, 'interview'],
  [15, 10, 30, 'proposed'],
  [17, 14, 0, 'onsite'],
  [22, 11, 30, 'interview'],
];

function sampleEvents(candidates: UICandidate[], roles: Role[], today = new Date()): CalEvent[] {
  const pool = [...candidates]
    .filter((c) => c.status !== 'REJECTED')
    .sort((a, b) => (b.evaluation?.overall ?? -1) - (a.evaluation?.overall ?? -1));
  const people = pool.length ? pool : candidates;
  if (!people.length) return [];
  return SAMPLE_PLAN.map(([days, h, m, kind], i) => {
    const at = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days, h, m);
    if (at.getDay() === 6) at.setDate(at.getDate() + 2);
    if (at.getDay() === 0) at.setDate(at.getDate() + 1);
    const who = people[i % people.length]!;
    return { id: `sample-${i}`, at, kind, title: `${KIND_LABEL[kind]} with ${who.name}`, who, role: roles.find((r) => r.id === who.roleId), sample: true };
  });
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);
const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function collect(candidates: UICandidate[], roles: Role[]): CalEvent[] {
  const out: CalEvent[] = [];
  for (const c of candidates) {
    const role = roles.find((r) => r.id === c.roleId);
    const a = c.approval;
    if (a?.slotIso && a.status !== 'REJECTED') {
      const kind: Kind = a.status === 'APPROVED' || c.status === 'BOOKED' ? 'interview' : 'proposed';
      out.push({ id: `${a.id}-slot`, at: new Date(a.slotIso), kind, title: `${KIND_LABEL[kind]} with ${c.name}`, who: c, role });
    }
    for (const e of c.events) {
      if (e.kind === 'call_ended') out.push({ id: e.id, at: new Date(e.at), kind: 'screen', title: `Donna screened ${c.name}`, who: c, role });
      if (e.kind === 'applied') out.push({ id: e.id, at: new Date(e.at), kind: 'applied', title: `${c.name} applied`, who: c, role });
    }
  }
  return [...out, ...sampleEvents(candidates, roles)].sort((x, y) => x.at.getTime() - y.at.getTime());
}

/** Six-row month grid starting on the Sunday on or before the 1st. */
function monthGrid(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(1 - start.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d={dir === 'left' ? 'M10 3 5 8l5 5' : 'm6 3 5 5-5 5'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Schedule({ candidates, roles }: { candidates: UICandidate[]; roles: Role[] }) {
  const today = new Date();
  const events = useMemo(() => collect(candidates, roles), [candidates, roles]);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [picked, setPicked] = useState<Date>(today);

  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    events.forEach((e) => m.set(dayKey(e.at), [...(m.get(dayKey(e.at)) ?? []), e]));
    return m;
  }, [events]);

  const now = today.getTime();
  const upcoming = events.filter((e) => UPCOMING_KINDS.has(e.kind) && e.at.getTime() >= now - 60 * 60 * 1000);
  const pickedEvents = byDay.get(dayKey(picked)) ?? [];
  const thisWeek = upcoming.filter((e) => e.at.getTime() - now < 7 * 86400000).length;
  const pending = upcoming.filter((e) => e.kind === 'proposed').length;

  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const goToday = () => {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setPicked(today);
  };

  return (
    <div className="schedule">
      <section className="ov-card cal-card">
        <header className="cal-head">
          <h3>{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h3>
          <div className="cal-nav">
            <button className="cal-today" onClick={goToday}>
              Today
            </button>
            <button className="cal-arrow" onClick={() => shift(-1)} aria-label="Previous month">
              <Chevron dir="left" />
            </button>
            <button className="cal-arrow" onClick={() => shift(1)} aria-label="Next month">
              <Chevron dir="right" />
            </button>
          </div>
        </header>

        <div className="cal-grid" role="grid" aria-label="Hiring calendar">
          {WEEKDAYS.map((d) => (
            <span key={d} className="cal-wd" role="columnheader">
              {d}
            </span>
          ))}
          {monthGrid(month).map((d) => {
            const evs = byDay.get(dayKey(d)) ?? [];
            const out = d.getMonth() !== month.getMonth();
            const cls = ['cal-day', out && 'out', sameDay(d, today) && 'today', sameDay(d, picked) && 'picked'].filter(Boolean).join(' ');
            const label = `${d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}${evs.length ? `, ${evs.length} event${evs.length > 1 ? 's' : ''}` : ''}`;
            return (
              <button key={d.toISOString()} className={cls} role="gridcell" aria-label={label} aria-pressed={sameDay(d, picked)} onClick={() => setPicked(d)}>
                <span className="cal-num">{d.getDate()}</span>
                <span className="cal-chips">
                  {evs.slice(0, 2).map((e) => (
                    <span key={e.id} className={`cal-chip k-${e.kind}`} title={`${fmtTime(e.at)} · ${e.title}`}>
                      {e.who.name.split(' ')[0]}
                    </span>
                  ))}
                  {evs.length > 2 && <span className="cal-more">+{evs.length - 2} more</span>}
                </span>
              </button>
            );
          })}
        </div>

        <footer className="cal-legend">
          <span><i className="k-interview" />Intro call</span>
          <span><i className="k-proposed" />Needs your Approve</span>
          <span><i className="k-onsite" />Onsite · debrief</span>
          <span><i className="k-screen" />Voice screen</span>
          <span><i className="k-applied" />Applied</span>
          {events.some((e) => e.sample) && <span className="cal-sample">Includes sample events for the demo</span>}
        </footer>
      </section>

      <div className="sched-side">
        <section className="ov-card">
          <header className="ov-head">
            <h3>Upcoming</h3>
            <span>{upcoming.length ? `${thisWeek} this week${pending ? ` · ${pending} need you` : ''}` : 'nothing booked'}</span>
          </header>
          {upcoming.length === 0 ? (
            <p className="ov-empty">No intro calls on the calendar yet. Approve a booking to see it here.</p>
          ) : (
            <ul className="upcoming">
              {upcoming.slice(0, 6).map((e) => (
                <li key={e.id}>
                  <Link to={`/founder/candidates/${e.who.id}`} className={`up-row${e.kind === 'proposed' ? ' hot' : ''}`}>
                    <span className="up-date" aria-hidden="true">
                      <strong>{e.at.getDate()}</strong>
                      <small>{e.at.toLocaleDateString([], { month: 'short' })}</small>
                    </span>
                    <span className="up-text">
                      <strong>{e.who.name}</strong>
                      <small>
                        {e.at.toLocaleDateString([], { weekday: 'short' })} · {fmtTime(e.at)}
                        {e.role ? ` · ${e.role.title}` : ''}
                      </small>
                    </span>
                    <span className={`up-tag k-${e.kind}`}>{TAG[e.kind]}</span>
                  </Link>
                </li>
              ))}
              {upcoming.length > 6 && <li className="up-more">+{upcoming.length - 6} more on the calendar</li>}
            </ul>
          )}
        </section>

        <section className="ov-card">
          <header className="ov-head">
            <h3>{sameDay(picked, today) ? 'Today' : picked.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
            <span>{pickedEvents.length ? `${pickedEvents.length} event${pickedEvents.length > 1 ? 's' : ''}` : ''}</span>
          </header>
          {pickedEvents.length === 0 ? (
            <p className="ov-empty">Nothing on this day.</p>
          ) : (
            <ul className="day-list">
              {pickedEvents.map((e) => (
                <li key={e.id}>
                  <Link to={`/founder/candidates/${e.who.id}`}>
                    <time>{fmtTime(e.at)}</time>
                    <span className={`day-bar k-${e.kind}`} aria-hidden="true" />
                    <span className="up-text">
                      <strong>{KIND_LABEL[e.kind]}</strong>
                      <small>{e.who.name}{e.role ? ` · ${e.role.title}` : ''}</small>
                    </span>
                    <span className="avatar sm" aria-hidden="true">{initials(e.who.name)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
