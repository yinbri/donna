import { Link, useNavigate, useSearchParams } from 'react-router';
import { fmtDuration, panelSpread, PANEL_SPLIT, useCandidates, useRoles } from '../dev/uiApi';
import { RecBadge, StatusDot } from '../components/ui';
import { Shell } from '../components/Shell';
import { FounderLayout } from './FounderSidebar';

export function FounderRoute() {
  return (
    <Shell>
      <FounderHome />
    </Shell>
  );
}

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function FounderHome() {
  const roles = useRoles();
  const all = useCandidates();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = roles.find((r) => r.id === params.get('role')) ?? roles[0];

  const list = all
    .filter((c) => c.roleId === role?.id)
    .sort((a, b) => (b.evaluation?.overall ?? -1) - (a.evaluation?.overall ?? -1));

  // Finished calls today (durationSecs is set by finalizeScreen; the seeded fixture has one too).
  const screened = all.filter((c) => c.durationSecs && isToday(c.createdAt));
  const durations = screened.map((c) => c.durationSecs!).sort((a, b) => a - b);
  const median = durations.length ? durations[Math.floor(durations.length / 2)] : 0;
  const needsYou = list.filter((c) => c.status === 'AWAITING_APPROVAL').length;

  return (
    <FounderLayout roles={roles} role={role} candidates={all}>
      <header className="founder-head">
        <h1 className="title">
          {greeting()}
          {role ? `, ${role.founderName.split(' ')[0]}` : ''}
        </h1>
        <p className="muted founder-stats">
          <strong>{screened.length}</strong> screens today · median <strong>{median ? fmtDuration(median) : '—'}</strong> ·{' '}
          <strong className={needsYou ? 'accent' : ''}>{needsYou}</strong> need you
        </p>
      </header>

      {role && (
        <p className="rubric">
          <span className="label">Rubric</span> {role.rubric.join(' · ')}
          {!role.isOfficialPosting && <span className="tab-note">general interest, not an official posting</span>}
          {role.sourceUrl && (
            <a href={role.sourceUrl} target="_blank" rel="noreferrer">
              posting ↗
            </a>
          )}
        </p>
      )}

      <section className="card ranked">
        <header className="card-head">
          <h2 className="label">{role ? `${role.title} · ranked` : 'Candidates'}</h2>
          <span className="mono-label">Scored by the 3-persona panel</span>
        </header>
        {list.length === 0 ? (
          <div className="empty">
            <p>No one has screened for this role yet.</p>
            <Link to="/apply" className="btn">Share the screen link</Link>
          </div>
        ) : (
          <div className="table" role="table">
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
      </section>

      <p className="fineprint">Unofficial hackathon demo. This is not an application to the company.</p>
    </FounderLayout>
  );
}
