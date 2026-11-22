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
- [x] Donna agent created in ElevenLabs (token endpoint answers; end-call tool and agent tests not set yet)
- [x] One real call made through the dev console: transcript with timestamps, stored recording, audio seek from the scorecard
- [x] Approval gate merged, running in in-app mode (`npm run check:approval`). Live Alter not yet run on `main`
- [ ] Research and scoring box (`/research`, `/evaluate`): still returns fixtures
- [ ] Real UI ported onto the backend (adapter and port guide exist; not yet run in a browser)
- [ ] TraceRoot tracing: `main` has only the stub, so the app sends no traces. The real client is on `lane/trust-ops`; it still needs merging, its package installed and the key set on the demo Mac
- [ ] Gate 1: one full run on the real app (apply → call → receipts play → blocked attempt → Approve → invite). Not confirmed yet
- [ ] Test invites from 1:22 and 1:34 confirmed in the demo inbox
- [ ] Pilot: waits on Gate 1, the two consent-box fixes, the tunnel link, the QR code and a go before anything is posted
- [ ] Repo public, so judges can open the project link

## Run it

Fresh clone to running app, public HTTPS URL for phones, and QR code: see [dev2/RUNBOOK.md](dev2/RUNBOOK.md). In short, from `app/`: `wasp install`, copy `.env.server.example` to `.env.server`, `wasp db migrate-dev`, `wasp db seed`, `wasp start`, then open http://localhost:3000/dev.
