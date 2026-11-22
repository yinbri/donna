import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { research, STUBS, useCandidate } from '../lib/api';
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

export function ResearchPage() {
  const { id } = useParams();
  const c = useCandidate(id);
  const navigate = useNavigate();
  const [steps, setSteps] = useState<Record<StepKey, StepState>>({ fiber: 'wait', github: 'wait', ploid: 'wait', questions: 'wait' });
  const started = useRef(false);

  useEffect(() => {
    if (!id || started.current) return;
    started.current = true;
    research(id, (s, st) => setSteps((p) => ({ ...p, [s]: st }))).then(() => {
      setTimeout(() => navigate(`/apply/${id}/call${location.search}`), 900);
    });
  }, [id, navigate]);

  return (
    <div className="narrow center">
      <Steps at={1} />
      <DotOrb size={180} active getLevel={() => 0.25} />
      <h1 className="title">Researching you{c ? `, ${c.name.split(' ')[0]}` : ''}</h1>
      <p className="muted">Only using what you entered. This takes a few seconds.</p>
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
      {STUBS.research && <p className="fineprint"><Stub>fixture research</Stub> Real lookups land with the Donna box.</p>}
    </div>
  );
}
