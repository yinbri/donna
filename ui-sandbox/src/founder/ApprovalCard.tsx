import { useState } from 'react';
import { attemptWithoutApproval, decide, proposeBooking, STUBS } from '../lib/api';
import type { UICandidate } from '../lib/types';
import { Card, Stub } from '../components/ui';

function fmtSlot(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function ApprovalCard({ candidate: c }: { candidate: UICandidate }) {
  const [busy, setBusy] = useState<null | 'try' | 'approve' | 'reject'>(null);
  const a = c.approval;

  if (!c.evaluation || c.evaluation.recommendation === 'REJECT') return null;

  const run = async (kind: 'try' | 'approve' | 'reject') => {
    setBusy(kind);
    try {
      if (kind === 'try') await attemptWithoutApproval(c.id);
      else await decide(c.id, kind === 'approve');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      title="Interview"
      className={`approval ${a?.status === 'APPROVED' ? 'is-approved' : ''}`}
      aside={STUBS.alter ? <Stub>Alter stubbed</Stub> : <span className="label muted">via Alter</span>}
    >
      {!a && (
        <div className="approval-empty">
          <p>Donna can hold a slot on your calendar and draft the invite. Nothing is sent until you approve.</p>
          <button className="btn btn-primary" onClick={() => proposeBooking(c.id)}>
            Propose interview
          </button>
        </div>
      )}

      {a && (
        <>
          <div className="slot">
            <span className="label">Proposed slot</span>
            <strong>{fmtSlot(a.slotIso)}</strong>
          </div>
          <div className="email">
            <span className="label">Invite to {a.emailDraft.to}</span>
            <p className="email-subject">{a.emailDraft.subject}</p>
            <p className="email-body">{a.emailDraft.body}</p>
          </div>

          {a.deniedAttempt && (
            <div className="denied" role="status">
              <span className="denied-icon">⊘</span>
              <div>
                <strong>Blocked: Donna tried to book without your approval.</strong>
                <p>{a.deniedAttempt.reason}</p>
                <span className="label muted">
                  {new Date(a.deniedAttempt.at).toLocaleTimeString()} {a.deniedAttempt.auditRef ? `· audit ${a.deniedAttempt.auditRef}` : ''}
                </span>
              </div>
            </div>
          )}

          {a.status === 'PENDING' && (
            <div className="approval-actions">
              <button className="btn btn-primary" disabled={!!busy} onClick={() => run('approve')}>
                {busy === 'approve' ? 'Booking…' : 'Approve & send'}
              </button>
              <button className="btn" disabled={!!busy} onClick={() => run('reject')}>
                Reject
              </button>
              <button className="btn btn-ghost" disabled={!!busy || !!a.deniedAttempt} onClick={() => run('try')} title="Make Donna attempt the calendar write with no approval on file">
                {busy === 'try' ? 'Trying…' : 'Try without approval'}
              </button>
            </div>
          )}

          {a.status === 'APPROVED' && (
            <p className="done-line">
              <span className="ok">✓</span> Approved. Invite sent to {a.emailDraft.to}.
            </p>
          )}
          {a.status === 'REJECTED' && <p className="done-line muted">Rejected. Nothing was sent.</p>}
        </>
      )}
    </Card>
  );
}
