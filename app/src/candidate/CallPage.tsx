import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { FIXTURE_CONVERSATION } from '../server/fixtures';
import { finalizeScreen, isStubScreen, startScreen, STUB_CONVERSATION_ID, useCandidate } from '../dev/uiApi';
import type { TranscriptTurn } from '../server/contracts';
import { DotOrb } from '../components/DotOrb';
import { Shell } from '../components/Shell';
import { Stub } from '../components/ui';
import { Steps } from './Steps';

const CAP_SECS = 180;
const FAST_CAP_SECS = 60;

// Only the call page needs the ElevenLabs provider.
export function CallRoute() {
  return (
    <Shell>
      <ConversationProvider>
        <CallPage />
      </ConversationProvider>
    </Shell>
  );
}

function clock(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function CallPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const c = useCandidate(id);
  const navigate = useNavigate();
  const [fast, setFast] = useState(params.get('demo') === '1');
  const [phase, setPhase] = useState<'ready' | 'connecting' | 'live' | 'ending'>('ready');
  const [lines, setLines] = useState<TranscriptTurn[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [simulated, setSimulated] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startAt = useRef(0);
  const linesRef = useRef<TranscriptTurn[]>([]);
  const convId = useRef<string | undefined>(undefined);
  const simTimers = useRef<number[]>([]);
  const simLevel = useRef(0);
  const finished = useRef(false);

  const push = (role: 'agent' | 'user', text: string) => {
    const turn: TranscriptTurn = { i: linesRef.current.length, role, text, t: (Date.now() - startAt.current) / 1000 };
    linesRef.current = [...linesRef.current, turn];
    setLines(linesRef.current);
  };

  // The server fetches the real transcript and audio from ElevenLabs; the live lines are display only.
  const finish = useCallback(async () => {
    if (!id || finished.current) return;
    finished.current = true;
    simTimers.current.forEach(clearTimeout);
    setPhase('ending');
    try {
      await finalizeScreen(id, { conversationId: convId.current });
      navigate(`/apply/${id}/done`);
    } catch (err) {
      console.error('finalizeScreen failed', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [id, navigate]);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      convId.current = conversationId;
    },
    onMessage: (m) => push(m.role === 'user' ? 'user' : 'agent', m.message),
    onDisconnect: () => void finish(),
    onError: (message) => console.error('ElevenLabs error', message),
  });

  const cap = fast ? FAST_CAP_SECS : CAP_SECS;

  const end = () => {
    if (!simulated && conversation.status === 'connected') conversation.endSession();
    else void finish();
  };

  // Elapsed clock + hard cap.
  useEffect(() => {
    if (phase !== 'live') return;
    const t = window.setInterval(() => {
      const s = (Date.now() - startAt.current) / 1000;
      setElapsed(s);
      if (s > cap + 5) end();
    }, 250);
    return () => clearInterval(t);
  });

  useEffect(() => () => simTimers.current.forEach(clearTimeout), []);

  if (!c || !id) return null;
  const role = c.role;

  const simulate = (vars: { candidate_name: string; founder_name: string; company_name: string }) => {
    // Simulated call on the fixture transcript, so the flow works while ElevenLabs is stubbed.
    const turns = FIXTURE_CONVERSATION.transcript;
    const speed = fast ? 0.35 : 0.6;
    turns.forEach((turn) => {
      simTimers.current.push(
        window.setTimeout(() => {
          const text = turn.text
            .replace('Sam', vars.candidate_name.split(' ')[0])
            .replace('Alex at Acme', `${vars.founder_name} at ${vars.company_name}`);
          push(turn.role, text);
          simLevel.current = turn.role === 'agent' ? 0.9 : 0.15;
          simTimers.current.push(window.setTimeout(() => (simLevel.current = 0.05), 1800));
        }, turn.t * 1000 * speed),
      );
    });
    simTimers.current.push(window.setTimeout(() => void finish(), (turns[turns.length - 1].t + 4) * 1000 * speed));
  };

  const begin = async () => {
    setError(null);
    setPhase('connecting');
    finished.current = false;
    linesRef.current = [];
    setLines([]);
    try {
      const s = await startScreen(id, fast);
      if (isStubScreen(s)) {
        setSimulated(true);
        convId.current = STUB_CONVERSATION_ID;
        startAt.current = Date.now();
        setPhase('live');
        simulate(s.dynamicVariables);
        return;
      }
      setSimulated(false);
      await navigator.mediaDevices.getUserMedia({ audio: true });
      // onConnect stores the conversationId that finalizeScreen needs.
      conversation.startSession({
        conversationToken: s.token,
        connectionType: 'webrtc',
        dynamicVariables: s.dynamicVariables,
      });
      startAt.current = Date.now();
      setPhase('live');
    } catch (err) {
      console.error(err);
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Donna needs your microphone. Allow it in the browser and try again.'
          : err instanceof Error
            ? err.message
            : String(err),
      );
      setPhase('ready');
    }
  };

  const getLevel = () =>
    simulated
      ? simLevel.current
      : conversation.isSpeaking
        ? conversation.getOutputVolume() * 3
        : conversation.getInputVolume() * 0.6;
  const last = lines[lines.length - 1];
  const speaking = simulated ? last?.role === 'agent' : conversation.isSpeaking;
  const lastAgent = [...lines].reverse().find((l) => l.role === 'agent');

  // Question progress: agent turns that ask something, after the opening line.
  const total = fast ? 2 : 3;
  const asked = Math.min(total, Math.max(0, lines.filter((l) => l.role === 'agent' && l.text.trim().endsWith('?')).length - 1));

  if (phase === 'ready' || phase === 'connecting') {
    return (
      <div className="narrow center call">
        <Steps at={2} />
        <DotOrb size={240} />
        <h1 className="title">Ready when you are</h1>
        <p className="muted">
          Donna will ask about {c.dossier?.topProject ?? 'your work'} for the {role.title} role.{' '}
          {fast ? 'About a minute.' : 'About 3 minutes.'} Use headphones if you can.
        </p>
        <div className="call-actions">
          <button className="btn btn-primary btn-wide" onClick={begin} disabled={phase === 'connecting'}>
            {phase === 'connecting' ? 'Connecting…' : 'Start call'}
          </button>
          <label className="toggle">
            <input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} />
            Demo mode (about 60 seconds)
          </label>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <p className="fineprint">Donna is an AI. The call is recorded and scored.</p>
      </div>
    );
  }

  return (
    <div className="narrow call call-live">
      <div className="call-bar">
        <span className="rec-pill">
          <i aria-hidden="true" />
          Recording
        </span>
        {simulated && <Stub>simulated call</Stub>}
        <span className="time-pill">
          {clock(elapsed)} / {clock(cap)}
        </span>
      </div>

      <div className="call-stage">
        <DotOrb size={240} active={phase === 'live'} getLevel={getLevel} />
        <div className="call-now" aria-live="polite">
          <span className="muted small">
            {phase === 'ending' ? 'Wrapping up…' : speaking ? 'Donna is speaking' : 'Listening'}
          </span>
          {lastAgent && <p className="call-line">{lastAgent.text}</p>}
        </div>
        <div className="q-progress" role="img" aria-label={`Question ${Math.max(1, asked)} of ${total}`}>
          {Array.from({ length: total }, (_, k) => (
            <i key={k} className={k < asked ? 'on' : ''} />
          ))}
        </div>
      </div>

      {showTranscript && (
        <ol className="live-transcript">
          {lines.slice(-6).map((l) => (
            <li key={l.i} className={l.role}>
              <span className="who-label">{l.role === 'agent' ? 'Donna' : 'You'}</span>
              {l.text}
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p className="error" role="alert">
          {error}{' '}
          <button className="linkish" onClick={() => { finished.current = false; void finish(); }}>
            Try again
          </button>
        </p>
      )}

      {phase === 'live' && (
        <div className="call-controls">
          <button
            className={`round-btn ${!simulated && conversation.isMuted ? 'on' : ''}`}
            onClick={() => conversation.setMuted(!conversation.isMuted)}
            disabled={simulated}
            aria-label={conversation.isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-pressed={!simulated && conversation.isMuted}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
          <button
            className={`round-btn ${showTranscript ? 'on' : ''}`}
            onClick={() => setShowTranscript(!showTranscript)}
            aria-label={showTranscript ? 'Hide transcript' : 'Show transcript'}
            aria-pressed={showTranscript}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="M7 10h4M7 14h7M14 10h3" />
            </svg>
          </button>
          <button className="round-btn end" onClick={end} aria-label="End call">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
