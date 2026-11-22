# PRD: Wasp backbone + Codevisor lead

**Owner:** Mac teammate · **Branch:** `lane/wasp-backbone` (Codevisor sub-branches `lane/wasp-backbone/<task>`) · **Guide:** [guides/wasp-backbone.md](../guides/wasp-backbone.md)

## Problem

Four people building at once need one app that ties everything together and keeps running while pieces are missing. This lane is that spine: data, operations, the ElevenLabs session and audio plumbing, and the deploy. It also produces the evidence for the Codevisor prize: that the code was built by parallel agents in Codevisor.

## Goals

1. A Wasp app on `main` that starts and moves a candidate through every status with all integrations stubbed, by about 12:40.
2. The real ElevenLabs path: start a browser session, then after the call fetch the transcript, analysis and audio.
3. Visible, verifiable agentic engineering in Codevisor: worktrees, a timestamped `BUILDLOG.md` and a 10-second clip.
4. A public URL for the pilot and the judges.

## Non-goals

UI components (Brian), research and scoring (Dev 3), Alter and TraceRoot (Dev 4).

## Functional requirements

**Data (Prisma, SQLite; JSON fields stored as strings)**
- `Role`, `Candidate`, `Approval`, `Event`, as in [plan.md](../../plan.md) and `contracts/contracts.ts`
- A seed script loading `fixtures/roles.json` plus one fixture candidate in AWAITING_APPROVAL (with the dossier, transcript, panel and approval fixtures) so the founder view has data on first run

**Operations** (Wasp actions and queries)

| Operation | Behavior | Status change |
|---|---|---|
| `createCandidate(input)` | Saves the candidate with `consentAt`, then calls `box.research` asynchronously | APPLIED → RESEARCHING → READY |
| `getCandidate(id)` / `listCandidates(roleId)` | Ranked by `overall` descending, then by status | — |
| `startScreen(id, fast)` | Builds `dynamicVariables` from the role and dossier, requests a signed URL from ElevenLabs, returns `StartScreenResult` | READY → CALLING |
| `finalizeScreen(id, conversationId)` | Polls the ElevenLabs conversation until done; normalizes the transcript to `TranscriptTurn[]` (with `t` in seconds); saves the analysis; downloads the audio to disk; calls `box.evaluate`; saves the scorecard | CALLING → EVALUATING → AWAITING_APPROVAL or REJECTED |
| `proposeBooking(id, slotIso?)` | Calls `alter.proposeBooking`, saves the `Approval` | — |
| `attemptWithoutApproval(approvalId)` | Calls `alter.attemptWithoutApproval`, saves `deniedAttempt` | — |
| `decide(approvalId, approve)` | Calls `alter.decide` | → BOOKED or REJECTED |

Every operation writes an `Event` row.

**API routes**
- `GET /api/audio/:candidateId` streams the stored call audio, for the receipts player
- `GET /api/health`

**Integration stubs** in `app/src/server/integrations/`: `elevenlabs.ts` (this lane), `box.ts` (Dev 3), `alter.ts` and `traceroot.ts` (Dev 4). Each stub returns `fixtures/*.json` when its env var is unset.

**Tooling**
- `npm run check:screen` runs `finalizeScreen` on `fixtures/conversation.json` with ElevenLabs stubbed, and asserts that every criterion has a valid `evidenceTurn`
- Public URL: `cloudflared` quick tunnel, with the Mac kept awake via `caffeinate`

**Codevisor**
- One worktree per sub-task (schema, operations, elevenlabs, check script). Split work between Claude Code and Codex.
- `BUILDLOG.md` gets a line per merge
- A 10-second screen capture of the parallel agents for the video

## Acceptance criteria

- [ ] `wasp start` works on a fresh clone after `.env.server` is filled in. `/founder` lists seeded roles and the fixture candidate
- [ ] With every env var unset, a new candidate moves APPLIED → … → AWAITING_APPROVAL on fixtures
- [ ] `npm run check:screen` passes
- [ ] One real browser call produces a transcript with timestamps, stored audio that plays at `/api/audio/:id`, and an analysis
- [ ] The tunnel URL works from a phone on cellular data
- [ ] `BUILDLOG.md` has 5 or more timestamped entries, and the Codevisor clip is recorded

## Dependencies

| Needs | From | By |
|---|---|---|
| Agent ID and API key | Brian | 12:30 |
| `BOX_URL` and secret | Dev 3 | 12:50 |
| Alter functions in `alter.ts` | Dev 4 | 12:50 |
| UI components | Brian | 12:50 |

## Risks

| Risk | Mitigation |
|---|---|
| Wasp is new to the agents | Install the Wasp agent plugin. **If no page renders by 12:40, switch to Vite + Express with the same contracts** |
| ElevenLabs transcript field names differ from the contracts | Normalize in `elevenlabs.ts`, and test with `check:screen` on a real conversation export |
| Usage limits across agents | Mix Claude Code and Codex; keep the lead session light |
| The Mac sleeps mid-demo | `caffeinate -dimsu` in its own terminal |
