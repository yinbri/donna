import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fmtDuration, listRoles, panelSpread, PANEL_SPLIT, resetDemo, useCandidates } from '../lib/api';
import type { UICandidate } from '../lib/types';
import { RecBadge, StatusDot } from '../components/ui';
import { AskDonna } from './AskDonna';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

/** Three thin bars, one per panel persona, so a split is visible before you open the candidate. */
function PanelBars({ c }: { c: UICandidate }) {
  if (!c.evaluation) return <span className="muted">—</span>;
  return (
    <span className="panel-bars" title={c.evaluation.personas.map((p) => `${p.name}: ${p.score}`).join('\n')}>
      {c.evaluation.personas.map((p) => (
        <i key={p.name} style={{ height: `${Math.max(12, p.score * 10)}%` }} />
      ))}
    </span>
  );
}

export function FounderHome() {
  const roles = listRoles();
  const companies = useMemo(() => [...new Set(roles.map((r) => r.companyName))], [roles]);
  const [company, setCompany] = useState(companies[0]);
  const companyRoles = roles.filter((r) => r.companyName === company);
  const [roleId, setRoleId] = useState<string | undefined>(companyRoles[0]?.id);
  const all = useCandidates();
  const navigate = useNavigate();

  const role = roles.find((r) => r.id === roleId) ?? companyRoles[0];
  const list = all
    .filter((c) => c.roleId === role?.id)
    .sort((a, b) => (b.evaluation?.overall ?? -1) - (a.evaluation?.overall ?? -1));

  const screened = list.filter((c) => c.durationSecs);
  const durations = screened.map((c) => c.durationSecs!).sort((a, b) => a - b);
  const median = durations.length ? durations[Math.floor(durations.length / 2)] : 0;
  const needsYou = list.filter((c) => c.status === 'AWAITING_APPROVAL').length;
  const booked = list.filter((c) => c.status === 'BOOKED').length;
  const founder = role?.founderName ?? 'there';

  const strip = [
    { label: 'Screened', value: String(screened.length), note: 'calls with a panel score' },
    { label: 'Needs you', value: String(needsYou), note: 'approve or decide', hot: needsYou > 0 },
    { label: 'Booked', value: String(booked), note: 'intros on your calendar' },
    { label: 'Median call', value: median ? fmtDuration(median) : '—', note: 'voice screen length' },
  ];

  return (
    <div className="dash">
      <div className="dash-main">
        <header className="dash-head">
          <div>
            <h1 className="dash-title">
              {greeting()}, {founder}
            </h1>
            <p className="dash-sub">
              <select
                className="company-select"
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  setRoleId(roles.find((r) => r.companyName === e.target.value)?.id);
                }}
                aria-label="Company"
              >
                {companies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <span aria-hidden="true">·</span>
              {needsYou ? `${needsYou} ${needsYou === 1 ? 'person needs' : 'people need'} you today` : 'Nothing waiting on you'}
            </p>
          </div>
          <Link to="/apply" className="btn">
            Share screen link
          </Link>
        </header>

        <div className="pipeline">
          {strip.map((s) => (
            <div key={s.label} className={`pipe${s.hot ? ' hot' : ''}`}>
              <span className="pipe-label">
                {s.hot && <i aria-hidden="true" />}
                {s.label}
              </span>
              <span className="pipe-value">{s.value}</span>
              <span className="pipe-note">{s.note}</span>
            </div>
          ))}
        </div>

        <div className="dash-bar">
          <div className="seg" role="tablist" aria-label="Roles">
            {companyRoles.map((r) => (
              <button key={r.id} role="tab" aria-selected={r.id === role?.id} className={r.id === role?.id ? 'on' : ''} onClick={() => setRoleId(r.id)}>
                {r.title}
                {!r.isOfficialPosting && <span className="tab-note">demo</span>}
              </button>
            ))}
          </div>
          {role?.sourceUrl && (
            <a className="dash-link" href={role.sourceUrl} target="_blank" rel="noreferrer">
              Job posting ↗
            </a>
          )}
        </div>

        <section className="ranked">
          <header className="ranked-head">
            <h2>{role?.title ?? 'Candidates'} · ranked</h2>
            {role && (
              <span className="rubric-chips">
                {role.rubric.map((r) => (
                  <span key={r}>{r}</span>
                ))}
              </span>
            )}
          </header>
          {list.length === 0 ? (
            <div className="empty">
              <p>No one has screened for this role yet.</p>
              <Link to="/apply" className="btn">
                Share the screen link
              </Link>
            </div>
          ) : (
            <div role="table" aria-label="Ranked candidates">
              <div className="rk th" role="row">
                <span>#</span>
                <span>Candidate</span>
                <span>Donna says</span>
                <span>Panel</span>
                <span className="num">Score</span>
                <span>Status</span>
              </div>
              {list.map((c, i) => {
                const split = panelSpread(c.evaluation) >= PANEL_SPLIT;
                return (
                  <button key={c.id} className="rk" role="row" onClick={() => navigate(`/founder/candidates/${c.id}`)}>
                    <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                    <span className="who">
                      <span className="avatar" aria-hidden="true">
                        {initials(c.name)}
                      </span>
                      <span className="who-text">
                        <strong>{c.name}</strong>
                        <small>{c.dossier?.topProject ?? c.email}</small>
                      </span>
                    </span>
                    <span className="says">
                      <RecBadge rec={c.evaluation?.recommendation} />
                      {split && <span className="split">split</span>}
                    </span>
                    <PanelBars c={c} />
                    <span className="num score">{c.evaluation ? c.evaluation.overall.toFixed(1) : '—'}</span>
                    <span>
                      <StatusDot status={c.status} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <p className="fineprint">
          Sandbox data from <code>fixtures/</code>.{' '}
          <button className="linkish" onClick={resetDemo}>
            Reset demo data
          </button>
        </p>
      </div>

      <AskDonna candidates={list} role={role} founderName={founder} />
    </div>
  );
}
