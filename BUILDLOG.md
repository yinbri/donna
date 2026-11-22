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
