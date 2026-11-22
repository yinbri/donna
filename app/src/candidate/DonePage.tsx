import { Link, useParams } from 'react-router';
import { fmtDuration, useCandidate } from '../dev/uiApi';
import { Shell } from '../components/Shell';
import { DotOrb } from '../components/DotOrb';
import { Steps } from './Steps';

export function DoneRoute() {
  return (
    <Shell>
      <DonePage />
    </Shell>
  );
}

export function DonePage() {
  const { id } = useParams();
  const c = useCandidate(id);
  if (!c) return null;
  const role = c.role;
  const f = c.evaluation?.feedback;

  return (
    <div className="narrow center">
      <Steps at={3} />
      <DotOrb size={140} />
      <h1 className="title">Thanks, {c.name.split(' ')[0]}.</h1>
      <p className="muted">
        Donna passed her notes to {role.founderName} at {role.companyName}. If they want to meet, you'll get a calendar
        invite. Nothing is sent without their approval.
      </p>

      {c.durationSecs ? (
        <div className="screen-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
          </svg>
          <span>
            <strong>Voice screen · {fmtDuration(c.durationSecs)}</strong>
            <small>
              Sent to {role.founderName} at {role.companyName}
            </small>
          </span>
        </div>
      ) : null}

      {f ? (
        <div className="feedback">
          <div>
            <span className="label">What came through</span>
            <ul>
              {f.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="label">One thing to sharpen</span>
            <p>{f.sharpen}</p>
          </div>
        </div>
      ) : (
        <p className="muted">Your feedback is on its way…</p>
      )}

      <p className="fineprint">No score is shown to candidates. Unofficial hackathon demo.</p>
      <div className="row gap">
        <Link to="/" className="btn btn-primary">Done</Link>
        <Link to={`/founder/candidates/${c.id}`} className="btn btn-ghost">See the founder view →</Link>
      </div>
    </div>
  );
}
