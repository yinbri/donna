import type { ReactNode } from 'react';
import type { CandidateStatus, Recommendation } from '../server/contracts';

export function RecBadge({ rec }: { rec?: Recommendation }) {
  if (!rec) return <span className="pill pill-muted">—</span>;
  const cls = rec === 'PASS' ? 'pill-pass' : rec === 'MAYBE' ? 'pill-maybe' : 'pill-reject';
  const label = rec === 'PASS' ? 'Advance' : rec === 'MAYBE' ? 'Maybe' : 'Pass';
  return <span className={`pill ${cls}`}>{label}</span>;
}

const STATUS_LABEL: Record<CandidateStatus, string> = {
  APPLIED: 'Applied',
  RESEARCHING: 'Researching',
  READY: 'Ready to call',
  CALLING: 'On a call',
  EVALUATING: 'Panel reviewing',
  AWAITING_APPROVAL: 'Needs you',
  BOOKED: 'Interview booked',
  REJECTED: 'Closed',
};

export function StatusDot({ status }: { status: CandidateStatus }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      <i />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Card({ title, aside, children, className = '' }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || aside) && (
        <header className="card-head">
          {title && <h3 className="label">{title}</h3>}
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

export function SourceBadges({ sources }: { sources: { fiber: boolean; ploid: boolean; github: boolean } }) {
  const items: Array<[string, boolean]> = [
    ['Fiber AI', sources.fiber],
    ['GitHub', sources.github],
    ['Ploid', sources.ploid],
  ];
  return (
    <div className="sources">
      {items.map(([n, ok]) => (
        <span key={n} className={`source ${ok ? 'on' : 'off'}`}>
          <i />
          {n}
        </span>
      ))}
    </div>
  );
}

export function Stub({ children = 'fixture' }: { children?: ReactNode }) {
  return <span className="stub" title="This value comes from fixtures until the integration lands">{children}</span>;
}
