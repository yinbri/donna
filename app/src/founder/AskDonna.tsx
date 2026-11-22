import { useMemo, useRef } from 'react';
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  type ChatModelAdapter,
} from '@assistant-ui/react';
import type { Role } from '../server/contracts';
import type { UICandidate } from '../dev/uiApi';
import { DotOrb } from '../components/DotOrb';
import { askDonna } from 'wasp/client/operations';
import { answer, contextFor } from './donnaAnswers';

const SUGGESTIONS = ['Who should I meet this week?', 'Where did the panel disagree?', 'Any red flags?', 'What needs me?'];

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => clearTimeout(t), { once: true });
  });

function UserMessage() {
  return (
    <MessagePrimitive.Root className="ad-user">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="ad-donna">
      <span className="ad-avatar" aria-hidden="true">
        <i />
      </span>
      <div className="ad-text">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

/** Docked assistant-ui thread: ask Donna anything about this role's candidates. */
export function AskDonna({
  candidates,
  role,
  founderName,
  preferences = '',
}: {
  candidates: UICandidate[];
  role?: Role;
  founderName: string;
  /** The founder's hiring preferences for this role, as plain text. Empty when untouched. */
  preferences?: string;
}) {
  // The adapter reads the latest data through a ref so the runtime isn't rebuilt on every render.
  const data = useRef({ candidates, role, founderName, preferences });
  data.current = { candidates, role, founderName, preferences };

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        const textOf = (m: (typeof messages)[number]) => m.content.map((p) => (p.type === 'text' ? p.text : '')).join(' ');
        const question = textOf(messages[messages.length - 1]);
        const { candidates, role, founderName, preferences } = data.current;
        let full: string;
        try {
          const reply = await askDonna({
            question,
            founderName,
            scope: role ? `${role.title} at ${role.companyName}` : 'all open roles',
            candidates: [preferences, contextFor(candidates, role)].filter(Boolean).join('\n\n'),
            history: messages
              .slice(0, -1)
              .map((m) => `${m.role === 'user' ? 'Founder' : 'Donna'}: ${textOf(m)}`)
              .join('\n'),
          });
          full = reply?.text ?? answer(question, candidates, role);
        } catch (err) {
          console.error('Ask Donna: ElevenLabs chat failed, using sandbox answer', err);
          full = answer(question, candidates, role);
        }
        if (abortSignal.aborted) return;
        // Stream word by word so it reads like a reply, not a page swap.
        const words = full.split(/(\s+)/);
        let text = '';
        for (const w of words) {
          if (abortSignal.aborted) return;
          text += w;
          yield { content: [{ type: 'text', text }] };
          await sleep(14, abortSignal);
        }
      },
    }),
    [],
  );
  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <aside className="ask-donna" aria-label="Ask Donna">
        <header className="ad-head">
          <span className="ad-title">Ask Donna</span>
        </header>
        <ThreadPrimitive.Root className="ad-thread">
          <ThreadPrimitive.Viewport className="ad-viewport">
            <ThreadPrimitive.Empty>
              <div className="ad-empty">
                <DotOrb size={88} />
                <p className="ad-hello">Hi {founderName}. Ask me about anyone I've screened.</p>
                <div className="ad-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <ThreadPrimitive.Suggestion key={s} prompt={s} send className="ad-chip">
                      {s}
                    </ThreadPrimitive.Suggestion>
                  ))}
                </div>
              </div>
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
          </ThreadPrimitive.Viewport>
          <ComposerPrimitive.Root className="ad-composer">
            <ComposerPrimitive.Input className="ad-input" placeholder="Ask about your candidates" rows={1} autoFocus={false} aria-label="Message Donna" />
            <ComposerPrimitive.Send className="ad-send" aria-label="Send">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5M6 11l6-6 6 6" />
              </svg>
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </aside>
    </AssistantRuntimeProvider>
  );
}
