import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fmtDuration, listRoles, panelSpread, PANEL_SPLIT, resetDemo, useCandidates } from '../lib/api';
import { RecBadge, StatusDot } from '../components/ui';

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

  const screened = all.filter((c) => c.durationSecs);
  const durations = screened.map((c) => c.durationSecs!).sort((a, b) => a - b);
  const median = durations.length ? durations[Math.floor(durations.length / 2)] : 0;
  const needsYou = list.filter((c) => c.status === 'AWAITING_APPROVAL').length;

  return (
    <div className="founder">
      <header className="founder-head">
        <div>
          <p className="eyebrow">Founder view</p>
          <h1 className="title">
            <select className="company-select" value={company} onChange={(e) => {
              setCompany(e.target.value);
              setRoleId(roles.find((r) => r.companyName === e.target.value)?.id);
            }} aria-label="Company">
              {companies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </h1>
        </div>
        <div className="stats">
          <div className="stat">
            <span className="stat-num">{screened.length}</span>
            <span className="label">screens today</span>
          </div>
          <div className="stat">
            <span className="stat-num">{median ? fmtDuration(median) : '—'}</span>
            <span className="label">median length</span>
          </div>
          <div className="stat">
            <span className="stat-num accent">{needsYou}</span>
            <span className="label">need you</span>
          </div>
        </div>
      </header>

      <div className="tabs" role="tablist">
        {companyRoles.map((r) => (
          <button key={r.id} role="tab" aria-selected={r.id === role?.id} className={`tab ${r.id === role?.id ? 'on' : ''}`} onClick={() => setRoleId(r.id)}>
            {r.title}
            {!r.isOfficialPosting && <span className="tab-note">demo</span>}
          </button>
        ))}
      </div>

      {role && (
        <p className="rubric">
          <span className="label">Rubric</span> {role.rubric.join(' · ')}
          {role.sourceUrl && (
            <a href={role.sourceUrl} target="_blank" rel="noreferrer">
              posting ↗
            </a>
          )}
        </p>
      )}

      {list.length === 0 ? (
        <div className="empty">
          <p>No one has screened for this role yet.</p>
          <Link to="/apply" className="btn">Share the screen link</Link>
        </div>
      ) : (
        <div className="table" role="table">
          <div className="tr th" role="row">
            <span>#</span>
            <span>Candidate</span>
            <span>Donna says</span>
            <span className="num">Score</span>
            <span>Status</span>
          </div>
          {list.map((c, i) => {
            const split = panelSpread(c.evaluation) >= PANEL_SPLIT;
            return (
              <button key={c.id} className="tr" role="row" onClick={() => navigate(`/founder/candidates/${c.id}`)}>
                <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                <span className="who">
                  <strong>{c.name}</strong>
                  <small>{c.dossier?.topProject ?? c.email}</small>
                </span>
                <span className="says">
                  <RecBadge rec={c.evaluation?.recommendation} />
                  {split && <span className="split">panel split</span>}
                </span>
                <span className="num score">{c.evaluation ? c.evaluation.overall.toFixed(1) : '—'}</span>
                <span>
                  <StatusDot status={c.status} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="fineprint">
        Sandbox data from <code>fixtures/</code>.{' '}
        <button className="linkish" onClick={resetDemo}>
          Reset demo data
        </button>
      </p>
    </div>
  );
}
