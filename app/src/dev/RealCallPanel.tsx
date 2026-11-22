import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useEffect, useRef, useState } from "react";
import { config } from "wasp/client";
import { getCandidate, startScreen, useQuery } from "wasp/client/operations";
import { finalizeAndWait } from "./finalizeAndWait";

type Phase = "idle" | "starting" | "connected" | "scoring" | "done";
type LiveLine = { role: string; text: string };

const CLIP_SECS = 12;

export function RealCallPanel({ candidateId }: { candidateId: string }) {
  const [scoredCount, setScoredCount] = useState(0);
  return (
    <section>
      <h2>Real call</h2>
      {candidateId ? (
        // Keyed so switching candidates drops the previous call's state.
        <ConversationProvider key={candidateId}>
          <RealCall candidateId={candidateId} onScored={() => setScoredCount((n) => n + 1)} />
          <CallResult candidateId={candidateId} scoredCount={scoredCount} />
        </ConversationProvider>
      ) : (
        <p>Create or pick a candidate first.</p>
      )}
    </section>
  );
}

function RealCall({ candidateId, onScored }: { candidateId: string; onScored: () => void }) {
  const [fast, setFast] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [lines, setLines] = useState<LiveLine[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const conversationIdRef = useRef<string | null>(null);
  const finalizedRef = useRef(false);

  async function finalize() {
    const conversationId = conversationIdRef.current;
    if (finalizedRef.current || !conversationId) return;
    finalizedRef.current = true;
    setPhase("scoring");
    try {
      await finalizeAndWait(candidateId, conversationId);
      onScored();
      setPhase("done");
    } catch (err) {
      setError(`Scoring failed for conversation ${conversationId}: ${(err as Error).message}`);
      setPhase("idle");
    }
  }

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      conversationIdRef.current = conversationId;
      setStartedAt(Date.now());
      setPhase("connected");
    },
    onMessage: ({ role, message }) => setLines((l) => [...l, { role, text: message }]),
    onError: (message) => setError(`ElevenLabs error: ${message}`),
    onDisconnect: (details) => {
      if (details.reason === "error") setError(`Call dropped: ${details.message}`);
      if (conversationIdRef.current) {
        void finalize();
      } else {
        setPhase("idle");
      }
    },
  });

  useEffect(() => {
    if (phase !== "connected") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  async function start() {
    setError("");
    setLines([]);
    conversationIdRef.current = null;
    finalizedRef.current = false;
    setPhase("starting");
    try {
      const res = await startScreen({ candidateId, fast });
      if (res.agentId === "stub-agent") {
        setError("ElevenLabs is stubbed: set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in app/.env.server");
        setPhase("idle");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Only the permission prompt is needed here; the SDK opens its own input stream.
        stream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        setError(`Microphone unavailable: ${(err as Error).message}`);
        setPhase("idle");
        return;
      }
      // In @elevenlabs/react 1.22.1 startSession returns void (the docs say it resolves the id),
      // so the conversation id comes from onConnect. Failures arrive through onError/onDisconnect.
      conversation.startSession({
        conversationToken: res.token,
        connectionType: "webrtc",
        dynamicVariables: res.dynamicVariables,
      });
    } catch (err) {
      setError(`startScreen failed: ${(err as Error).message}`);
      setPhase("idle");
    }
  }

  const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const inCall = phase === "starting" || phase === "connected";

  return (
    <div>
      <label>
        <input type="checkbox" checked={fast} disabled={inCall} onChange={(e) => setFast(e.target.checked)} /> fast mode
      </label>{" "}
      <button disabled={inCall || phase === "scoring"} onClick={start}>
        Start real call
      </button>{" "}
      <button disabled={!inCall} onClick={() => conversation.endSession()}>
        End call
      </button>
      <p>
        Phase: <code>{phase}</code> · Connection: <code>{conversation.status}</code>
        {phase === "connected" && (
          <>
            {" "}
            · {conversation.isSpeaking ? "Donna is speaking" : "Donna is listening"} · {elapsed}s
          </>
        )}
      </p>
      {phase === "scoring" && <p>Scoring…</p>}
      {error && <pre style={{ whiteSpace: "pre-wrap", color: "crimson" }}>{error}</pre>}
      {lines.length > 0 && (
        <ol>
          {lines.map((l, n) => (
            <li key={n}>
              <b>{l.role}:</b> {l.text}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CallResult({ candidateId, scoredCount }: { candidateId: string; scoredCount: number }) {
  const candidate = useQuery(getCandidate, { id: candidateId });
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(stopTimer.current), []);
  // When scoring outlives the request, no action completes on the client to refresh this query.
  useEffect(() => {
    if (scoredCount > 0) void candidate.refetch();
  }, [scoredCount]);

  if (candidate.error) return <p>Error loading candidate: {candidate.error.message}</p>;
  const c = candidate.data;
  if (!c?.scorecard) return null;
  const transcript = c.transcript ?? [];

  async function play(t: number) {
    const audio = audioRef.current;
    if (!audio) return;
    clearTimeout(stopTimer.current);
    audio.currentTime = t;
    try {
      await audio.play();
      stopTimer.current = setTimeout(() => audio.pause(), CLIP_SECS * 1000);
    } catch (err) {
      alert(`Could not play audio: ${(err as Error).message}`);
    }
  }

  return (
    <div>
      <h3>
        Scorecard: {c.scorecard.recommendation} · overall {c.scorecard.overall}
      </h3>
      {c.audioUrl ? <audio ref={audioRef} controls src={config.apiUrl + c.audioUrl} /> : <p>No audio stored for this call</p>}
      <h4>Criteria</h4>
      <ul>
        {c.scorecard.criteria.map((cr) => {
          const turn = transcript.find((tt) => tt.i === cr.evidenceTurn);
          return (
            <li key={cr.name}>
              <b>{cr.name}</b> {cr.score}/10: “{cr.quote}” (turn {cr.evidenceTurn}
              {turn ? ` at ${turn.t}s` : ", not in transcript"})
              {c.audioUrl && turn && (
                <>
                  {" "}
                  <button onClick={() => play(turn.t)}>▶ play</button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <h4>Transcript</h4>
      <ol start={0}>
        {transcript.map((tt) => (
          <li key={tt.i}>
            [{tt.t}s] <b>{tt.role}:</b> {tt.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
