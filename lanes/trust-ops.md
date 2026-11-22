# Lane: trust + ops + submission (Dev 4)

Read [AGENTS.md](../AGENTS.md) and [contracts/contracts.ts](../contracts/contracts.ts) first. You own the clock: say the time out loud at 1:20, 1:45 and 2:20.

## Owns

`app/src/server/integrations/alter.ts`, `app/src/server/integrations/traceroot.ts`, `app/seed/roles.json`, `pilot/*`, the demo video and the submission.

## Build

1. **Alter** (redeem the perk first; docs at docs.alterauth.com):
   - Connect a **test Google account** that acts as "the founder" before **1:00**, and seed its calendar with a few busy blocks.
   - Policy: calendar read allowed; event creation and email send **require approval**; default deny.
   - `proposeBooking(candidateId, slotIso)` finds the first free slot and creates the Alter request, which returns a pending approval → `Approval{status: PENDING, alterRef}`.
   - `attemptWithoutApproval(approvalId)` tries the write directly and stores Alter's **real denial** and its audit entry in `deniedAttempt`.
   - `decide(approvalId, approve)` approves through Alter, which creates the event and invite, or rejects.
   - Fallback if Alter stalls: an in-app gate plus a prefilled Google Calendar link. Say so honestly.
2. **TraceRoot:** TS SDK in the Wasp server and Python SDK in the box. One trace per candidate covering research → call → panel → approval. Save the trace URL on `Candidate.traceUrl`.
3. **Seed roles:** real open roles from the sponsors' YC job pages (ycombinator.com/companies/<name>/jobs), with `sourceUrl` and `isOfficialPosting: true`. A company with no posting gets "General interest (not an official posting)".
4. **Pilot** (only after Gate 1 passes at 1:20): QR code to the tunnel URL, disclaimer and consent copy, and the message for Brian to post. Target 8+ real screens by 3:00; report the true number.
5. **Submission:**
   - At 2:20, record the 2-minute video: live Donna audio, ▶ receipts, the denial then Approve, and 10 s of the Codevisor crew.
   - By 2:55, submit the project link, the video (public or unlisted) and every partner tool used.

## Done when

- [ ] Pending → "Try without approval" → real Alter denial recorded → Approve → a real invite lands in an inbox, with each step in the timeline
- [ ] A trace link opens one candidate's full tree
- [ ] `roles.json` has at least 4 real postings with source links
- [ ] Video uploaded and form submitted before 2:55
