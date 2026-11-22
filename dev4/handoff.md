# Dev 4 → Dev 2 handoff (merge `lane/trust-ops`)

Branch `lane/trust-ops` already contains `main` up to merge #6 (merged 13:50), so it should merge cleanly. The approval gate, decider key and sponsor roles are already on main. What's left is TraceRoot.

## What the branch adds over main

| File | What |
|---|---|
| `app/src/server/integrations/traceroot.ts` | Real `traced()` (TraceRoot `observe` spans, grouped by candidate, ids only, no candidate data), `isStubbed()`, `flushTraces()`, `traceUrlFor()`. No key means a no-op |
| `app/src/server/integrations/alter.ts` | One TraceRoot span per gate step (`approval_propose`, `approval_attempt_without_approval`, `approval_approve`, `approval_reject`) |
| `app/scripts/check-trace.ts`, `app/scripts/check-approval.ts` | Trace check, and a flush at the end of the approval check |
| `pilot/runbook.md`, `docs/submission.md`, README "Built with" (TraceRoot line, keeps your Codevisor line) | Pilot and submission |

## Your files: please change

`app/package.json`: add the dependency `"@traceroot-ai/traceroot": "0.8.1"` (published Nov 10, so it passes the 7-day rule) and the script `"check:trace": "tsx scripts/check-trace.ts"`.

`app/.env.server.example`: rename `TRACEROOT_TOKEN=` to `TRACEROOT_API_KEY=`. That is the name TraceRoot's TypeScript SDK reads (https://traceroot.ai/docs/tracing/typescript-sdk.md). Optionally add `TRACEROOT_PROJECT_URL=` (the TraceRoot project page, shown as the founder's trace link).

On the Mac's `app/.env.server`, add `TRACEROOT_API_KEY`. Dev 4 sends the value privately.

## Checks after merge (from `app/`)

```bash
npm run check:approval
```

```bash
npx tsx scripts/check-trace.ts
```

Both print PASS; with the key set they also send spans.

## BUILDLOG line

| 13:50 | trust-ops | Dev 4 + Claude Code | TraceRoot spans for research, call fetch, evaluate and each approval step (live check 13:44, seen in the dashboard); Alter live check passed on SDK 0.33.0 at 13:34; pilot runbook points at /apply |
