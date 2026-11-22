# Lane: Donna box (Dev 3)

Read [AGENTS.md](../AGENTS.md) and [contracts/contracts.ts](../contracts/contracts.ts) first.

## Owns

`box/*` (FastAPI, Python **3.12** via `uv`; EDSL does not support 3.14) and `app/src/server/integrations/box.ts`.

## Build

1. `box/main.py`: FastAPI with `GET /health`, `POST /research`, `POST /evaluate`, and later `POST /similar`. Every route checks an `X-Box-Secret` header.
2. **`/research`** (`box/research.py`), returning `ResearchResult` from the contracts:
   - **Fiber AI first** (you have access): live-enrich the LinkedIn URL for work history and company context; fall back to a people search on name and email. Python SDK `fiberai`; check the docs at docs.fiber.ai first.
   - **GitHub public API:** top repos by stars or recent pushes, plus README and recent commit messages of the top one. This feeds `topProject` and the "what did you actually build" question.
   - **Ploid** as a second source, only if a key is in hand by 12:30.
   - Use EDSL (or one LLM call) to write `tailoredQuestions[3]` (one must be about `topProject`) and `claimsToVerify`.
   - Write `dossiers/<role-id>/<candidate-slug>.md` to disk. This is the persistent state that makes it a real Maritime agent.
   - Set `sources.fiber`, `sources.ploid` and `sources.github` to whether each one returned data.
3. **`/evaluate`** (`box/panel.py`): an EDSL survey run against 3 agent personas: Principal Engineer, YC Founder and BS Detector. The inputs are the dossier, the rubric and the numbered transcript. Each persona scores every rubric criterion and **must cite the transcript turn number** behind each score. Return `EvaluateResult`. Use a current fast model and confirm it with `Model.available()`. Cache results.
4. `box/Dockerfile` and `pyproject.toml`, deployed to Maritime (`maritime-cli create ... --repo`). Use one box per role if there is time; one box total is fine.
5. `app/src/server/integrations/box.ts`: calls `BOX_URL` with the secret. If `BOX_URL` is unset, it returns fixtures.
6. Wave 2: `POST /similar` uses a Fiber natural-language people search seeded from the top scorer and returns a draft list of 5. Nobody is contacted.

## Done when

- [ ] `curl $BOX_URL/research` with a teammate's GitHub and LinkedIn returns a real Fiber-backed dossier with source flags, and the `.md` file exists on disk
- [ ] `curl $BOX_URL/evaluate` with `fixtures/conversation.json` returns 3 personas and `criteria[].evidenceTurn` in under 10 s
- [ ] It runs on Maritime, or locally with `uv run` as the fallback, and says which in `BUILDLOG.md`
