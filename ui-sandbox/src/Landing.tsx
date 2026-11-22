import { Link } from 'react-router-dom';
import { DotOrb } from './components/DotOrb';

// Dusk over layered ridges. Photo by Mohammad Alizade on Unsplash (free license).
const HERO_PHOTO = 'https://images.unsplash.com/photo-1536257104079-aa99c6460a5a?auto=format&fit=crop&w=2400&q=70';
const PHOTO_CREDIT = 'https://unsplash.com/photos/silhouette-photo-of-mountain-during-golden-hour-62t_kKa2YlA';

const FACTS = [
  { value: '3', unit: 'min', label: 'Voice screen, about what they built' },
  { value: '3', unit: 'judges', label: 'Panel scores every call' },
  { value: '12', unit: 's', label: 'To check any score against the tape' },
  { value: '0', unit: '', label: 'Invites sent without your approval' },
];

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
);

function Backers() {
  return (
    <div className="backers">
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
    </div>
  );
}

function Preview() {
  return (
    <div className="hero-preview" aria-label="Example of what a founder sees after a screen">
      <div className="hp-orb">
        <DotOrb size={200} active getLevel={() => 0.3} />
        <span className="hp-caption">Donna is on a call with Sam</span>
      </div>
      <div className="hp-card">
        <div className="hp-head">
          <span>Sam Rivera · Founding Engineer</span>
          <span className="pill pill-pass">Advance</span>
        </div>
        <ul className="hp-scores">
          <li><span>Shipped real systems</span><b>8</b><i className="hp-play">▶ 0:21</i></li>
          <li><span>Depth on own project</span><b>8</b><i className="hp-play">▶ 0:58</i></li>
          <li><span>Communication</span><b>7</b><i className="hp-play">▶ 0:43</i></li>
        </ul>
        <div className="hp-approve">
          <span>Book a 30 min intro on Thu 2:00?</span>
          <span className="hp-btns"><em>Deny</em><strong>Approve</strong></span>
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="landing">
      <section className="hero" style={{ ['--hero-photo' as string]: `url(${HERO_PHOTO})` }}>
        <div className="hero-inner">
          <Backers />
          <h1 className="hero-title">
            A recruiter you can <span>check in 12 seconds.</span>
          </h1>
          <p className="hero-lede">
            Donna researches every applicant, runs a short voice screen, and has a three-person panel grade the call.
            Nothing reaches your calendar until you say so.
          </p>
          <div className="landing-actions">
            <Link to="/apply" className="btn btn-hero">
              Take a screen <span className="btn-arrow"><Arrow /></span>
            </Link>
            <Link to="/founder" className="btn btn-hero-ghost">
              Open founder view
            </Link>
          </div>
          <Preview />
        </div>
      </section>

      <section className="l-section">
        <h2 className="l-title">
          Every score plays <span>the moment that earned it.</span>
        </h2>
        <div className="flow" aria-label="Candidate to Donna to founder">
          <div className="flow-node">
            <div className="flow-vis"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg></div>
            <span>Candidate applies</span>
          </div>
          <i className="flow-line" />
          <div className="flow-node flow-hub">
            <div className="flow-vis"><DotOrb size={132} /></div>
            <span>Donna screens</span>
          </div>
          <i className="flow-line" />
          <div className="flow-node">
            <div className="flow-vis"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" />
            </svg></div>
            <span>You approve</span>
          </div>
        </div>
        <Link to="/founder" className="btn btn-hero">
          See the receipts <span className="btn-arrow"><Arrow /></span>
        </Link>
      </section>

      <section className="facts" aria-label="How Donna works">
        {FACTS.map((f) => (
          <div key={f.label} className="fact">
            <span className="fact-value">
              {f.value}
              <span>{f.unit}</span>
            </span>
            <span className="fact-label">{f.label}</span>
          </div>
        ))}
      </section>

      <footer className="l-foot">
        <p>Unofficial hackathon demo. This is not an application to the company.</p>
        <p>
          Photo by <a href={PHOTO_CREDIT} target="_blank" rel="noreferrer">Mohammad Alizade</a> on Unsplash
        </p>
      </footer>
    </div>
  );
}
