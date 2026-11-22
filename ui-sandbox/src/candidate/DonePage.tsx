import { Link, useParams } from 'react-router-dom';
import { getRole, useCandidate } from '../lib/api';
import { DotOrb } from '../components/DotOrb';
import { Steps } from './Steps';

export function DonePage() {
  const { id } = useParams();
  const c = useCandidate(id);
  if (!c) return null;
  const role = getRole(c.roleId);
  const f = c.evaluation?.feedback;

  return (
    <div className="narrow center">
      <Steps at={3} />
      <DotOrb size={140} />
      <h1 className="title">Thanks, {c.name.split(' ')[0]}.</h1>
      <p className="muted">
        Donna passed her notes to {role?.founderName} at {role?.companyName}. If they want to meet, you'll get a calendar
        invite. Nothing is sent without their approval.
      </p>

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

      <div className="row gap">
        <Link to="/" className="btn">Done</Link>
        <Link to={`/founder/candidates/${c.id}`} className="btn btn-ghost">See the founder view →</Link>
      </div>
    </div>
  );
}
