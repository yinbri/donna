# Submission draft (Dev 4)

Due **3:00 PM**, aim for **2:55**. Form link is in `Hacker Package.pdf` (not in git). One submission per team: project link, a 2-minute video anyone can open, and every partner tool used. Dev 4 submits. Nothing here gets uploaded or submitted without Dev 4's go.

## 1. Partner tools: claim only what ran

Fill the "Ran today?" column at 2:20 from the evidence column. If it is not a yes with evidence, it does not go in the form, the README or the voice-over.

| Tool | What it does in Donna | Evidence that it ran | Ran today? |
|---|---|---|---|
| ElevenLabs | Donna's live voice screen (Agents, WebRTC), transcript with timestamps, call audio for the ▶ receipts | BUILDLOG 13:10: first real call, 21 turns, 144 s audio stored | yes (13:10) |
| Wasp | The whole app: Wasp 0.26.1, SQLite, operations, founder view | BUILDLOG 12:35 onward | yes |
| Alter | Holds the founder's Google Calendar grant. A calendar write without approval is held; approve releases it and Google emails the invite | `npm run check:approval` live: passed 13:22 (SDK 0.34.1) and 13:34 (SDK 0.33.0, main's pin), event jfc38og5ikdrh4rf9iq70qsqes invited the demo inbox. Needs `lane/trust-ops` merged to main again for the approve path | yes (13:34) |
| Codevisor | Parallel coding agents, one per worktree | BUILDLOG says "Claude Code Opus agent … own worktree". **Ask Aarav whether these ran inside Codevisor.** Claim it only if yes, and only for that code | ask Aarav |
| Fiber AI | Applicant research (box `/research`) | README: box `/research` not checked yet | ask Sam |
| Expected Parrot | 3-persona hiring panel (box `/evaluate`) | README: box `/evaluate` not checked yet | ask Sam |
| Maritime | Hosts the box as an "isolated micro-VM that sleeps" | none yet | ask Sam |
| TraceRoot | Trace of every step | not built (cut order: before Maritime) | no, unless it lands |
| Ploid, assistant-ui, Rowboat | Wave 2 only | none | no, unless they land |

If Alter's live re-run fails: claim "in-app approval gate", drop Alter from the tool list, and switch the video shot in section 3.

## 2. Form answers

**Project name:** Donna

**Tagline:** A recruiting coordinator you can check in 12 seconds.

**Project link:** https://github.com/yinbri/donna. **It returned 404 to a logged-out request at 13:34, so it is private.** Judges cannot open it. Ask Brian (repo owner) to make it public before 2:50 (check no key, `.env` or Hacker Package file is in the history first), or link a live URL instead.

**Description (short, edit at 2:20 so it only lists what ran):**

> Donna is an AI recruiting coordinator for founders. A candidate applies and Donna researches only what they typed, after they consent. She runs a short voice screen with ElevenLabs, then grades the call against the role's rubric. Every score has a ▶ button that plays the exact seconds of the call it is based on, so a founder can check a verdict in seconds instead of rewatching 20 minutes. Donna proposes an interview slot but can't touch the founder's calendar or email anyone until the founder approves. That rule is enforced outside the model: Alter holds the Google credential and holds any write without approval. Built today on Wasp.

Swap the Alter sentence for this if Alter is cut:

> That rule is enforced by an in-app approval gate, not by the model.

**Video link:** (unlisted YouTube or Loom, opened in a private window first)

**Partner tools used:** only the "yes" rows from section 1.

## 3. Video: 2:00 max, script to 1:50

Record at 2:20 on the Mac, screen plus mic. Use the localhost founder view (quick tunnels don't carry SSE). Candidate: a teammate or the seeded "Sam Rivera". Invites go only to the demo inbox (`DEMO_INVITE_TO`).

| Time | Shot | Voice-over |
|---|---|---|
| 0:00–0:12 | Founder view, a list of candidates | "Everyone here took a phone screen to get in. Donna is the coordinator that runs the screen and everything after it." |
| 0:12–0:45 | Apply page: banner, consent box, Apply. Then the call with Donna's real voice for about 15 s, starting with her AI-and-recorded line | "A candidate applies. Donna looks up only what they typed, and only after they consent. Then she calls. She says up front she's an AI and the call is recorded." |
| 0:45–1:10 | Scorecard. Press ▶ on one criterion and the candidate's own words play | "After the call, Donna grades it against the role's rubric. Every score has a play button. That's the candidate's own voice, the exact moment the score is based on. You check a verdict in twelve seconds." |
| 1:10–1:40 | Founder view: the proposed slot, "Try without approval" giving the held/blocked event, then Approve, then the invite in the demo inbox | "Donna proposes an interview, but she can't touch the calendar on her own. When she tries, Alter holds it: approval required. The founder approves, and the invite goes out." (In-app version: "When she tries, the app's approval gate blocks it.") |
| 1:40–1:50 | Only what ran: the Alter audit log, the Codevisor crew (10 s, only if confirmed), the trace link (only if TraceRoot landed) | "Every step leaves a record." Add "Built with parallel agents in Codevisor." only if confirmed. |
| 1:50–2:00 | Donna's dashboard | "Donna. A coordinator you'd actually hire, because she can't act without you." |

Wording rules for the voice-over:
- Say "Alter holds it / approval required", not "denied". Alter returns a held request, not a hard deny.
- Say "isolated micro-VM that sleeps", never "Firecracker", and only if Maritime ran.
- No "N screens today" unless the pilot count (pilot/runbook.md section 7) is real and above 0.
- No pronoun guesses for the candidate. Use their name or "the candidate".

Before uploading: watch it once and time it (≤ 2:00), and check that no API key, `.env` file or Hacker Package code is on screen. Upload as unlisted, open the link in a private window, then paste it into the form.

## 4. Order of work after the 2:20 freeze

1. 2:20: fill section 1 with evidence. Re-run `npm run check:approval` live on main.
2. 2:22–2:40: record, then a second take only if the first breaks a rule above.
3. 2:40–2:45: upload unlisted and check it in a private window.
4. 2:45: update the README "Built with" section from section 1 (only "yes" rows).
5. 2:50: Dev 4 reviews the form and submits. Screenshot the confirmation.
