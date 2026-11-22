import { Link, useNavigate, useSearchParams } from 'react-router';
import { fmtDuration, panelSpread, PANEL_SPLIT, useCandidates, useRoles, type UICandidate } from '../dev/uiApi';
import { RecBadge, StatusDot } from '../components/ui';
import { Shell } from '../components/Shell';
import { FounderLayout, initials } from './FounderSidebar';
import { Overview } from './Overview';
import { AskDonna } from './AskDonna';
import { Schedule } from './Schedule';
import { HiringPrefsPanel } from './HiringPrefsPanel';
import { isDefault, MUST_HAVE_MIN, prefsContext, rankByFit, useHiringPrefs } from './hiringPrefs';

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
  const roles = useRoles();
  const all = useCandidates();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // No ?role= means the overview across every role at the company.
  const role = roles.find((r) => r.id === params.get('role'));
  const overview = !role;
  const scheduleTab = overview && params.get('view') === 'overview';
  const company = role?.companyName ?? roles[0]?.companyName;
  const companyRoles = roles.filter((r) => r.companyName === company);
  const companyIds = new Set(companyRoles.map((r) => r.id));
  const inCompany = all.filter((c) => companyIds.has(c.roleId));
  const founder = (role ?? companyRoles[0])?.founderName.split(' ')[0];

  const [prefs, setPrefs] = useHiringPrefs(role?.id);
  const tuned = !isDefault(prefs);
  const ranked = rankByFit(
    inCompany.filter((c) => c.roleId === role?.id),
    prefs,
  );
  const list = ranked.map((r) => r.c);

  const screened = list.filter((c) => c.durationSecs);
  const durations = screened.map((c) => c.durationSecs!).sort((a, b) => a - b);
  const median = durations.length ? durations[Math.floor(durations.length / 2)] : 0;
  const needsRole = list.filter((c) => c.status === 'AWAITING_APPROVAL').length;
  const needsAll = inCompany.filter((c) => c.status === 'AWAITING_APPROVAL').length;

  const strip = [
    { label: 'Screened', value: String(screened.length), note: 'calls with a panel score' },
    { label: 'Needs you', value: String(needsRole), note: 'approve or decide', hot: needsRole > 0 },
    { label: 'Booked', value: String(list.filter((c) => c.status === 'BOOKED').length), note: 'intros on your calendar' },
    { label: 'Median call', value: median ? fmtDuration(median) : '—', note: 'voice screen length' },
  ];

  return (
    <FounderLayout roles={roles} role={role} candidates={all}>
      <div className="dash">
        <div className="dash-main">
          <header className="dash-head">
            <div>
              <h1 className="dash-title">
                {greeting()}
                {founder ? `, ${founder}` : ''}
              </h1>
              <p className="dash-sub">
                {scheduleTab ? `Overview · ${company ?? 'your company'}` : overview ? `All roles at ${company ?? 'your company'}` : role.title}
                <span aria-hidden="true">·</span>
                {needsAll ? `${needsAll} ${needsAll === 1 ? 'person needs' : 'people need'} you today` : 'Nothing waiting on you'}
              </p>
            </div>
            <Link to="/apply" className="btn">
              Share screen link
            </Link>
          </header>

          {scheduleTab ? (
            <Schedule candidates={inCompany} roles={companyRoles} />
          ) : overview ? (
            <Overview candidates={inCompany} roles={companyRoles} onOpenRole={(id) => navigate(`/founder?role=${id}`)} />
          ) : (
            <>
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

              <HiringPrefsPanel role={role} prefs={prefs} onChange={setPrefs} />

              <section className="ranked">
                <header className="ranked-head">
                  <h2>
                    {role.title} · {tuned ? 'ranked by your preferences' : 'ranked'}
                    {!role.isOfficialPosting && <span className="tab-note">general interest, not an official posting</span>}
                  </h2>
                  <span className="rubric-chips">
                    {role.rubric.map((r) => (
                      <span key={r}>{r}</span>
                    ))}
                    {role.sourceUrl && (
                      <a className="dash-link" href={role.sourceUrl} target="_blank" rel="noreferrer">
                        posting ↗
                      </a>
                    )}
                  </span>
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
                      <span className="num">{tuned ? 'Fit' : 'Score'}</span>
                      <span>Status</span>
                    </div>
                    {ranked.map(({ c, fit }, i) => {
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
                            {tuned && fit?.missed.length ? (
                              <span className="prefs-chip miss" title={`Under ${MUST_HAVE_MIN}/10 on: ${fit.missed.join(', ')}`}>
                                missed must-have
                              </span>
                            ) : tuned && fit?.aboveBar ? (
                              <span className="prefs-chip ok">above bar</span>
                            ) : null}
                          </span>
                          <PanelBars c={c} />
                          <span className="num score" title={tuned && c.evaluation ? `Panel overall ${c.evaluation.overall.toFixed(1)}` : undefined}>
                            {fit ? (tuned ? fit.score : c.evaluation!.overall).toFixed(1) : '—'}
                          </span>
                          <span>
                            <StatusDot status={c.status} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          <p className="fineprint">Unofficial hackathon demo. This is not an application to the company.</p>
        </div>

        <AskDonna
          candidates={overview ? inCompany : list}
          role={role}
          founderName={founder ?? 'there'}
          preferences={role ? prefsContext(prefs, role) : ''}
        />
      </div>
    </FounderLayout>
  );
}
