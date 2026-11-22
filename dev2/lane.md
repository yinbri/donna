# Dev 2: Wasp backbone + Codevisor lead (has the Mac)

Read [AGENTS.md](../AGENTS.md) and [contracts/contracts.ts](../contracts/contracts.ts) first. Run this lane and its sub-agents inside Codevisor, one worktree per agent, and log every merge in `BUILDLOG.md`.

## Owns

`app/main.wasp`, `app/schema.prisma`, `app/src/server/*` (except `integrations/box.ts` and `integrations/alter.ts`), `app/src/server/integrations/elevenlabs.ts`, `BUILDLOG.md`, the Codevisor clip.

## Build

1. Install the Wasp CLI and the Wasp agent plugin (`claude plugin marketplace add wasp-lang/wasp-agent-plugins`), then `wasp new` in `app/`. Use **SQLite** (no Docker for Postgres). Store JSON fields as strings.
2. Prisma models from `plan.md`: `Role`, `Candidate`, `Approval`, `Event`. Seed from `fixtures/roles.json` and the fixture candidates.
3. Copy `contracts/contracts.ts` to `app/src/server/contracts.ts`.
4. Integration stubs in `app/src/server/integrations/`: `elevenlabs.ts`, `box.ts`, `alter.ts`, `traceroot.ts`. Each returns the matching `fixtures/*.json` until its owner swaps in the real call.
5. Operations:
   - `createCandidate` → status RESEARCHING → `box.research` → READY
   - `startScreen(candidateId, fast)` → `{ token, dynamicVariables }` (a signed URL or token for the `@elevenlabs/react` browser session)
   - `finalizeScreen(candidateId, conversationId)` → poll the ElevenLabs conversation until done; store the transcript (numbered turns with `t` in seconds), the analysis and the audio file; then `box.evaluate` → scorecard → status AWAITING_APPROVAL or REJECTED
   - `proposeBooking`, `decide` and `attemptWithoutApproval` → call `alter.ts`, write `Event` rows
   - API route `GET /api/audio/:candidateId` → serves the stored call audio for the receipts player
6. `npm run check:screen`: replays `fixtures/conversation.json` through `finalizeScreen` without spending voice minutes.
7. Public URL for the pilot: a `cloudflared` quick tunnel to the Wasp web and server ports; run `caffeinate` so the Mac stays awake.

**Fallback:** if no Wasp page renders by **12:40**, switch to Vite + Express with the same contracts and give up the Wasp prize, not the demo.

## Done when

- [ ] `wasp start` → `/founder` lists seeded roles and fixture candidates
- [ ] `npm run check:screen` turns the fixture conversation into a scorecard where every criterion has an `evidenceTurn`
- [ ] A candidate moves through every status with all integrations stubbed
- [ ] `/api/audio/:id` plays in a browser
- [ ] The 10-second Codevisor crew clip is recorded
