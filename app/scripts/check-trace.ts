// npx tsx scripts/check-trace.ts   (run from app/)
// Sends one traced "check_trace" step for a fixture candidate and flushes. Stub mode (no TRACEROOT_API_KEY)
// only proves the wrapper passes results through. Live mode: open the TraceRoot project and look for the
// span "check_trace" in session "check-trace-candidate".
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(process.cwd(), ".env.server");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

async function main() {
  const tr = await import("../src/server/integrations/traceroot");
  const mode = tr.isStubbed() ? "stub" : "live";
  console.log(`check:trace, mode=${mode}`);
  const out = await tr.traced("check_trace", { candidateId: "check-trace-candidate" }, async () => 42);
  let sent = true;
  try { await tr.flushTraces(); } catch { sent = false; }
  const ok = out === 42 && sent;
  console.log(`${ok ? "PASS" : "FAIL"}  traced() returned ${out}; spans ${sent ? "flushed" : "NOT sent (see warning above)"}`);
  if (mode === "live") console.log(`      trace link: ${tr.traceUrlFor("check-trace-candidate") ?? "(set TRACEROOT_PROJECT_URL)"}`);
  process.exit(ok ? 0 : 1);
}

main();
