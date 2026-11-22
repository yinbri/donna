# Donna server API (Wasp backbone)

Client: `import { useQuery, listCandidates, createCandidate, ... } from "wasp/client/operations"`.
Types: `import type { CandidateView, RoleView } from "../server/views"` (results are parsed objects, never JSON strings) and the result types in `src/server/contracts.ts`.
Every operation takes one args object. Errors are `HttpError`s with a specific message (400 bad input, 404 unknown id, 409 wrong state).
Over HTTP (scripts): `POST http://localhost:3001/operations/<kebab-name>` with body `{"json": args}`; the response is `{"json": result}`.

## Queries

| Operation | Args | Returns | Notes |
|---|---|---|---|
| `listRoles` | none | `RoleView[]` | |
| `listCandidates` | `{ roleId? }` | `CandidateView[]` | `scorecard.overall` descending, unscored last, newest first on ties |
| `getIntegrationStatus` | none | `{ elevenlabs, box, alter, traceroot }` (booleans) | `true` = live, `false` = fixtures. An integration is live only when its module exports `isStubbed()` and it returns `false`. **Dev 3 and Dev 4: add `export function isStubbed(): boolean` to `box.ts`, `alter.ts` and `traceroot.ts` when you wire the real call**; until then they report as stubbed, whatever env vars are set |
| `getCandidate` | `{ id }` | `CandidateView` | includes `role`, `dossier`, `transcript`, `scorecard`, `approvals` (`Approval[]`), `events` (`TimelineEvent[]`), `audioUrl`, `durationSecs` (`number \| null`, call length in seconds, set by `finalizeScreen`) |

## Actions

| Operation | Args | Returns | Status change and events |
|---|---|---|---|
| `createCandidate` | `{ roleId, name, email, githubUser?, linkedinUrl?, consent }` | `CandidateView` | `consent` must be `true`. APPLIED → RESEARCHING, returns immediately; research runs in the background → READY (also READY with no dossier if research fails; the failure is in the `research_done` detail). Events `applied`, `research_done` |
| `startScreen` | `{ candidateId, fast }` | `StartScreenResult` | → CALLING. Event `call_started`. Without a dossier, `top_project` is "your recent work" and the questions are the role's |
| `finalizeScreen` | `{ candidateId, conversationId }` | `EvaluateResult` | → EVALUATING → AWAITING_APPROVAL (PASS/MAYBE) or REJECTED (REJECT). Saves transcript, durationSecs, analysis, audio, scorecard, traceUrl. Events `call_ended`, `evaluated`. Stub conversation: `"fixture-conv-001"` |
| `proposeBooking` | `{ candidateId, slotIso? }` | `Approval` (PENDING) | Default slot: next weekday 15:00 server-local time. Event `booking_proposed` |
| `attemptWithoutApproval` | `{ approvalId }` | `Approval` (DENIED_ATTEMPT, `deniedAttempt` set) | Event `denied_attempt` |
| `decide` | `{ approvalId, approve }` | `Approval` | Only from PENDING or DENIED_ATTEMPT (else 409). Approve: APPROVED, candidate → BOOKED, event `approved`, plus `invite_sent` when Alter sent one. Reject: REJECTED, candidate → REJECTED, event `rejected` |

## HTTP routes

- `GET /api/audio/:candidateId` serves the stored call audio with range support (use `CandidateView.audioUrl` as the `<audio src>`). 404 JSON `{ error }` when the candidate or the file is missing.
- `GET /api/health` → `{ "ok": true }`.

## Dev tools

- `/dev` and `/founder`: dev console that lists roles and candidates and drives one candidate through the stubbed flow.
- `npm run check:screen` (from `app/`, with `wasp start` running): end-to-end check of create → READY → start → finalize, asserting every criterion's `evidenceTurn` is a user turn containing its quote.
- Seed (`wasp db seed`, idempotent): demo role, `candidate-fixture-001` in AWAITING_APPROVAL with `approval-fixture-001` PENDING.
