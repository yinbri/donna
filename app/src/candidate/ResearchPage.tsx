import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { research, useCandidate, useIntegrationStatus } from '../dev/uiApi';
import { Shell } from '../components/Shell';
import { DotOrb } from '../components/DotOrb';
import { Stub } from '../components/ui';
import { Steps } from './Steps';

type StepKey = 'fiber' | 'github' | 'ploid' | 'questions';
type StepState = 'wait' | 'run' | 'ok' | 'skip';
const LABELS: Record<StepKey, string> = {
  fiber: 'Looking up your work history (Fiber AI)',
  github: 'Reading your GitHub',
  ploid: 'Cross-checking your public profile (Ploid)',
  questions: 'Writing questions about what you built',
};

export function ResearchRoute() {
  return (
    <Shell>
      <ResearchPage />
    </Shell>
  );
}

export function ResearchPage() {
  const { id } = useParams();
  const c = useCandidate(id);
  const live = useIntegrationStatus();
  const [failed, setFailed] = useState<string | null>(null);
  const navigate = useNavigate();
  const [steps, setSteps] = useState<Record<StepKey, StepState>>({ fiber: 'wait', github: 'wait', ploid: 'wait', questions: 'wait' });
  const started = useRef(false);

  useEffect(() => {
    if (!id || started.current) return;
    started.current = true;
    const next = () => setTimeout(() => navigate(`/apply/${id}/call${location.search}`), 900);
    research(id, (s, st) => setSteps((p) => ({ ...p, [s]: st })))
      .then(next)
      .catch((err) => {
        // Research failing is not fatal: Donna falls back to the role's questions.
        console.error(err);
        setFailed(err instanceof Error ? err.message : String(err));
        setTimeout(() => navigate(`/apply/${id}/call${location.search}`), 2500);
      });
  }, [id, navigate]);

  return (
    <div className="narrow center">
      <Steps at={1} />
      <DotOrb size={180} active getLevel={() => 0.25} />
      <h1 className="title">Researching you{c ? `, ${c.name.split(' ')[0]}` : ''}</h1>
      {c && (
        <div className="thread narrow-thread">
          <p className="user-msg">
            {[c.name, c.githubUser && `github.com/${c.githubUser}`, c.linkedinUrl && 'LinkedIn', `${c.role.title} at ${c.role.companyName}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="donna-msg">
            Thanks, {c.name.split(' ')[0]}. I'm looking at your public work so I can ask about things you actually built.
          </p>
        </div>
      )}
      <section className="research-card" aria-label="Research steps">
        <div className="research-card-head">
          {Object.values(steps).every((s) => s === 'ok' || s === 'skip') ? 'Research done' : 'Researching you'}
        </div>
        <ul className="research-steps">
          {(Object.keys(LABELS) as StepKey[]).map((k) => (
            <li key={k} className={`rs rs-${steps[k]}`}>
              <i>{steps[k] === 'ok' ? '✓' : steps[k] === 'skip' ? '–' : ''}</i>
              {LABELS[k]}
              {steps[k] === 'skip' && <span className="muted"> · skipped</span>}
            </li>
          ))}
        </ul>
      </section>
      <p className="fineprint">I only look up what you typed. Nothing is shared outside this screen.</p>
      {failed && <p className="muted" role="status">Couldn't finish the lookup, so Donna will use the role's standard questions.</p>}
      {live && !live.box && <p className="fineprint"><Stub>fixture research</Stub> Real lookups land with the Donna box.</p>}
    </div>
  );
}
