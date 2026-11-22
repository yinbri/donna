# PRD: Trust + ops + submission

**Owner:** Dev 4 · **Branch:** `lane/trust-ops` · **Guide:** [guides/trust-ops.md](../guides/trust-ops.md)

## Problem

Founders won't hand an AI their calendar and email unless they can see that it can't act without them, and see everything it did. This lane makes that guarantee real and demonstrable: Alter holds the credentials and enforces approval outside the model; TraceRoot records every step. The same owner keeps the team on the clock and gets the submission in.

## Goals

1. **Proof of restraint:** "Try without approval" produces Alter's real denial and an audit entry, live.
2. Approve → a real calendar event and invite email in the candidate's inbox.
3. One TraceRoot trace per candidate, linked from the candidate page.
4. Real sponsor roles seeded, so the demo and the pilot screen for real openings.
5. A clean submission before 2:55: link, 2-minute video and every partner tool.

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

**Clock and submission**
- Call out 1:20 (Gate 1), 1:45 (cut) and 2:20 (freeze)
- 2:20–2:40: record the 2-minute video: hook, live Donna audio, ▶ receipt, denied attempt then Approve, invite arriving, trace link, 10 s of the Codevisor crew
- By 2:55, submit the project link (repo or live URL), the video (public or unlisted) and the partner tools actually used: ElevenLabs, Wasp, Codevisor, Fiber AI, Expected Parrot, Alter, Maritime, TraceRoot, plus Ploid, assistant-ui and Rowboat only if they shipped

## Acceptance criteria

- [ ] Pending → "Try without approval" → a real Alter denial with an audit reference is stored and shown → Approve → the event is on the test calendar and the invite email is in a real inbox
- [ ] Every step appears as an `Event` in the timeline
- [ ] The trace link opens one candidate's full tree
- [ ] `roles.json` has 4 or more real postings with working source links
- [ ] Video uploaded and opens in a private window; form submitted by 2:55

## Dependencies

| Needs | From | By |
|---|---|---|
| Alter perk redeemed, test Google account | Dev 4 | 12:15 |
| TraceRoot code (announced at kickoff) | Dev 4 | 12:15 |
| Wasp scaffold for `alter.ts` and `traceroot.ts` | Mac teammate | ~12:40 |
| Public URL for the pilot | Mac teammate | 1:20 |

## Risks

| Risk | Mitigation |
|---|---|
| Google "unverified app" warning during consent | Expected; click through once with the test account before 1:00 |
| Alter approval wait times out (5 min) | Propose right before the demo beat; re-propose if expired |
| Policy syntax unclear | Use Alter's onboarding MCP or docs; ask at the Alter table |
| Video runs long | Script it to 1:50 and record by 2:40 at the latest |
