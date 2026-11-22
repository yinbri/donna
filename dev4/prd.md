# Dev 4 PRD: Trust + ops

**Owner:** Dev 4 · **Branch:** `lane/trust-ops` · **Guide:** [guide.md](guide.md)

## Problem

Founders won't hand an AI their calendar and email unless they can see that it can't act without them, and see everything it did. This lane makes that guarantee real and demonstrable: Alter holds the credentials and enforces approval outside the model; TraceRoot records every step. The same owner keeps the team on the clock.

## Goals

1. **Proof of restraint:** "Try without approval" produces Alter's real denial and an audit entry, live.
2. Approve → a real calendar event and invite email in the candidate's inbox.
3. One TraceRoot trace per candidate, linked from the candidate page.
4. Real sponsor roles seeded, so the demo and the pilot screen for real openings.

## Non-goals

The UI for the approval card (Brian renders it; this lane supplies the logic), the research and the call.

## Functional requirements

**Alter** (`app/src/server/integrations/alter.ts`)
- One test Google account connected through Alter as "the founder" before **1:00**. Its calendar is seeded with 3–4 busy blocks over the next 3 days, so slot-finding is visible.
- Policy: calendar availability reads allowed; event creation and email sends **require human approval**; everything else denied.
- `proposeBooking(candidateId, slotIso?)`: if no slot is given, find the first free 30-minute slot in business hours over the next 3 days. Build the email draft. Submit the calendar write through Alter, which returns a pending approval. Return `Approval{status: PENDING, alterRef, emailDraft}`.
- `attemptWithoutApproval(approvalId)`: attempt the write directly through Alter without an approval. Record Alter's **actual** denial response and audit reference in `deniedAttempt`; never fake it.
- `decide(approvalId, approve)`: approve or reject through Alter. On approval the event is created with the candidate as an attendee, so Google sends the invite.
- Stub mode (no `ALTER_API_KEY`): returns `fixtures/approval.json` variants.
- Fallback if Alter can't be made to work by 1:20: an in-app gate plus a prefilled Google Calendar link. The pitch must then **not** claim Alter enforcement.

**TraceRoot** (`app/src/server/integrations/traceroot.ts`, plus the Python SDK in the box)
- One trace per candidate, with spans for research, call start, call end, evaluate, propose, denied attempt and decide
- Save the trace URL on `Candidate.traceUrl`
- Mention a compliance "detector" only if one is actually configured

**Seed roles** (`app/seed/roles.json`, same shape as `fixtures/roles.json`)
- At least 4 real open roles from the sponsors' YC job pages (ycombinator.com/companies/<name>/jobs), with `sourceUrl` and `isOfficialPosting: true`. Use the real founder names from the company page.
- A sponsor with no posting gets "General interest (not an official posting)" with `isOfficialPosting: false`

**Pilot** (`pilot/`, only after Gate 1 passes at 1:20)
- A QR code PNG for the public URL, plus the disclaimer and consent copy
- The post text for Brian to send: *"Built this today: take a 3-minute AI voice screen for one of the sponsor startups' open roles and get instant feedback. Unofficial demo, not an application. <link>"*
- Track the real count of screens; target 8 or more by 3:00

**Clock**
- Call out 1:20 (Gate 1), 1:45 (cut) and 2:20 (freeze)

## Acceptance criteria

- [ ] Pending → "Try without approval" → a real Alter denial with an audit reference is stored and shown → Approve → the event is on the test calendar and the invite email is in a real inbox
- [ ] Every step appears as an `Event` in the timeline
- [ ] The trace link opens one candidate's full tree
- [ ] `roles.json` has 4 or more real postings with working source links

## Dependencies

| Needs | From | By |
|---|---|---|
| Alter perk redeemed, test Google account | Dev 4 | 12:15 |
| TraceRoot code (announced at kickoff) | Dev 4 | 12:15 |
| Wasp scaffold for `alter.ts` and `traceroot.ts` | Dev 2 | ~12:40 |
| Public URL for the pilot | Dev 2 | 1:20 |

## Risks

| Risk | Mitigation |
|---|---|
| Google "unverified app" warning during consent | Expected; click through once with the test account before 1:00 |
| Alter approval wait times out (5 min) | Propose right before the demo beat; re-propose if expired |
| Policy syntax unclear | Use Alter's onboarding MCP or docs; ask at the Alter table |
