# Dev 4 → Dev 2 handoff (merge `lane/trust-ops`)

Branch: `lane/trust-ops`. It already contains `main` (merged 13:33), so it should merge cleanly.

## Why merge again

The 13:23 merge took an early `alter.ts` that has no `decideViaApi`. On that version, live Approve waits for Alter's Wallet page, which fails with "Identity provider configuration error". The branch version approves through Alter's API with a second key (`approvals:decide`) and passed live at 13:22 (SDK 0.34.1) and 13:34 (SDK 0.33.0).

## What the branch adds

| File | What |
|---|---|
| `app/src/server/integrations/alter.ts` | Approve/Reject through Alter's API (`ALTER_DECIDER_KEY` + `ALTER_APPROVER_EMAIL`), plus one TraceRoot span per gate step |
| `app/src/server/integrations/traceroot.ts` | Real `traced()` (TraceRoot `observe` spans, grouped by candidate, ids only, no candidate data), `isStubbed()`, `flushTraces()`, `traceUrlFor()` |
| `app/scripts/check-approval.ts` | Flushes spans at the end when TraceRoot is on |
| `app/scripts/check-trace.ts` | One traced step plus flush. Passed live at 13:44, and Dev 4 saw it in the dashboard |
| `app/seed/roles.json` | 11 sponsor roles (2 real postings, 9 general interest, all `isOfficialPosting: false`) |
| `pilot/runbook.md`, `docs/submission.md`, README "Built with" | Pilot and submission |

## Your files: please add

`app/package.json`:

```json
"@traceroot-ai/traceroot": "0.8.1"
```

and a script:

```json
"check:trace": "tsx scripts/check-trace.ts"
```

`0.8.1` was published Nov 10, so it passes the 7-day release-age rule.

`app/.env.server.example` (names only):

```
# Second Alter key with approvals:decide; Donna's Approve button decides through it
ALTER_DECIDER_KEY=
# Approver email named on the Alter policy rule
ALTER_APPROVER_EMAIL=
# Empty = no tracing
TRACEROOT_API_KEY=
# Optional: TraceRoot project page, shown as the founder's trace link
TRACEROOT_PROJECT_URL=
```

`app/src/server/seed.ts`: seed roles from `app/seed/roles.json` instead of `FIXTURE_ROLES`, so the pilot shows the real sponsor roles. Keep the fixture candidate on `FIXTURE_ROLES[0].id`, or point it at `role-traceroot-founding-engineer`.

## On the Mac's `app/.env.server`

`ALTER_MODE=live`, `ALTER_API_KEY`, `GOOGLE_GRANT_ID`, `ALTER_DECIDER_KEY`, `ALTER_APPROVER_EMAIL`, `DEMO_INVITE_TO=istgtspmosmfr@gmail.com`, `TRACEROOT_API_KEY`. Dev 4 sends the values privately, never through git.

## Checks after merge (from `app/`)

```bash
npm run check:approval
```

```bash
ALTER_MODE=live npm run check:approval
```

The live run sends one real invite, to the demo inbox only.

```bash
npx tsx scripts/check-trace.ts
```

## BUILDLOG line

| 13:50 | trust-ops | Dev 4 + Claude Code | Alter approve via approvals:decide key (live pass 13:34 on SDK 0.33.0); TraceRoot spans for research, call fetch, evaluate and each approval step (live, seen in dashboard 13:44); 11 seed roles; pilot runbook; submission draft |
