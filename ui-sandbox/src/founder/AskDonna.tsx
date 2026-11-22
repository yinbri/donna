import { useMemo, useRef } from 'react';
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  type ChatModelAdapter,
} from '@assistant-ui/react';
import type { Role, UICandidate } from '../lib/types';
import { DotOrb } from '../components/DotOrb';
import { answer } from './donnaAnswers';

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
export function AskDonna({ candidates, role, founderName }: { candidates: UICandidate[]; role?: Role; founderName: string }) {
  // The adapter reads the latest data through a ref so the runtime isn't rebuilt on every render.
  const data = useRef({ candidates, role });
  data.current = { candidates, role };

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        const last = messages[messages.length - 1];
        const question = last.content.map((p) => (p.type === 'text' ? p.text : '')).join(' ');
        const full = answer(question, data.current.candidates, data.current.role);
        await sleep(350, abortSignal);
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
          <span className="stub" title="Answers come from the candidate data on this page, not a language model">sandbox</span>
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
