# Guide: Donna box

How to build, run, deploy and hand off this lane. Requirements are in [prd/donna-box.md](../prd/donna-box.md).

## Setup

```bash
git switch -c lane/donna-box
```

```bash
mkdir box && cd box && uv init --python 3.12
```

```bash
uv add fastapi uvicorn httpx pydantic edsl fiberai python-dotenv
```

Check the package names on PyPI and in each sponsor's docs: `fiberai` is from Fiber's docs, `edsl` is Expected Parrot's. Add `traceroot` later, only if Dev 4 asks you to.

## Layout

```
box/
  main.py        FastAPI app: /health, /research, /evaluate, /similar; X-Box-Secret check
  research.py    fiber(), github(), ploid(), write_questions(), save_dossier()
  panel.py       EDSL personas + survey, aggregate(), validate_evidence()
  models.py      Pydantic models mirroring contracts/contracts.ts
  dossiers/      written at runtime (git-ignored)
  Dockerfile
  pyproject.toml
  .env           git-ignored
```

## Environment (`box/.env`)

```
BOX_SECRET=
FIBER_API_KEY=
GITHUB_TOKEN=            # optional; raises the GitHub rate limit
PLOID_API_KEY=           # optional
EXPECTED_PARROT_API_KEY= # or your own model provider key for EDSL
```

## Run locally

```bash
uv run uvicorn main:app --reload --port 8000
```

```bash
curl -s localhost:8000/health
```

```bash
curl -s -X POST localhost:8000/evaluate -H "X-Box-Secret: $BOX_SECRET" -H "Content-Type: application/json" -d @../fixtures/evaluate-request.json
```

Build `fixtures/evaluate-request.json` from `dossier.json`, the rubric in `roles.json` and the transcript in `conversation.json`, and commit it on your branch; it's in your lane.

## Fiber AI notes

From a quick research pass; confirm in Fiber's docs (docs.fiber.ai, api.fiber.ai/llms.txt):
- Profile live enrich takes a LinkedIn URL and returns the live profile. People search takes filters or natural language.
- Contact reveal (emails or phones) costs credits and **is not needed**. Don't call it.
- Batch jobs are async; for this lane, only use the single synchronous calls.

## EDSL panel sketch

From EDSL's docs (docs.expectedparrot.com); verify the class names there:
- Create 3 `Agent`s with `traits` describing each persona.
- One question per rubric criterion asking for `{score, evidence_turn}` as structured output, run over the scenario (dossier + numbered transcript).
- Run with a fast current model. Check `Model.available()`, and use the offline test model while developing.

## Deploy on Maritime

1. Redeem the perk (code in the Hacker Package; card required, not charged).
2. Install `maritime-cli` (`npm i -g maritime-cli`), then `maritime login`.
3. Create from your repo (it needs the Dockerfile), and set secrets with `maritime env set`. The exact commands are in maritime.sh/docs/quickstart.
4. Send `BOX_URL` and `BOX_SECRET` to the Mac teammate privately, not in git.
5. Show the dossier files on the box during the demo. That's the "persistent agent with state" evidence.

## Hand off

1. On your branch, add `app/src/server/integrations/box.ts` (after the Wasp scaffold is on `main`): if `BOX_URL` is unset, return fixtures; otherwise POST with the secret.
2. Open a PR from `lane/donna-box`, listing which acceptance criteria pass and whether the demo uses Maritime or the local fallback.

## Done-when checklist

See [lanes/donna-box.md](../../lanes/donna-box.md) and the acceptance criteria in the PRD.
