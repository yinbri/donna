import type { TimelineEvent } from '../lib/types';
import { Card } from '../components/ui';

const ICON: Record<TimelineEvent['kind'], string> = {
  applied: '○',
  research_done: '◎',
  call_started: '◉',
  call_ended: '●',
  evaluated: '◆',
  booking_proposed: '◇',
  denied_attempt: '⊘',
  approved: '✓',
  rejected: '✕',
  invite_sent: '→',
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;
  return (
    <Card title="What Donna did">
      <ol className="timeline">
        {[...events].reverse().map((e) => (
          <li key={e.id} className={`tl tl-${e.kind}`}>
            <span className="tl-icon">{ICON[e.kind]}</span>
            <span className="tl-detail">{e.detail}</span>
            <time className="label muted">{new Date(e.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
          </li>
        ))}
      </ol>
    </Card>
  );
}
