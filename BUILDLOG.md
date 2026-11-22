# Build log

One line per merge: time (EST), lane, who or which agent, what landed.

| Time | Lane | By | What |
|---|---|---|---|
| 12:05 | setup | Brian + Claude Code | Repo restructured; plan, AGENTS.md, lane briefs, contracts and fixtures added |
| 12:35 | wasp-backbone | Dev 2 + Claude Code (Fable lead) | PR #1: Wasp 0.26.1 scaffold (`app/main.wasp.ts`), SQLite schema, contracts copy, fixture stubs, role seed, `/api/health` |
| 12:36 | wasp-backbone | Claude Code Opus agent `elevenlabs` (own worktree) | Real ElevenLabs client behind the stub: WebRTC token, conversation polling, transcript normalization, audio download. Live path not yet run (no key) |
| 12:36 | wasp-backbone | Claude Code Opus agent `ops` (own worktree) | 3 queries and 6 actions, view types, audio route, fixture candidate seed, dev console at `/dev` and `/founder`, `npm run check:screen` |
| 12:38 | wasp-backbone | Claude Code Opus agent `devex` (own worktree) | `scripts/public-url.sh` (cloudflared), Vite tunnel-host allowance, `dev2/RUNBOOK.md` |
| 12:41 | wasp-backbone | Claude Code (Fable lead) review | Approvals cannot be acted on after a decision; late research cannot rewind a candidate's status; a failed audio download no longer fails the screen |
| 12:54 | wasp-backbone | Claude Code Opus agent `ui-adapter` (own worktree) | `app/src/dev/uiApi.ts` (Brian's `lib/api` functions on top of the real operations) and `dev2/ui-integration.md` (port guide). Compiles; not yet run in a browser |
| 13:00 | wasp-backbone | Claude Code Opus agent `ui-backend` (own worktree) + Fable review | `durationSecs` stored and exposed on the candidate; `getIntegrationStatus` query (an integration reports live only when its own module says so) |
| 13:00 | ui-voice (done by Dev 2) | Claude Code (Fable lead) | Donna agent created in the ElevenLabs account the app's key belongs to, from `agent/prompt.md` and `agent/settings.md` on `lane/ui-voice`. Token endpoint returns 200. Not set yet: end-call tool, agent tests |
| 13:04 | wasp-backbone | Dev 2 + Claude Code | PR #3 merged: UI adapter, port guide, stored call length, integration status |
| 13:06 | wasp-backbone | Claude Code Opus agent `dev-call` (own worktree) | "Real call" panel in the dev console (`@elevenlabs/react` 1.22.1): real session from `startScreen`, finalize on hang-up, scorecard with audio seek. Renders; no real call made yet |
| 13:10 | wasp-backbone | Dev 2 (real call) | First real call through the dev console: 21 turns with timestamps, 144 s recording stored, audio route serves ranges, ElevenLabs analysis saved |
| 13:21 | wasp-backbone | Claude Code (Fable lead) | Fix: scoring a real call outlives the browser's 10 s request limit. The page now waits for the server's result; repeat requests reuse it; a failed finalize is recorded and retryable |
| 13:23 | trust-ops + wasp-backbone | Dev 4's `lane/trust-ops` merged by Claude Code Opus agent `trust-integration` (own worktree) | Approval gate `alter.ts` (in-app gate + live Alter) and `npm run check:approval`; the three approval operations now call it and store its approval, events, status and links. SDK pinned to ^0.33.0 because npm's 7-day release-age rule refuses 0.34.1 |
| 13:26 | wasp-backbone | Claude Code (Fable lead) | Approve now survives a long wait (live Alter waits for the founder): the page polls after the browser's 10 s limit and a repeated request joins the one in flight |
| 13:34 | trust-ops + wasp-backbone | Claude Code Opus agent (own worktree, branch `dev2-approval-merge`) | Merged `lane/trust-ops`: alter.ts decides through a second Alter key (`ALTER_DECIDER_KEY` + `ALTER_APPROVER_EMAIL`), seed roles, pilot runbook. operations.ts unchanged; `wasp compile` and `check:approval` pass |
| 13:33 | trust-ops + wasp-backbone | Dev 2 via three Codevisor agents (one workspace each) | Merged Dev 4's newer `alter.ts` (second-key approve path) with `ALTER_DECIDER_KEY` / `ALTER_APPROVER_EMAIL` documented; seed now loads the 11 sponsor roles in `app/seed/roles.json`; README status and runbook brought up to date |
| 13:39 | wasp-backbone | Claude Code (Fable lead) | Checked the Codevisor work and Dev 4's latest `lane/trust-ops` together: compiles, seed gives 12 roles on repeat runs, `npm run check:approval` passes in in-app mode |
| 13:35 | ui-voice | Brian + Claude Code | Sandbox UI ported into Wasp (`/apply` flow, `/founder` with the design board sidebar and candidate threads, live call screen). Gate 1 flow passes locally with every integration stubbed. Approve stays available after a denied attempt; the approved line says whether an invite was really sent |
| 13:47 | all lanes | Dev 2 + Claude Code | PR #6 merged: Dev 4's newer approval gate, sponsor roles in the seed, docs, and the fix that lets the web client play call recordings (Brian's ▶ buttons now play the real call) |
| 13:50 | trust-ops + wasp-backbone | Dev 4's TraceRoot spans merged by Claude Code (Fable lead) | `integrations/traceroot.ts` and `npm run check:trace` from `lane/trust-ops`; `@traceroot-ai/traceroot` ^0.8.1 added; `TRACEROOT_API_KEY`, `TRACEROOT_HOST_URL`, `TRACEROOT_PROJECT_URL` documented. Checked in stub mode only (no key on this machine) |
| 14:04 | wasp-backbone | Claude Code (Fable lead) | Real scoring while the box is missing: a real call's scorecard is built from ElevenLabs' numeric analysis with word-for-word evidence quotes (`src/server/scoring.ts`, `npm run check:scoring`); the scorecard and timeline record the source. Checked by unit checks and on a fixture call; not yet on a real call |
