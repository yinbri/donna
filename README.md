# Donna

A recruiting coordinator you can check in 12 seconds.

Donna researches each applicant, runs a short voice screen with ElevenLabs, and has a 3-persona hiring panel grade the call. Every score comes with a ▶ button that plays the seconds of audio it is based on. She proposes an interview slot but cannot touch the founder's calendar or email anyone until the founder approves, and that rule is enforced outside the model.

Built at the YC Startups x ElevenLabs Hackathon, Waterloo, Nov 22 2026, for the challenge "An AI coworker you'd actually hire".

## Repo map

| Path | What |
|---|---|
| [plan.md](plan.md) | The approved plan: product, architecture, contracts, schedule, cut order |
| [AGENTS.md](AGENTS.md) | Rules for every person and coding agent working in this repo. Read first |
| [docs/branching.md](docs/branching.md) | **Start here:** your branch name, how to merge into `main`, merge windows |
| [dev1/](dev1) | **Brian:** UI + Donna's voice (`prd.md`, `guide.md`, `lane.md`) |
| [dev2/](dev2) | **Dev 2 (Mac):** Wasp backbone + Codevisor lead |
| [dev3/](dev3) | **Dev 3:** Donna box (Fiber AI, GitHub, EDSL, Maritime) |
| [dev4/](dev4) | **Dev 4:** trust + ops + submission (Alter, TraceRoot, pilot, video) |
| [docs/wave-2.md](docs/wave-2.md) | Extras after Gate 1 |
| [contracts/](contracts) | Frozen TypeScript types shared by all lanes |
| [fixtures/](fixtures) | Sample data every stub returns, so lanes work before the others land |
| [BUILDLOG.md](BUILDLOG.md) | One timestamped line per merge |
| [docs/hackathon/](docs/hackathon) | Event notes, sponsor research and earlier ideas |
| `app/` | Wasp app (scaffolded by the Wasp lane) |
| `box/` | The Donna box: Python research and evaluation service (box lane) |

## Status

Only what runs is listed here, from [BUILDLOG.md](BUILDLOG.md). Updated at each merge.

- [x] Wasp app scaffolded (Wasp 0.26.1, SQLite; any integration without a key falls back to fixtures)
- [x] Donna agent in ElevenLabs. Real voice calls run through the app: transcript with timestamps, stored recording, and ▶ on a score plays the quoted seconds (first call 13:10)
- [x] Candidate flow (`/apply`) and founder view (`/founder`) run on the real backend
- [x] Real calls are scored from ElevenLabs' own analysis of the call: three rubric criteria, 0 to 10, each with the candidate's words quoted exactly. Checked on one voice call and on five scripted candidates talking to the real agent in text (`app/scripts/run-test-screens.mjs`: 10, 7.3, 6.7, 0 and 0 overall; the transcripts and scorecards are in [dev2/test-screens](dev2/test-screens/README.md)). Scores are coarse and move between runs: the same answers scored 7.3 and then 6.7
- [x] A candidate who types a GitHub username is asked about their own public repos (GitHub API; checked on two real accounts and one scripted screen). Donna opens with one thinking question before the technical ones
- [x] Approval gate: this checkout runs it in in-app mode (`npm run check:approval`). Dev 4 ran it against live Alter at 13:22 and 13:34
- [x] TraceRoot spans for research, call fetch, evaluation and each approval step (`npm run check:trace` passes with a key set)
- [ ] 3-persona panel and live research (the box, `/research` and `/evaluate`): not connected. Without a GitHub username research returns a fixture dossier, and each scorecard says where its scores came from
- [ ] Gate 1: one full run on the real app with live Alter (apply → call → receipts play → blocked attempt → Approve → invite). Not confirmed yet
- [ ] Test invites from 1:22 and 1:34 confirmed in the demo inbox
- [ ] Pilot: waits on Gate 1, the consent-box fixes, the tunnel link, the QR code and a go before anything is posted
- [ ] Repo public, so judges can open the project link

## Run it

Fresh clone to running app, public HTTPS URL for phones, and QR code: see [dev2/RUNBOOK.md](dev2/RUNBOOK.md). In short, from `app/`: `wasp install`, copy `.env.server.example` to `.env.server`, `wasp db migrate-dev`, `wasp db seed`, `wasp start`, then open http://localhost:3000/dev.

## Built with

Only tools that ran today, each with its evidence. Dev 4 updates this at the 2:20 freeze. A tool is added only when it has run.

- **ElevenLabs:** Donna's live voice screen, plus the transcript and call audio behind every ▶ receipt. First real call at 13:10: 21 turns, 144 s stored.
- **Wasp:** the whole app (Wasp 0.26.1, SQLite, operations, founder view).
- **Alter:** holds the founder's Google Calendar grant. A calendar write without founder approval is held by Alter, and approving releases it, so Google sends the invite. `npm run check:approval` passed in live mode at 13:22 and 13:34 (invites go only to the team's demo inbox).
- **TraceRoot:** one span per pipeline step (research, fetching the call, evaluation), grouped by candidate, with IDs only and no candidate data. A live check at 13:44 sent a span, and it showed in the TraceRoot dashboard. This is tracing only; no detector is set up.
- **Codevisor:** three changes were built at 13:33 by three agents running side by side in Codevisor, each in its own workspace: merging the newer approval gate with its settings docs, seeding the sponsor roles, and this README's status with the runbook. The rest of the code was built with Claude Code agents outside Codevisor.
- **Fiber AI:** applicant research in the Donna box (Dev 3): looks up the work history of the person who applied, using only what they typed, after consent. It ran today in the box (a live lookup took 4.25 s; the code is in `box/`). The app calls the box only when `BOX_URL` and `BOX_SECRET` are set; without them its research step reads GitHub or uses a fixture and does not call Fiber AI.
