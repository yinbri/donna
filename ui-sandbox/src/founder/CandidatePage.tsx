import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fmtDuration, getRole, panelSpread, PANEL_SPLIT, setDecision, STUBS, useCandidate } from '../lib/api';
import { playReceipt, stopReceipt } from '../lib/receipts';
import { Card, RecBadge, SourceBadges, StatusDot, Stub } from '../components/ui';
import { ApprovalCard } from './ApprovalCard';
import { Timeline } from './Timeline';

export function CandidatePage() {
  const { id } = useParams();
  const c = useCandidate(id);
  const [playing, setPlaying] = useState<number | null>(null);
  const [mode, setMode] = useState<'audio' | 'speech' | null>(null);
  const turnRefs = useRef<Record<number, HTMLLIElement | null>>({});

  useEffect(() => () => stopReceipt(), []);

  if (!c) {
    return (
      <div className="empty">
        <p>Candidate not found.</p>
        <Link to="/founder" className="btn">Back to founder view</Link>
      </div>
    );
  }
  const role = getRole(c.roleId);
  const e = c.evaluation;
  const t = c.transcript ?? [];
  const split = panelSpread(e) >= PANEL_SPLIT;
  const audioUrl = c.audioUrl ?? '/conversation.mp3';

  const play = async (turn: number) => {
    if (playing === turn) {
      stopReceipt();
      setPlaying(null);
      return;
    }
    setPlaying(turn);
    turnRefs.current[turn]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const m = await playReceipt(audioUrl, t, turn, () => setPlaying(null));
    setMode(m);
  };

  return (
    <div className="candidate">
      <Link to="/founder" className="back">← {role?.title} · {role?.companyName}</Link>

      <header className="cand-head">
        <div>
          <h1 className="title">{c.name}</h1>
          <p className="muted">
            {c.email}
            {c.githubUser && <> · github.com/{c.githubUser}</>}
            {c.durationSecs ? <> · {fmtDuration(c.durationSecs)} call</> : null}
          </p>
          <div className="row gap">
            <StatusDot status={c.status} />
            {c.traceUrl && (
              <a href={c.traceUrl} target="_blank" rel="noreferrer" className="label">
                trace ↗
              </a>
            )}
          </div>
        </div>
        {e && (
          <div className="verdict">
            <span className="big-score">{e.overall.toFixed(1)}</span>
            <div>
              <RecBadge rec={e.recommendation} />
              <div className="decide" role="group" aria-label="Your call">
                {(['PASS', 'MAYBE', 'REJECT'] as const).map((r) => (
                  <button key={r} className={`chip ${e.recommendation === r ? 'on' : ''}`} onClick={() => setDecision(c.id, r)}>
                    {r === 'PASS' ? 'Advance' : r === 'MAYBE' ? 'Maybe' : 'Pass'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="cand-grid">
        <div className="col">
          {e && (
            <Card
              title="Scorecard"
              aside={
                <span className="label muted">
                  ▶ plays the moment behind each score
                  {mode === 'speech' && <Stub>read aloud: no call audio yet</Stub>}
                </span>
              }
            >
              <ul className="criteria">
                {e.criteria.map((cr) => (
                  <li key={cr.name} className={playing === cr.evidenceTurn ? 'is-playing' : ''}>
                    <button className="play" onClick={() => play(cr.evidenceTurn)} aria-label={`Play evidence for ${cr.name}`}>
                      {playing === cr.evidenceTurn ? '❚❚' : '▶'}
                    </button>
                    <div className="crit-body">
                      <div className="crit-top">
                        <strong>{cr.name}</strong>
                        <span className="crit-score">
                          <Meter value={cr.score} />
                          {cr.score}/10
                        </span>
                      </div>
                      <blockquote>“{cr.quote}”</blockquote>
                      <span className="label muted">turn {cr.evidenceTurn} · {fmtDuration(t.find((x) => x.i === cr.evidenceTurn)?.t ?? 0)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {e && (
            <Card
              title="Hiring panel"
              aside={split ? <span className="split">panel split → needs you</span> : <span className="label muted">agrees</span>}
            >
              <div className="personas">
                {e.personas.map((p) => (
                  <div key={p.name} className="persona">
                    <span className="persona-score">{p.score.toFixed(1)}</span>
                    <strong>{p.name}</strong>
                    <p>{p.rationale}</p>
                  </div>
                ))}
              </div>
              {e.redFlags.length > 0 && (
                <div className="flags">
                  <span className="label">Red flags</span>
                  <ul>
                    {e.redFlags.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {STUBS.evaluate && <p className="fineprint"><Stub>fixture panel</Stub> Expected Parrot scores land when the box is live.</p>}
            </Card>
          )}

          {c.dossier && (
            <Card title="Dossier" aside={<SourceBadges sources={c.dossier.sources} />}>
              <p className="summary">{c.dossier.summary}</p>
              <div className="dossier-grid">
                <div>
                  <span className="label">Opened with</span>
                  <p>{c.dossier.topProject}</p>
                </div>
                <div>
                  <span className="label">Highlights</span>
                  <ul>{c.dossier.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
                </div>
                <div>
                  <span className="label">Claims to verify</span>
                  <ul>{c.dossier.claimsToVerify.map((h) => <li key={h}>{h}</li>)}</ul>
                </div>
                <div>
                  <span className="label">Donna asked</span>
                  <ol>{c.dossier.tailoredQuestions.map((q) => <li key={q}>{q}</li>)}</ol>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="col side">
          <ApprovalCard candidate={c} />
          {t.length > 0 && (
            <Card title="Transcript" className="transcript-card">
              <ol className="transcript">
                {t.map((turn) => {
                  const evidence = e?.criteria.some((cr) => cr.evidenceTurn === turn.i);
                  return (
                    <li
                      key={turn.i}
                      ref={(el) => {
                        turnRefs.current[turn.i] = el;
                      }}
                      className={`turn ${turn.role} ${playing === turn.i ? 'is-playing' : ''} ${evidence ? 'evidence' : ''}`}
                    >
                      <span className="who-label">{turn.role === 'agent' ? 'Donna' : c.name.split(' ')[0]}</span>
                      <span className="ts">{fmtDuration(turn.t)}</span>
                      <p>{turn.text}</p>
                      {evidence && turn.role === 'user' && (
                        <button className="mini-play" onClick={() => play(turn.i)} aria-label="Play this turn">
                          {playing === turn.i ? '❚❚' : '▶'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}
          <Timeline events={c.events} />
        </div>
      </div>
    </div>
  );
}

function Meter({ value }: { value: number }) {
  return (
    <span className="meter" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} className={i < Math.round(value) ? 'on' : ''} />
      ))}
    </span>
  );
}
