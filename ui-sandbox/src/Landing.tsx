import { Link } from 'react-router-dom';
import { DotOrb } from './components/DotOrb';

export function Landing() {
  return (
    <div className="landing">
      <div className="landing-orb">
        <DotOrb size={260} />
      </div>
      <p className="eyebrow backers">
        <span>Recruiting coordinator for founders from</span>
        <span className="backer-row">
          <span className="backer backer-yc" title="Y Combinator">
            <span className="yc-box" aria-label="Y Combinator">Y</span>
          </span>
          <span className="backer backer-a16z" title="Andreessen Horowitz">a16z</span>
          <span className="backer backer-sequoia" title="Sequoia">SEQUOIA</span>
          <span className="backer backer-techstars" title="Techstars">techstars_</span>
          <span className="backer backer-spc" title="South Park Commons">South Park Commons</span>
        </span>
      </p>
      <h1 className="display">
        A recruiter you can
        <br />
        <em>check in 12 seconds.</em>
      </h1>
      <p className="lede">
        Donna researches every applicant, runs a short voice screen, and has a three-person panel grade the call.
        Every score plays the moment that earned it. Nothing reaches your calendar until you say so.
      </p>
      <div className="landing-actions">
        <Link to="/apply" className="btn btn-primary">
          Take a screen
        </Link>
        <Link to="/founder" className="btn">
          Open founder view
        </Link>
      </div>
      <p className="fineprint">Unofficial hackathon demo. This is not an application to any company.</p>
    </div>
  );
}
