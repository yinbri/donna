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
| `getIntegrationStatus` | none | `{ elevenlabs, box, alter, traceroot }` (booleans) | `true` = live, `false` = fixtures. `alter` is `alterMode() === "live"` from `alter.ts` (true only when `ALTER_MODE=live`; alter.ts has no `isStubbed()`). The others are live only when their module exports `isStubbed()` and it returns `false`. **Dev 3: add `export function isStubbed(): boolean` to `box.ts` and `traceroot.ts` when you wire the real call**; until then they report as stubbed, whatever env vars are set |
| `getCandidate` | `{ id }` | `CandidateView` | includes `role`, `dossier`, `transcript`, `scorecard`, `approvals` (`ApprovalView[]`: `Approval` plus optional `approvalUrl` / `calendarUrl`, present only when set), `events` (`TimelineEvent[]`), `audioUrl`, `durationSecs` (`number \| null`, call length in seconds, set by `finalizeScreen`) |

## Actions

| Operation | Args | Returns | Status change and events |
|---|---|---|---|
| `createCandidate` | `{ roleId, name, email, githubUser?, linkedinUrl?, consent }` | `CandidateView` | `consent` must be `true`. APPLIED → RESEARCHING, returns immediately; research runs in the background → READY (also READY with no dossier if research fails; the failure is in the `research_done` detail). Events `applied`, `research_done` |
| `startScreen` | `{ candidateId, fast }` | `StartScreenResult` | → CALLING. Event `call_started`. Without a dossier, `top_project` is "your recent work" and the questions are the role's |
| `finalizeScreen` | `{ candidateId, conversationId }` | `EvaluateResult` | → EVALUATING → AWAITING_APPROVAL (PASS/MAYBE) or REJECTED (REJECT). Saves transcript, durationSecs, analysis, audio, scorecard, traceUrl. Events `call_ended`, `evaluated`. Stub conversation: `"fixture-conv-001"` |
| `proposeBooking` | `{ candidateId, slotIso? }` | `ApprovalView` (PENDING) | Calls `alter.proposeBooking`. Default slot (alter.ts): next weekday 15:00 ET. Candidate → AWAITING_APPROVAL. Event `booking_proposed`. Live: `approvalUrl` is where the founder approves in Alter |
| `attemptWithoutApproval` | `{ approvalId }` | `ApprovalView` (still PENDING, `deniedAttempt` set) | Only from PENDING or DENIED_ATTEMPT (else 409). Calls `alter.attemptWithoutApproval`; stub: blocked by the in-app gate, live: Alter's own refusal is stored as-is. Event `denied_attempt` |
| `decide` | `{ approvalId, approve }` | `ApprovalView` | Only from PENDING or DENIED_ATTEMPT (else 409). Calls `alter.decide`. Approve: APPROVED, candidate → BOOKED, event `approved`; stub: `calendarUrl` is a prefilled Google Calendar link and nothing is sent; live: waits for the founder's approval in Alter (up to `ALTER_APPROVAL_WAIT_MS`), then `calendarUrl` is the booked event and `invite_sent` is added. Reject: REJECTED, candidate → REJECTED, event `rejected` |

Approval gate (`src/server/integrations/alter.ts`, Dev 4): its functions return `{ approval, events, candidateStatus?, approvalUrl?, calendarUrl? }` and never touch the database. The operations save the approval fields, `approvalUrl` / `calendarUrl` (kept from earlier steps when a later one returns none), every event with its own timestamp, and `candidateStatus` when returned. An event kind outside `TimelineEvent["kind"]` would be saved as the step's kind with the original in brackets in the detail. Gate failures (e.g. missing env vars in live mode, Alter timeout) are 502 with the gate's message.

Approval gate env (`.env.server`): `ALTER_MODE` (`live` = real Alter, anything else = in-app gate), `ALTER_API_KEY` and `GOOGLE_GRANT_ID` (both required in live mode), `ALTER_DECIDER_KEY` (optional, live mode: a second Alter app key with `approvals:decide`; when set, Approve/Reject in Donna is recorded in Alter with it instead of waiting for the founder to approve in Alter), `ALTER_APPROVER_EMAIL` (required when `ALTER_DECIDER_KEY` is set: the founder's email, sent to Alter as the approver and checked against the rule's approvers), `ALTER_APPROVAL_WAIT_MS` (optional, default 120000), `DEMO_INVITE_TO` (optional: every invite goes to this address instead of the candidate).

## HTTP routes

- `GET /api/audio/:candidateId` serves the stored call audio with range support (use `CandidateView.audioUrl` as the `<audio src>`). 404 JSON `{ error }` when the candidate or the file is missing.
- `GET /api/health` → `{ "ok": true }`.

## Dev tools

- `/dev` and `/founder`: dev console that lists roles and candidates and drives one candidate through the stubbed flow.
- `npm run check:approval` (from `app/`, no server needed): runs propose → attempt without approval → approve → second attempt against `alter.ts` with an in-memory store and prints PASS/FAIL per step. `ALTER_MODE=live` uses real Alter, forces invites to the team demo inbox and waits for you to approve.
- `npm run check:screen` (from `app/`, with `wasp start` running): end-to-end check of create → READY → start → finalize, asserting every criterion's `evidenceTurn` is a user turn containing its quote.
- `node scripts/run-test-screens.mjs [persona-slug ...]` (from `app/`, with `wasp start` running and the ElevenLabs key set): five scripted candidates (`strong-builder`, `buzzword-talker`, `honest-junior`, `evasive`, `mixed`) talk to the real Donna agent in text and go through `finalizeScreen`. Prints each scorecard and checks every quote against the stored transcript. It makes real ElevenLabs conversations and leaves `Test: <persona>` candidates in the app. Text conversations have no recording (the stored file is empty), so ▶ plays nothing for these candidates.
- Seed (`wasp db seed`, idempotent): demo role plus the 11 sponsor roles from `app/seed/roles.json` (seed fails naming the path if it is missing or not valid JSON), `candidate-fixture-001` in AWAITING_APPROVAL with `approval-fixture-001` PENDING.

## Where the scores come from

`finalizeScreen` picks one source and stores it on the scorecard as `source`:

| `source` | When | What the founder sees |
|---|---|---|
| `panel` | The Donna box is live (`box.ts` exports `isStubbed()` returning `false`) | The 3-persona panel's scorecard |
| `call_analysis` | The box is not live and the call has a usable ElevenLabs analysis | 0-10 scores from the analysis's numeric criteria, each with a quote taken word for word from a candidate turn. `personas` is empty: one analysis is not three personas |
| `fixture` | Neither of the above (stub calls, or an analysis without numeric scores or findable quotes) | The fixture panel. The `evaluated` event says why the call analysis was not used |

The Donna agent in ElevenLabs is configured for this: criteria `shipped_real_systems`, `depth_on_own_project` and `communication` are numeric (0-10), and each has an `evidence_<id>` data field holding the candidate's own sentence; `feedback_strength_1`, `feedback_strength_2` and `feedback_sharpen` feed the candidate's feedback page. **These settings are newer than `agent/settings.md`. Pasting that file's pass/fail criteria over them sends every call back to the fixture panel.**

Checked on real conversations (14:07 to 14:22): one voice call and seven scripted text screens (`run-test-screens.mjs`) all came back `call_analysis`, and every quote matched its transcript turn. The transcripts, scorecards and analyses of the scripted runs are in [test-screens/](test-screens/README.md). The scores are coarse and move between runs: weak candidates got 0 on every criterion, the strong one 10 on every criterion, and repeating the same scripted answers moved a criterion by up to 3 points (one overall went from 7.3, PASS, to 6.7, MAYBE). Treat PASS versus MAYBE near the line as a hint; the quotes are the part a founder can check.

Roles with their own rubric get scores only for the items the analysis judged (their first item, "Depth on own project" and "Communication"). `npm run check:scoring` (no server needed) checks the mapping.
