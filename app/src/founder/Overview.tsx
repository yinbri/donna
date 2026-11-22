import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { panelSpread, PANEL_SPLIT, type UICandidate } from '../dev/uiApi';
import type { Role } from '../server/contracts';
import { RecBadge } from '../components/ui';
import { Avatar } from './Avatar';

/**
 * Overview across every role at one company. Built for small numbers: dot plots and
 * meters stay honest with three candidates, where histograms and trend lines would not.
 * Ink is the only data hue; the accent marks "needs you" and nothing else.
 */

const PERSONAS = ['Principal Engineer', 'YC Founder', 'BS Detector'] as const;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const first = (name: string) => name.split(' ')[0];
const recLabel = (r?: string) => (r === 'PASS' ? 'Advance' : r === 'MAYBE' ? 'Maybe' : 'Pass');

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
}

const lastEventAt = (c: UICandidate) => c.events[c.events.length - 1]?.at ?? c.createdAt;

function Section({ title, note, children, className = '' }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`ov-card ${className}`}>
      <header className="ov-head">
        <h3>{title}</h3>
        {note && <span>{note}</span>}
      </header>
      {children}
    </section>
  );
}

/** A dot on a 0–10 track with a hover/focus tooltip. */
function Dot({ value, label, detail, hot, to }: { value: number; label: string; detail: string; hot?: boolean; to?: string }) {
  const style = { left: `${value * 10}%` };
  const tip = (
    <span className="tip" role="tooltip">
      <strong>{label}</strong>
      {detail}
    </span>
  );
  return to ? (
    <Link to={to} className={`dot${hot ? ' hot' : ''}`} style={style} aria-label={`${label}: ${detail}`}>
      {tip}
    </Link>
  ) : (
    <span tabIndex={0} className={`dot${hot ? ' hot' : ''}`} style={style} aria-label={`${label}: ${detail}`}>
      {tip}
    </span>
  );
}

function Axis() {
  return (
    <div className="axis" aria-hidden="true">
      {[0, 2, 4, 6, 8, 10].map((t) => (
        <span key={t} style={{ left: `${t * 10}%` }}>
          {t}
        </span>
      ))}
    </div>
  );
}

export function Overview({ candidates, roles, onOpenRole, children }: { candidates: UICandidate[]; roles: Role[]; onOpenRole: (id: string) => void; children?: ReactNode }) {
  const scored = candidates.filter((c) => c.evaluation);
  const researched = candidates.filter((c) => c.dossier);
  const screened = candidates.filter((c) => c.durationSecs || c.evaluation);
  const advanced = scored.filter((c) => c.evaluation!.recommendation === 'PASS');
  const booked = candidates.filter((c) => c.status === 'BOOKED');
  const waiting = candidates.filter((c) => c.status === 'AWAITING_APPROVAL').sort((a, b) => lastEventAt(a).localeCompare(lastEventAt(b)));
  const splits = scored.filter((c) => panelSpread(c.evaluation) >= PANEL_SPLIT);

  const kpis = [
    { label: 'Applicants', value: candidates.length, note: `across ${roles.length} ${roles.length === 1 ? 'role' : 'roles'}` },
    { label: 'Screened', value: screened.length, note: `${pct(screened.length, candidates.length)}% of applicants` },
    { label: 'Advance rate', value: `${pct(advanced.length, scored.length)}%`, note: `${advanced.length} of ${scored.length} scored` },
    { label: 'Needs you', value: waiting.length, note: waiting[0] ? `oldest waiting ${ago(lastEventAt(waiting[0]))}` : 'all clear', hot: waiting.length > 0 },
  ];

  const funnel = [
    { label: 'Applied', n: candidates.length },
    { label: 'Researched', n: researched.length },
    { label: 'Screened', n: screened.length },
    { label: 'Advanced', n: advanced.length },
    { label: 'Booked', n: booked.length },
  ];
  const top = Math.max(1, funnel[0].n);

  // Rubric strength across the pool: mean score per criterion name.
  const criteria = new Map<string, number[]>();
  scored.forEach((c) => c.evaluation!.criteria.forEach((k) => criteria.set(k.name, [...(criteria.get(k.name) ?? []), k.score])));
  const rubric = [...criteria.entries()].map(([name, xs]) => ({ name, mean: avg(xs) })).sort((a, b) => b.mean - a.mean);

  const roleRows = roles.map((r) => {
    const cs = candidates.filter((c) => c.roleId === r.id);
    const sc = cs.filter((c) => c.evaluation).sort((a, b) => b.evaluation!.overall - a.evaluation!.overall);
    return {
      role: r,
      applicants: cs.length,
      scored: sc,
      advance: sc.filter((c) => c.evaluation!.recommendation === 'PASS').length,
      needs: cs.filter((c) => c.status === 'AWAITING_APPROVAL').length,
      best: sc[0],
    };
  });

  const feed = candidates
    .flatMap((c) => c.events.map((e) => ({ ...e, who: c.name })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  return (
    <div className="overview">
      <div className="pipeline">
        {kpis.map((k) => (
          <div key={k.label} className={`pipe${k.hot ? ' hot' : ''}`}>
            <span className="pipe-label">
              {k.hot && <i aria-hidden="true" />}
              {k.label}
            </span>
            <span className="pipe-value">{k.value}</span>
            <span className="pipe-note">{k.note}</span>
          </div>
        ))}
      </div>

      {children /* the calendar and upcoming events sit between the KPIs and the analytics */}

      <div className="ov-grid">
        <Section title="Funnel" note="all roles">
          <ol className="funnel">
            {funnel.map((s, i) => (
              <li key={s.label}>
                <span className="f-label">{s.label}</span>
                <span className="f-track">
                  <span className="f-bar" style={{ width: `${(s.n / top) * 100}%` }} />
                </span>
                <span className="f-n">{s.n}</span>
                <span className="f-conv">{i === 0 ? '' : `${pct(s.n, funnel[i - 1].n)}%`}</span>
              </li>
            ))}
          </ol>
          <p className="ov-foot">Percent is the share kept from the step before.</p>
        </Section>

        <Section title="Waiting on you" note={waiting.length ? `${waiting.length} open` : undefined}>
          {waiting.length === 0 ? (
            <p className="ov-empty">Nothing needs a decision.</p>
          ) : (
            <ul className="queue">
              {waiting.map((c) => (
                <li key={c.id}>
                  <Link to={`/founder/candidates/${c.id}`}>
                    <Avatar id={c.id} name={c.name} size={30} />
                    <span className="q-who">
                      <strong>{c.name}</strong>
                      <small>
                        {c.approval ? 'Intro drafted, needs Approve' : 'Panel result needs your read'}
                        {panelSpread(c.evaluation) >= PANEL_SPLIT ? ' · panel split' : ''}
                      </small>
                    </span>
                    <span className="q-age" title="Waiting since Donna's last step">
                      {ago(lastEventAt(c))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Scores by role" note="0–10, one dot per candidate" className="ov-wide">
          <div className="strips">
            {roleRows.map((r) => (
              <div key={r.role.id} className="strip-row">
                <button className="strip-name" onClick={() => onOpenRole(r.role.id)}>
                  {r.role.title}
                  <small>{r.scored.length} scored</small>
                </button>
                <div className="strip">
                  <span className="strip-line" />
                  {r.scored.map((c) => (
                    <Dot
                      key={c.id}
                      value={c.evaluation!.overall}
                      label={c.name}
                      detail={`${c.evaluation!.overall.toFixed(1)} · ${recLabel(c.evaluation!.recommendation)}`}
                      hot={c.status === 'AWAITING_APPROVAL'}
                      to={`/founder/candidates/${c.id}`}
                    />
                  ))}
                  {r.scored.length === 0 && <span className="strip-empty">No screens yet</span>}
                </div>
              </div>
            ))}
            <div className="strip-row">
              <span />
              <Axis />
            </div>
          </div>
          <p className="ov-legend">
            <i className="lg-dot" /> candidate <i className="lg-dot hot" /> needs you
          </p>
        </Section>

        <Section title="Panel calibration" note={`${splits.length} of ${scored.length} calls split`} className="ov-wide">
          <div className="strips">
            {PERSONAS.map((p) => {
              const marks = scored
                .map((c) => ({ c, s: c.evaluation!.personas.find((x) => x.name === p)?.score }))
                .filter((m): m is { c: UICandidate; s: number } => m.s !== undefined);
              const mean = avg(marks.map((m) => m.s));
              return (
                <div key={p} className="strip-row">
                  <span className="strip-name static">
                    {p}
                    <small>avg {mean.toFixed(1)}</small>
                  </span>
                  <div className="strip">
                    <span className="strip-line" />
                    {marks.length > 0 && <span className="mean" style={{ left: `${mean * 10}%` }} title={`Average ${mean.toFixed(1)}`} />}
                    {marks.map(({ c, s }) => (
                      <Dot key={c.id} value={s} label={`${first(c.name)} · ${p}`} detail={`gave ${s}`} />
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="strip-row">
              <span />
              <Axis />
            </div>
          </div>
          <p className="ov-legend">
            <i className="lg-dot" /> one score <i className="lg-mean" /> that judge's average
          </p>
          <p className="ov-foot">A judge sitting far left of the others is the harsh one.</p>
        </Section>

        <Section title="Rubric across the pool" note="mean of scored calls">
          <ul className="meters">
            {rubric.map((r) => (
              <li key={r.name}>
                <span className="m-name">{r.name}</span>
                <span className="m-track">
                  <span className="m-bar" style={{ width: `${r.mean * 10}%` }} />
                </span>
                <span className="m-val">{r.mean.toFixed(1)}</span>
              </li>
            ))}
          </ul>
          <p className="ov-foot">The lowest bar is where to probe harder on the next screens.</p>
        </Section>

        <Section title="Recent activity">
          <ol className="feed">
            {feed.map((e) => (
              <li key={e.id}>
                <span className="feed-who">{e.who}</span>
                <span className="feed-what">{e.detail}</span>
                <time>{ago(e.at)}</time>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Roles" className="ov-wide ov-flush">
          <div role="table" aria-label="Roles">
            <div className="rr th" role="row">
              <span>Role</span>
              <span className="num">Applicants</span>
              <span className="num">Scored</span>
              <span className="num">Advance</span>
              <span>Top candidate</span>
              <span className="num">Needs you</span>
            </div>
            {roleRows.map((r) => (
              <button key={r.role.id} className="rr" role="row" onClick={() => onOpenRole(r.role.id)}>
                <span className="rr-role">
                  {r.role.title}
                  {!r.role.isOfficialPosting && <span className="tab-note">demo</span>}
                </span>
                <span className="num">{r.applicants}</span>
                <span className="num">{r.scored.length}</span>
                <span className="num">{r.advance}</span>
                <span className="rr-top">
                  {r.best ? (
                    <>
                      {r.best.name} <RecBadge rec={r.best.evaluation?.recommendation} />
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </span>
                <span className={`num${r.needs ? ' accent' : ''}`}>{r.needs || '—'}</span>
              </button>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
