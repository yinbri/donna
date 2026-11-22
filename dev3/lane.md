# Dev 3: Donna box

Read [AGENTS.md](../AGENTS.md) and [contracts/contracts.ts](../contracts/contracts.ts) first.

## Owns

`box/*` (FastAPI, Python **3.12** via `uv`; EDSL does not support 3.14) and `app/src/server/integrations/box.ts`.

## Build

1. `box/main.py`: FastAPI with public `GET /health` and secret-protected `POST /research` and `POST /evaluate`. `POST /similar` is Wave 2.
2. **`/research`** (`box/research.py`), returning `ResearchResult` from the contracts:
   - **Fiber AI:** live-enrich the submitted LinkedIn URL for work history. Without a usable LinkedIn URL, resolve the submitted email and accept the result only when the name matches. Use Fiber's HTTP API.
   - **GitHub public API:** top repos by stars or recent pushes, plus README and recent commit messages of the top one. This feeds `topProject` and the "what did you actually build" question.
   - **Ploid** as a second source, only if a key is in hand by 12:30.
   - The demo uses interview templates grounded in the dossier and role. When GitHub returns a project, the first question names it. Model-written questions were outside the verified demo path.
   - Save the Markdown dossier in a per-role folder. The frozen request carries role title and company, so the box derives the directory from those fields.
   - Set `sources.fiber`, `sources.ploid` and `sources.github` to whether each one returned data.
3. **`/evaluate`** (`box/panel.py`): an EDSL survey run against 3 agent personas: Principal Engineer, YC Founder and BS Detector. The inputs are the dossier, the rubric and the numbered transcript. Each persona scores every rubric criterion and **must cite the transcript turn number** behind each score. Return `EvaluateResult`. Use a current fast model and confirm it with `Model.available()`. Cache results.
4. `box/Dockerfile` and `pyproject.toml` support the local box and Maritime ZIP packaging. The demo fallback runs locally.
5. `app/src/server/integrations/box.ts`: calls `BOX_URL` with the secret. If `BOX_URL` is unset, it returns fixtures.
6. Wave 2: `POST /similar` uses a Fiber natural-language people search seeded from the top scorer and returns a draft list of 5. Nobody is contacted.

## Done when

- [x] Live Fiber lookup on an authorized LinkedIn profile returns a dossier with a Fiber source flag and a Markdown file.
- [x] Live GitHub lookup on GitHub's public example account returns a project and three questions. A provider-mock run covers both sources together.
- [x] The fixture evaluation and the offline EDSL survey return three personas with valid candidate receipts in under 10 seconds.
- [ ] Verify the same timing with a live EDSL credential before promoting it for real calls.
- [x] The box runs locally. Maritime remains unverified. Dev 2 owns the demo-mode entry in `BUILDLOG.md`.
