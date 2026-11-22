# Donna: a recruiting coordinator you can check in 12 seconds

## Context

The hackathon challenge is "An AI coworker you'd actually hire". Submissions close at **3:00 PM** (Hacker Package; the "around 4:00" in v2 is wrong), with a **feature freeze at 2:20**. Judging runs 3:00–4:30 at the table, then the top 4 pitch.

Targets:
- Grand Prize
- Codevisor Mac mini
- Best agents on Maritime
- Best project built with Wasp

Best Use of ElevenLabs can't be won together with the Grand Prize. Team 10 has 4 people: Brian (UI plus one more lane), a teammate with an Apple silicon Mac, and two others. Repo: `yinbri/donna`, created at 11:23.

This merges our plan with "Donna v2". What we take from v2: the three upgrades, the stub-and-fixture lanes, SQLite, the cut order, guardrails, and the Q&A answers. What we keep from ours: the 4-person split, the browser-first UI build on Windows, and honest claims.

Phase 1 is the recruiting coordinator. Assistant features are Phase 2, only if Phase 1 is green.

## What makes Donna win

Every attendee got in by taking the hosts' own 4-minute voice-agent screen, so "an agent that phone-screens" is not new in this room. Donna is the part after the call:

1. **Receipts, not scores.** Every scorecard line has a ▶ button that plays the exact seconds of the candidate's audio that earned it. *"Don't trust Donna's score. Listen to the 12 seconds it's based on."* Each criterion carries an `evidenceTurn`; that turn's timestamp is the seek target in the call audio.
2. **Proof of restraint.** A "Try to send without approval" button makes Donna attempt the calendar write. The judge sees Alter's real denial and audit entry, then taps Approve and the invite lands. The approval is enforced outside the model.
3. **It already ran today (stretch, after Gate 1).** Attendees scan a QR code, pick a sponsor's real open role (linked to the YC job page) and take a 3-minute browser screen with instant feedback. At judging, open the founder view for the judge's own company: "N people here screened for your role." Say the true number.

Kept from both plans: anti-slop questions from live research, the 3-persona panel with "panel split → needs you", 60-second demo fast mode, the browser-call failsafe and a cached-applicant button.

## Product

**Candidate:** `/apply` → company and role → name, email, GitHub or LinkedIn → consent box → "Researching you…" with live steps → browser call with Donna (3 questions, one about something they built) → feedback page (two strengths, one thing to sharpen, no number).

**Founder:** `/founder` → roles → ranked candidates (Advance / Maybe / Pass) → candidate page with:
- the dossier, with source badges
- the scorecard with ▶ receipts
- the persona panel, with a split flag
- the transcript

Then: Propose interview → approval card (Approve / Reject / Try without approval) → calendar invite → timeline with the Alter audit and a TraceRoot link. Plus a live "N screens today" counter.

**Guardrails, which double as talking points.** Donna's first sentence says she is an AI and the call is recorded. She never asks about age, family, origin, religion or health. She never promises an outcome. She looks up only the person who applied, using what they typed, after consent. Every pilot page says "Unofficial hackathon demo, not an application to the company."

## Sponsor map

| Sponsor | Job in Donna | Tier | Fallback |
|---|---|---|---|
| ElevenLabs | Browser voice screen; dynamic variables; post-call analysis with evidence; call audio for receipts | A | none: this is the product |
| Wasp | Whole app: Prisma/SQLite, queries and actions, API routes | A | If no page renders by 12:40, switch to Vite + Express and give up the Wasp prize, not the demo |
| Codevisor | The Mac teammate runs every code lane as a parallel agent in its own worktree; `BUILDLOG.md` records a line per merge | A | plain Claude Code / Codex terminals |
| Fiber AI (Dev 3 has access) | Professional context from the applicant's LinkedIn URL via `profileLiveEnrich`, or from reverse email lookup when the returned name matches the application. The box calls Fiber's HTTP API | B1 | GitHub public API. Ploid remains conditional on access |
| Ploid | **Second source, if a key is in hand by 12:30.** Identity resolution and GitHub links; its data is merged into the same dossier with its own source badge | B2 | skip; Fiber + GitHub cover it |
| GitHub public API | Dev 3 reads the consenting applicant's submitted GitHub profile, finds up to three public repositories they own, and uses the top project's README and recent commits to tailor the screen | B1 | Works when Fiber is unavailable. General role questions cover applicants without usable project data |
| Expected Parrot | Tailored questions, plus the 3-persona panel (Principal Engineer, YC Founder, BS Detector) | B1 | ElevenLabs analysis alone |
| Alter | Vaults the Google token; default deny; event creation needs approval; audit trail; the live denial | B1 | In-app gate plus a prefilled Google Calendar link |
| Maritime | The "Donna box": a persistent research and evaluation service per role, with Markdown dossiers on disk | B1 | Same code run locally with `uv` |
| TraceRoot | One trace per candidate; link on the candidate page | B2 | hide the link |
| assistant-ui | "Ask Donna" chat with streaming tool cards | B2 | the static dashboard |
| Rowboat | Dossiers synced to Rowboat's knowledge folder | B2 | hide |
| Fiber AI (second use) | "Find 5 more like this one": a natural-language people search seeded from the top scorer. The result is a draft list, and nobody is contacted | B2 | hide the button |

Claim only what is verified. Say "isolated micro-VM that sleeps", not "Firecracker". Mention a "TraceRoot detector" only if it is actually set up. And "built with parallel agents in Codevisor", not "the whole team in Codevisor": Codevisor doesn't run on Windows.

## Architecture

```
Browser ──► Wasp app (React + Node + Prisma/SQLite)   ← orchestrator, works alone on fixtures
             │ startScreen / finalizeScreen ──► ElevenLabs Agents API (transcript, analysis, audio)
             │ research / evaluate ───────────► Donna box (FastAPI, Python 3.12)
             │                                    ├ Fiber AI (+ Ploid if keyed) + GitHub → dossier.md on disk
             │                                    ├ EDSL → questions, 3-persona panel
             │                                    └ on Maritime (BOX_URL), or local via uv
             │ proposeBooking / decide / attemptWithoutApproval ──► Alter ──► Google Calendar
             └ spans ──► TraceRoot
```

**Repo layout** (from v2): `plan.md`, `AGENTS.md`, `BUILDLOG.md`, `dev1/`–`dev4/` (prd.md, guide.md, lane.md per teammate), `app/` (Wasp: `src/candidate`, `src/founder`, `src/chat`, `src/server/contracts.ts` frozen, `src/server/integrations/*.ts`, `seed/roles.json`, `fixtures/*.json`), `box/` (`main.py`, `research.py`, `panel.py`, `Dockerfile`, `pyproject.toml`). The existing notes move to `docs/`.

Every integration file ships first as a stub that returns fixture data, so each lane can demo before the others land. Each lane edits only its own files.

**Data (SQLite, JSON as strings):**
- `Role{id,title,companyName,founderName,rubric,questions,sourceUrl,isOfficialPosting}`
- `Candidate{id,roleId,name,email,githubUser?,linkedinUrl?,consentAt,status,dossier,conversationId?,transcript,analysis,scorecard,audioPath?,traceUrl?}`
- `Approval{id,candidateId,slotIso,status,alterRef?,deniedAttempt?}`
- `Event{id,candidateId,at,kind,detail}`

Status flow: APPLIED → RESEARCHING → READY → CALLING → EVALUATING → AWAITING_APPROVAL → BOOKED | REJECTED.

**Contracts (locked at 12:05):**
- `POST box/research {name,email,githubUser?,linkedinUrl?,role}` → `{summary,topProject,highlights[],claimsToVerify[],tailoredQuestions[3],sources{fiber,ploid,github}}`. Each source is true or false, and drives the badges.
- `POST box/evaluate {dossier,rubric,transcript[{i,role,text,t}]}` → `{recommendation,overall,personas[{name,score,rationale}],criteria[{name,score,evidenceTurn,quote}],redFlags[],standoutQuote}`
- `startScreen(candidateId,fast)` → `{token,dynamicVariables}`. `finalizeScreen(candidateId,conversationId)` polls ElevenLabs, then stores the transcript, analysis and audio.
- `proposeBooking(candidateId,slotIso)` → Approval PENDING. `decide(approvalId,approve)`. `attemptWithoutApproval(approvalId)` → the real denial.

## Team split: 4 people, 4 lanes (plus wave 2)

| Who | Lane | Owns | Done when |
|---|---|---|---|
| **Brian** | **UI + Donna's voice** | Candidate pages (`src/candidate`), founder dashboard (`src/founder`), the receipts audio player, ApprovalCard UI, all against fixtures. Built as plain React in a Vite sandbox on Windows, then dropped into Wasp `src/` at 12:50. Plus the ElevenLabs Donna agent: prompt, dynamic variables, fast mode, guardrails, text-mode tests (no voice minutes), and the `@elevenlabs/react` browser call | Fixture candidates rank; ▶ plays from the evidence turn; a browser call runs with a candidate's variables; agent tests pass (fairness, under 180 s, handles "I don't know") |
| **Mac teammate** | **Wasp backbone + Codevisor lead** | Wasp scaffold with the Wasp agent plugin, schema, stubs, fixtures, `contracts.ts`, `integrations/elevenlabs.ts` (startScreen and finalizeScreen, audio proxy), merges, `BUILDLOG.md`, the Codevisor crew clip | `wasp start` shows seeded roles; `npm run check:screen` turns a fixture conversation into a scorecard with evidence turns |
| **Dev 3** | **Donna box** | `box/*`: research with Fiber AI for professional context and the GitHub public API for project evidence. After consent, use the submitted GitHub username or profile URL to find public repositories the applicant owns. Use the top project's README and recent commits to tailor questions. GitHub works independently when Fiber is unavailable, and `GITHUB_TOKEN` is optional. Ploid remains conditional on the key cutoff. This lane also owns the EDSL panel, Markdown dossiers, Dockerfile, `integrations/box.ts`, and Maritime deployment. Wave 2: Fiber "find 5 similar" (`POST box/similar`) | `/research` returns a GitHub-backed project, tailored question, and source badge even when Fiber fails. Verify Fiber separately when available. `/evaluate` returns 3 personas on the fixture. The box runs on Maritime or locally with `uv` |
| **Dev 4** | **Trust + ops + submission** | `integrations/alter.ts` (Google connect, policy, propose, decide, attemptWithoutApproval), TraceRoot spans, seed roles from sponsors' YC job pages, pilot runbook (QR, tunnel, consent copy), the video and the submission | Pending → denied attempt recorded → Approve → real invite in an inbox; both appear in the timeline |

**Wave 2** (Codevisor agents, starting 1:20 only if Gate 1 passes): CHAT (assistant-ui "Ask Donna"), OPS (Rowboat sync; Fiber "find 5 similar" is in Dev 3's box), and the **Phase 2 assistant add-ons**: an "Ask Donna about your day" calendar tool, and Donna calling the founder with a brief after a PASS.

## Schedule (to 3:00, freeze at 2:20)

| Time | Gate |
|---|---|
| 11:55–12:05 | Perks redeemed (ElevenLabs Creator first; Maritime, Alter, Expected Parrot, TraceRoot, Ploid). Contracts and `AGENTS.md` committed. Mac teammate opens Codevisor |
| 12:05–12:50 | Wave 1: every lane works alone on stubs and fixtures. Dev 4 connects Google in Alter before 1:00. Lunch 12:30 |
| 12:50–1:20 | Swap stubs for real calls along one path. Brian's components go into Wasp |
| **1:20 Gate 1** | One full run on a laptop: apply → call → receipts play → denied attempt → Approve → invite |
| 1:20–1:45 | Wave 2 starts. Dev 4 posts the pilot link (only if Gate 1 passed) |
| 1:45 | **Anything not passing its check is cut, not rescued** |
| 1:45–2:20 | Merge, polish, two pitch dry runs with fast mode |
| **2:20** | **Freeze.** Record the 2-minute video, including 10 s of the Codevisor crew |
| 2:40–2:55 | Submit: link, video, every partner tool. Rehearse twice |

**Cut order** (drop first to last): Fiber "find similar" → Ploid second source → assistant-ui chat → Rowboat → TraceRoot → Maritime deploy (box stays local) → Expected Parrot panel → Alter (keep the in-app gate) → Fiber research (keep GitHub). **Never cut:** the voice screen, receipts, the founder dashboard, the approval gate.

## Demo (3 minutes, no slides)

| Time | Beat |
|---|---|
| 0:00–0:25 | "Everyone here took a 4-minute phone screen to get in. Someone had to review all of those calls. Donna is the part after the call." If the pilot ran, open the judge's company: "N people screened for your role today." |
| 0:25–1:25 | "Want to try it?" Fast mode. Donna opens with something real from their GitHub, pushes once for specifics, then hangs up |
| 1:25–1:55 | Scorecard. Tap ▶: the candidate's own voice. Point at the panel-split flag |
| 1:55–2:25 | Propose → "Try without approval" → Alter denies, audit line appears → Approve → invite lands |
| 2:25–2:50 | Trace link, the box's dossier files on Maritime, the Codevisor clip |
| 2:50–3:00 | "A recruiting coordinator you can trust with your calendar, and check in 12 seconds." |

**Q&A answers ready:**
- **Bias:** receipts, human approval, no protected topics, agent tests.
- **Candidates using AI to answer:** the questions are about their own repo, with a follow-up push.
- **Other AI interviewers:** they give scores; Donna gives evidence and can't act alone.
- **Cost per screen:** read it off the dashboard.

## Risks

| Risk | Failsafe |
|---|---|
| Wasp is new to the team or the agents | Wasp agent plugin; switch to Vite + Express at 12:40 if nothing renders |
| Brian is on Windows | UI is built in a Vite sandbox and dropped into Wasp; the agent is configured in the ElevenLabs dashboard |
| Usage limits | Mix Claude Code and Codex in Codevisor |
| Public URL for the pilot | `cloudflared` tunnel from the Mac, with the Mac kept awake (`caffeinate`). If it fails, candidates use a laptop |
| Wifi, noise, voice minutes | Fast mode, headset, cached-applicant button, 180 s cap, text-mode prompt tuning |
| Alter OAuth | Connect before 1:00; land one real invite before judging |
| A judge asks about a cut feature | The UI hides cut lanes; the README lists only what runs |

## Verification

- `wasp start` → `/founder` shows seeded roles and fixture candidates
- `npm run check:screen` → every criterion has an evidence turn; ▶ seeks to it
- One live browser screen over the tunnel → transcript, audio and analysis stored
- `curl $BOX_URL/health`, `/research`, `/evaluate` → real data and 3 personas
- Approval → denied attempt recorded → Approve → invite in a real inbox
- ElevenLabs agent tests pass
- Cold run of the 3-minute script twice, once with wifi off to prove the cached path
- Before submitting, open the public link and the video in a private window

## First actions after approval

1. Restructure `yinbri/donna`: move the existing notes into `docs/`, add `plan.md` (this plan), `AGENTS.md`, `dev1/`–`dev4/` (prd.md, guide.md, lane.md per teammate) and `BUILDLOG.md`. Commit and push.
2. The Mac teammate scaffolds Wasp in Codevisor from `AGENTS.md`.
3. Brian starts the Vite UI sandbox against `fixtures/*.json` and creates the Donna agent.
