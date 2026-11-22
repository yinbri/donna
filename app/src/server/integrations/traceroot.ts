// Stub owned by the trust lane (Dev 4): runs each step untraced until TraceRoot is connected.

export async function traced<T>(
  _step: string,
  _attributes: Record<string, string>,
  run: () => Promise<T>,
): Promise<T> {
  return run();
}

export function traceUrlFor(_candidateId: string): string | null {
  return null;
}
