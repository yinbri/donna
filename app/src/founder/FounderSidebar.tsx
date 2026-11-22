import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { BrandMark, useTheme } from '../components/Shell';
import { Avatar, founderAvatarId } from './Avatar';
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

/* 16px line icons, one stroke weight, so the rail reads like Claude / ChatGPT / Notion. */
const ICONS = {
  overview: 'M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z',
  link: 'M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1',
  candidate: 'M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3.5 17a6.5 6.5 0 0 1 13 0',
  rail: 'M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 14.5zM8 3v14',
  chevrons: 'm7 7.5 3-3 3 3M7 12.5l3 3 3-3',
  sun: 'M10 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM10 1.5v1.5M10 17v1.5M3.99 3.99l1.06 1.06M14.95 14.95l1.06 1.06M1.5 10H3M17 10h1.5M3.99 16.01l1.06-1.06M14.95 5.05l1.06-1.06',
  moon: 'M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7z',
} as const;

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="rail-icon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const COLLAPSE_KEY = 'donna.rail.collapsed';
function useCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);
  return [collapsed, () => setCollapsed((c) => !c)];
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
  const { theme, toggle } = useTheme();
  const [collapsed, toggleCollapsed] = useCollapsed();
  // One Overview page: KPIs, calendar and the all-roles analytics. Old ?view=overview links land here too.
  const onOverview = !role && !activeId;
  const companies = [...new Set(roles.map((r) => r.companyName))];
  const company = role?.companyName ?? companies[0];
  const companyRoles = roles.filter((r) => r.companyName === company);
  const companyIds = new Set(companyRoles.map((r) => r.id));
  const founder = role ?? companyRoles[0];
  // With no role picked, list every thread at the company.
  const threads = candidates
    .filter((c) => (role ? c.roleId === role.id : companyIds.has(c.roleId)))
    .sort((a, b) => (b.evaluation?.overall ?? -1) - (a.evaluation?.overall ?? -1));

  return (
    <div className={`founder-layout${collapsed ? ' collapsed' : ''}`}>
      <aside className="rail" aria-label="Founder navigation">
        <div className="rail-top">
          <Link to="/" className="rail-brand" aria-label="Donna home">
            <BrandMark />
            <span className="rail-hide">Donna</span>
          </Link>
          <button className="rail-btn" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <Icon name="rail" />
          </button>
        </div>

        <label className="rail-company" title={company}>
          <span className="rail-avatar" aria-hidden="true">{company?.[0] ?? '·'}</span>
          <select
            className="rail-company-select rail-hide"
            value={company}
            aria-label="Company"
            onChange={(e) => {
              const first = roles.find((r) => r.companyName === e.target.value);
              if (first) navigate(`/founder?role=${first.id}`);
            }}
          >
            {companies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <span className="rail-hide rail-chev" aria-hidden="true">
            <Icon name="chevrons" />
          </span>
        </label>

        <nav className="rail-nav" aria-label="Views">
          <Link to="/founder" className={`rail-item${onOverview ? ' on' : ''}`} aria-current={onOverview ? 'page' : undefined} title="Overview">
            <Icon name="overview" />
            <span className="rail-hide">Overview</span>
            <span className="rail-count rail-hide">{candidates.filter((c) => companyIds.has(c.roleId)).length}</span>
          </Link>
          <NavLink to="/apply" className="rail-item" title="Share screen link">
            <Icon name="link" />
            <span className="rail-hide">Share screen link</span>
          </NavLink>
        </nav>

        <div className="rail-scroll rail-hide">
          <nav className="rail-section" aria-label="Roles">
            <span className="rail-label">Roles</span>
            {companyRoles.map((r) => {
              const n = candidates.filter((c) => c.roleId === r.id).length;
              const on = r.id === role?.id && !activeId;
              return (
                <Link key={r.id} to={`/founder?role=${r.id}`} className={`rail-item text${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined}>
                  <span className="rail-text">{r.title}</span>
                  <span className="rail-count">{n}</span>
                </Link>
              );
            })}
          </nav>

          <nav className="rail-section" aria-label="Candidates">
            <span className="rail-label">Candidates</span>
            {threads.length === 0 && <span className="rail-empty">No screens yet</span>}
            {threads.map((c) => {
              const s = threadStatus(c);
              const on = c.id === activeId;
              const hot = s.tone === 'accent' || s.tone === 'maybe';
              return (
                <Link key={c.id} to={`/founder/candidates/${c.id}`} className={`rail-item text${on ? ' on' : ''}${s.tone === 'muted' && s.text === 'Closed' ? ' dim' : ''}`} title={`${c.name} · ${s.text}`} aria-current={on ? 'page' : undefined}>
                  <Avatar id={c.id} name={c.name} size={22} />
                  <span className="rail-text">{c.name}</span>
                  {hot && <i className="rail-dot" aria-label={s.text} />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="rail-foot">
          {founder && (
            <span className="rail-me" title={`${founder.founderName}, founder`}>
              <Avatar id={founderAvatarId(founder.id)} name={founder.founderName} size={30} />
              <span className="rail-me-text rail-hide">
                <strong>{founder.founderName}</strong>
                <small>Founder · {founder.companyName}</small>
              </span>
            </span>
          )}
          <button className="rail-btn" onClick={toggle} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title="Toggle theme">
            <Icon name={theme === 'light' ? 'moon' : 'sun'} />
          </button>
        </div>
      </aside>
      <div className="founder-main">{children}</div>
    </div>
  );
}
