import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Role } from '../server/contracts';
import { panelSpread, PANEL_SPLIT, type UICandidate } from '../dev/uiApi';

// One line per candidate thread, in the founder's words.
export function threadStatus(c: UICandidate): { text: string; tone: 'pass' | 'maybe' | 'muted' | 'accent' } {
  if (c.approval?.status === 'APPROVED' || c.status === 'BOOKED') return { text: 'Interview booked', tone: 'pass' };
  if (c.status === 'REJECTED') return { text: 'Closed', tone: 'muted' };
  if (c.evaluation && panelSpread(c.evaluation) >= PANEL_SPLIT) return { text: 'Panel split · needs you', tone: 'maybe' };
  if (c.status === 'AWAITING_APPROVAL') return { text: c.approval ? 'Waiting on your approval' : 'Ready to book', tone: 'accent' };
  if (c.status === 'CALLING') return { text: 'On a call now', tone: 'muted' };
  if (c.status === 'EVALUATING') return { text: 'Panel reviewing', tone: 'muted' };
  if (c.status === 'RESEARCHING' || c.status === 'APPLIED') return { text: 'Researching', tone: 'muted' };
  return { text: 'Ready to call', tone: 'muted' };
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function FounderLayout({
  roles,
  role,
  candidates,
  activeId,
  children,
}: {
  roles: Role[];
  role: Role | undefined;
  candidates: UICandidate[];
  activeId?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const companies = [...new Set(roles.map((r) => r.companyName))];
  const company = role?.companyName ?? companies[0];
  const companyRoles = roles.filter((r) => r.companyName === company);
  const companyIds = new Set(companyRoles.map((r) => r.id));
  // With no role picked (the All roles overview), list every thread at the company.
  const threads = candidates
    .filter((c) => (role ? c.roleId === role.id : companyIds.has(c.roleId)))
    .sort((a, b) => (b.evaluation?.overall ?? -1) - (a.evaluation?.overall ?? -1));

  return (
    <div className="founder-layout">
      <aside className="sidebar" aria-label="Roles and candidates">
        <label className="side-block">
          <span className="side-label">Company</span>
          <span className="company-pick">
            <span className="avatar sm" aria-hidden="true">{company?.[0] ?? '·'}</span>
            <select
              className="company-select"
              value={company}
              onChange={(e) => {
                const first = roles.find((r) => r.companyName === e.target.value);
                if (first) navigate(`/founder?role=${first.id}`);
              }}
            >
              {companies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </span>
        </label>

        <nav className="side-block" aria-label="Roles">
          <span className="side-label">Roles</span>
          <Link to="/founder" className={`side-item ${!role && !activeId ? 'on' : ''}`}>
            <span className="side-item-text">All roles</span>
            <span className="side-count">{candidates.filter((c) => companyIds.has(c.roleId)).length}</span>
          </Link>
          {companyRoles.map((r) => {
            const n = candidates.filter((c) => c.roleId === r.id).length;
            return (
              <Link key={r.id} to={`/founder?role=${r.id}`} className={`side-item ${r.id === role?.id && !activeId ? 'on' : ''}`}>
                <span className="side-item-text">{r.title}</span>
                <span className="side-count">{n}</span>
              </Link>
            );
          })}
        </nav>

        <nav className="side-block side-threads" aria-label="Candidate threads">
          <span className="side-label">Candidate threads</span>
          {threads.length === 0 && <span className="side-empty">No screens yet</span>}
          {threads.map((c) => {
            const s = threadStatus(c);
            return (
              <Link key={c.id} to={`/founder/candidates/${c.id}`} className={`side-item side-thread ${c.id === activeId ? 'on' : ''}`}>
                <span className="side-item-text">
                  <strong>{c.name}</strong>
                  <small className={`tone-${s.tone}`}>{s.text}</small>
                </span>
              </Link>
            );
          })}
        </nav>

        {(role ?? companyRoles[0]) && (
          <div className="side-foot">
            <span className="avatar" aria-hidden="true">{initials((role ?? companyRoles[0])!.founderName)}</span>
            <span className="side-item-text">
              <strong>{(role ?? companyRoles[0])!.founderName}</strong>
              <small>Founder, {(role ?? companyRoles[0])!.companyName}</small>
            </span>
          </div>
        )}
      </aside>
      <div className="founder-main">{children}</div>
    </div>
  );
}
