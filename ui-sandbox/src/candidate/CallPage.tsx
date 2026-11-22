import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useConversation } from '@elevenlabs/react';
import conversationFixture from '../../../fixtures/conversation.json';
import { finalizeScreen, getRole, LIVE_AGENT_ID, startScreen, useCandidate } from '../lib/api';
import type { TranscriptTurn } from '../lib/types';
import { DotOrb } from '../components/DotOrb';
import { Stub } from '../components/ui';
import { Steps } from './Steps';

const CAP_SECS = 180;

export function CallPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const c = useCandidate(id);
  const navigate = useNavigate();
  const [fast, setFast] = useState(params.get('demo') === '1');
  const [phase, setPhase] = useState<'ready' | 'live' | 'ending'>('ready');
  const [lines, setLines] = useState<TranscriptTurn[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const startAt = useRef(0);
  const linesRef = useRef<TranscriptTurn[]>([]);
  const convId = useRef<string | undefined>(undefined);
  const simTimers = useRef<number[]>([]);
  const simLevel = useRef(0);

  const push = (role: 'agent' | 'user', text: string) => {
    const turn: TranscriptTurn = { i: linesRef.current.length, role, text, t: (Date.now() - startAt.current) / 1000 };
    linesRef.current = [...linesRef.current, turn];
    setLines(linesRef.current);
  };

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      convId.current = conversationId;
    },
    onMessage: (m) => push(m.role === 'user' ? 'user' : 'agent', m.message),
    onDisconnect: () => finish(),
    onError: (e) => console.error('ElevenLabs error', e),
  });

  const finish = useCallback(async () => {
    if (!id) return;
    simTimers.current.forEach(clearTimeout);
    setPhase('ending');
    const durationSecs = Math.round((Date.now() - startAt.current) / 1000);
    await finalizeScreen(id, { conversationId: convId.current, transcript: linesRef.current, durationSecs });
    navigate(`/apply/${id}/done`);
  }, [id, navigate]);

  // Elapsed clock + hard cap.
  useEffect(() => {
    if (phase !== 'live') return;
    const t = window.setInterval(() => {
      const s = (Date.now() - startAt.current) / 1000;
      setElapsed(s);
      if (s > CAP_SECS) end();
    }, 250);
    return () => clearInterval(t);
  });

  useEffect(() => () => simTimers.current.forEach(clearTimeout), []);

  if (!c || !id) return null;
  const role = getRole(c.roleId);

  const begin = async () => {
    const s = startScreen(id, fast);
    startAt.current = Date.now();
    linesRef.current = [];
    setLines([]);
    setPhase('live');
    if (LIVE_AGENT_ID) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        conversation.startSession({ agentId: LIVE_AGENT_ID, connectionType: 'webrtc', dynamicVariables: s.dynamicVariables });
      } catch (err) {
        console.error(err);
        setPhase('ready');
      }
      return;
    }
    // Simulated call on the fixture transcript, so the flow works before the agent exists.
    const turns = conversationFixture.transcript as TranscriptTurn[];
    const speed = fast ? 0.35 : 0.6;
    turns.forEach((turn) => {
      simTimers.current.push(
        window.setTimeout(() => {
          const text = turn.text.replace('Sam', s.dynamicVariables.candidate_name).replace('Alex at Acme', `${s.dynamicVariables.founder_name} at ${s.dynamicVariables.company_name}`);
          push(turn.role, text);
          simLevel.current = turn.role === 'agent' ? 0.9 : 0.15;
          simTimers.current.push(window.setTimeout(() => (simLevel.current = 0.05), 1800));
        }, turn.t * 1000 * speed),
      );
    });
    simTimers.current.push(window.setTimeout(() => finish(), (turns[turns.length - 1].t + 4) * 1000 * speed));
  };

  const end = () => {
    if (LIVE_AGENT_ID && conversation.status === 'connected') conversation.endSession();
    else finish();
  };

  const getLevel = () => (LIVE_AGENT_ID ? (conversation.isSpeaking ? conversation.getOutputVolume() * 3 : conversation.getInputVolume() * 0.6) : simLevel.current);
  const speaking = LIVE_AGENT_ID ? conversation.isSpeaking : lines[lines.length - 1]?.role === 'agent';

  return (
    <div className="narrow center call">
      <Steps at={2} />
      <DotOrb size={240} active={phase === 'live'} getLevel={getLevel} />
      {phase === 'ready' && (
        <>
          <h1 className="title">Ready when you are</h1>
          <p className="muted">
            Donna will ask about {c.dossier?.topProject ?? 'your work'} for the {role?.title} role. {fast ? 'About a minute.' : 'About 3 minutes.'} Use headphones if
            you can.
          </p>
          <div className="call-actions">
            <button className="btn btn-primary btn-wide" onClick={begin}>
              Start call
            </button>
            <label className="toggle">
              <input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} />
              Demo mode (about 60 seconds)
            </label>
          </div>
          {!LIVE_AGENT_ID && (
            <p className="fineprint">
              <Stub>simulated call</Stub> Set <code>VITE_ELEVENLABS_AGENT_ID</code> to talk to the real Donna.
            </p>
          )}
        </>
      )}

      {phase !== 'ready' && (
        <>
          <p className="call-status">
            <span className={`live-dot ${phase === 'live' ? 'on' : ''}`} />
            {phase === 'ending' ? 'Wrapping up…' : speaking ? 'Donna is speaking' : 'Listening'}
            <span className="timer">{Math.floor(elapsed / 60)}:{String(Math.floor(elapsed % 60)).padStart(2, '0')}</span>
          </p>
          <ol className="live-transcript" aria-live="polite">
            {lines.slice(-4).map((l) => (
              <li key={l.i} className={l.role}>
                <span className="who-label">{l.role === 'agent' ? 'Donna' : 'You'}</span>
                {l.text}
              </li>
            ))}
          </ol>
          {phase === 'live' && (
            <div className="call-actions">
              {LIVE_AGENT_ID && (
                <button className="btn" onClick={() => conversation.setMuted(!conversation.isMuted)}>
                  {conversation.isMuted ? 'Unmute' : 'Mute'}
                </button>
              )}
              <button className="btn btn-danger" onClick={end}>
                End call
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
