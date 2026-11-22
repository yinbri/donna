// TraceRoot spans for Donna's pipeline steps (trust lane, Dev 4).
// Stub (default): no TRACEROOT_API_KEY, so every step runs untraced and traceUrlFor() returns null.
// Live: TRACEROOT_API_KEY set (and optionally TRACEROOT_HOST_URL). Each step becomes an `observe` span
// grouped by candidate (sessionId = candidateId). Docs: https://traceroot.ai/docs/tracing/typescript-sdk.md
//
// Privacy: spans carry the step name and ids only. captureInput/captureOutput are off, so dossiers,
// transcripts and scorecards never leave this server.

type TraceRootSdk = typeof import("@traceroot-ai/traceroot");

let sdkPromise: Promise<TraceRootSdk | null> | null = null;

export function isStubbed(): boolean {
  return !process.env.TRACEROOT_API_KEY || process.env.TRACEROOT_ENABLED === "false";
}

// The SDK reads TRACEROOT_API_KEY / TRACEROOT_HOST_URL from process.env (it loads no .env files itself;
// Wasp has already loaded .env.server). Initialized lazily on the first traced step, not at module scope.
function sdk(): Promise<TraceRootSdk | null> {
  if (isStubbed()) return Promise.resolve(null);
  sdkPromise ??= import("@traceroot-ai/traceroot")
    .then((m) => {
      m.TraceRoot.initialize();
      return m;
    })
    .catch((e) => {
      console.warn(`[traceroot] disabled: ${(e as Error).message}`);
      return null;
    });
  return sdkPromise;
}

export async function traced<T>(
  step: string,
  attributes: Record<string, string>,
  run: () => Promise<T>,
): Promise<T> {
  const m = await sdk();
  if (!m) return run();
  const session = attributes.candidateId;
  const span = () =>
    m.observe({ name: step, type: "tool", metadata: attributes, captureInput: false, captureOutput: false }, run);
  return session ? m.usingAttributes({ sessionId: session, tags: ["donna"] }, span) : span();
}

// Flush before a short-lived process exits (check scripts). The Wasp server flushes on its own every 5 s.
export async function flushTraces(): Promise<void> {
  const m = await sdk();
  if (!m) return;
  try {
    await m.TraceRoot.shutdown();
  } catch (e) {
    console.warn(`[traceroot] could not send spans: ${(e as Error).message}`);
    throw e;
  }
}

// TraceRoot's docs give no per-trace URL pattern, so we link the project's trace list (set
// TRACEROOT_PROJECT_URL to the dashboard URL of the project) and the founder filters by session = candidate id.
export function traceUrlFor(_candidateId: string): string | null {
  if (isStubbed()) return null;
  return process.env.TRACEROOT_PROJECT_URL || null;
}
