# PRD: UI + Donna's voice

**Owner:** Brian · **Branch:** `lane/ui-voice` · **Guide:** [guides/ui-voice.md](../guides/ui-voice.md)

## Problem

A founder can't trust a hiring score they can't check, and a candidate won't sit through an AI screen that feels robotic. This lane is everything a person sees and hears: the candidate's application and voice screen, and the founder's dashboard where every score can be checked against the candidate's own words.

## Users

- **Candidate:** an engineer applying to a YC startup role. On a phone or laptop, with no app to install.
- **Founder:** a YC founder hiring with no recruiter. Wants a ranked shortlist they can verify in seconds.
- **Judge:** a YC founder at the table for 3 minutes. Must understand the product without slides.

## Goals

1. A candidate goes from the landing page to a finished voice screen in under 4 minutes.
2. A founder can verify any score in about 12 seconds by pressing ▶.
3. The demo never stalls: fast mode, cached data and a browser-call failsafe.

## Non-goals

Backend logic, scoring, research, and the Alter or calendar calls. This lane calls the operations in `contracts/contracts.ts` and renders their results.

## User stories

| # | As a… | I want to… | So that… |
|---|---|---|---|
| U1 | candidate | pick a company and role and enter my name, email, GitHub or LinkedIn | Donna can tailor the screen |
| U2 | candidate | see exactly what will happen (AI, recorded, profile lookup) and agree to it | I'm not surprised |
| U3 | candidate | watch Donna research me in live steps | the wait feels purposeful |
| U4 | candidate | talk to Donna in my browser | I don't need to share a phone number |
| U5 | candidate | get two strengths and one thing to sharpen right after | the screen was worth my time |
| F1 | founder | see candidates ranked per role with Advance / Maybe / Pass | I know who to look at first |
| F2 | founder | press ▶ on any score and hear the exact moment that earned it | I can trust or overrule the score |
| F3 | founder | see when the 3 personas disagree | I know which ones need my judgment |
| F4 | founder | approve, reject or test the approval gate before anything is booked | Donna never acts without me |
| F5 | founder | see a timeline of everything Donna did | I can audit her work |

## Functional requirements

**Candidate pages**
- `/apply`: role picker (from roles), form fields (name, email, githubUser, linkedinUrl; at least one of GitHub or LinkedIn), consent checkbox with the exact copy from [AGENTS.md](../../AGENTS.md), and the disclaimer "Unofficial hackathon demo. This is not an application to the company."
- `/apply/:candidateId/research`: live steps driven by `ResearchResult.sources` (Fiber, GitHub, Ploid), each showing ✓, ✗ or a spinner.
- `/apply/:candidateId/call`: a "Start call" button, call status, a mute toggle and "End call". Uses `@elevenlabs/react` with `StartScreenResult`. A fast-mode toggle shows when the URL has `?demo=1`.
- `/apply/:candidateId/done`: `EvaluateResult.feedback`, with no numeric score.

**Founder pages**
- `/founder`: company switcher, roles list, and a ranked candidate table (name, recommendation badge, overall score, status). Also a counter, "N screens today · median m:ss".
- `/founder/candidates/:id`:
  - **Dossier card:** summary, top project, highlights, claims to verify, source badges.
  - **Scorecard:** one row per criterion with score, quote and a ▶ button. ▶ seeks the call audio to `transcript[evidenceTurn].t`, plays until the next turn's `t`, and highlights that turn in the transcript.
  - **Persona panel:** 3 scores with rationales. A "Panel split → needs you" badge when max minus min is 3 or more.
  - **Transcript:** turns with timestamps; the evidence turn highlighted on ▶.
  - **ApprovalCard:** slot, email draft, Approve / Reject / Try without approval. Shows PENDING, DENIED_ATTEMPT (with Alter's reason and audit ref), APPROVED (invite sent) and REJECTED.
  - **Timeline:** `TimelineEvent[]` with icons, and a TraceRoot link if `traceUrl` is set.
- Anything whose data is missing is hidden, not shown broken. A cut lane must never appear.

**Donna agent** (configured in the ElevenLabs dashboard; source of truth in `agent/prompt.md`)
- Dynamic variables exactly as in `StartScreenResult.dynamicVariables`.
- First sentence discloses AI and recording. 1–2 sentences per turn. Pushes once on vague answers. 3 questions in under 180 s; in fast mode, 2 questions in about 60 s.
- Never asks about protected topics and never promises an outcome.
- Post-call analysis enabled, audio retained.

## Acceptance criteria

- [ ] All founder views render from `fixtures/*.json` with no backend
- [ ] ▶ on the "Communication" row in the fixture seeks to 43.1 s (turn 5) and highlights turn 5
- [ ] The fixture panel shows "Panel split → needs you" (scores 8.5 / 8.0 / 6.0 do not trigger it; test with a modified fixture where the spread is 3+)
- [ ] ApprovalCard renders all 4 states from fixture variants
- [ ] A browser call connects to the Donna agent with fixture variables, and Donna's first sentence uses them
- [ ] Agent tests pass: refuses a protected-topic question, ends under 180 s, handles "I don't know"
- [ ] Usable at 375 px wide (candidates scan a QR code with a phone)

## Dependencies

| Needs | From | By |
|---|---|---|
| Wasp scaffold to drop components into | Mac teammate | ~12:40 |
| Real `startScreen` (signed URL) | Mac teammate | 12:50 |
| `/api/audio/:id` for real call audio | Mac teammate | 1:00 |
| ElevenLabs Creator perk redeemed | Brian | 12:05 |

## Risks

| Risk | Mitigation |
|---|---|
| Building on Windows while the Wasp app runs on the Mac | Build in `ui-sandbox/` (Vite) against fixtures, then copy the components into `app/src/` |
| Mic permissions or noisy room | Headset, and test the browser call on the venue wifi early |
| Voice minutes | Tune the prompt with text-mode tests; real voice only for checks |
