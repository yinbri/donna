# Dev 3 guide: Donna box

How to build, run, deploy and hand off this lane. Requirements are in [prd.md](prd.md).

## Run locally

From the repo root, copy `box/.env.example` to `box/.env` and set `BOX_SECRET`. Start the service with `uv run --project box --locked python box/main.py`. It listens on port 8000 by default. Check `GET /health`, then pass `X-Box-Secret` on both POST routes.

For live research, set `BOX_MODE=live`. Set `FIBER_API_KEY` for LinkedIn or email enrichment. `GITHUB_TOKEN` is optional. For the live panel, set `EXPECTED_PARROT_API_KEY` or `OPENAI_API_KEY` and add `--extra live` to the `uv run` command before `python`.

## Layout

```
box/
  main.py        FastAPI routes and shared secret
  research.py    Fiber and GitHub lookups, questions, and dossier persistence
  panel.py       EDSL personas, evidence validation, and aggregation
  models.py      Pydantic models mirroring contracts/contracts.ts
  dossiers/      written at runtime (git-ignored)
  Dockerfile
  pyproject.toml
  .env           git-ignored
```

## Verify

`uv run --project box --locked python -m unittest discover -s box -p test_box.py -v` runs the local route and provider-mock suite. It reads the shared conversation and panel fixtures. The exact fixture transcript and rubric get the fixture scorecard. Live calls require a working panel key for an evidence-backed box scorecard.

For a live smoke test, submit the GitHub or LinkedIn profile of a consenting applicant and check the source flags and dossier. Fiber uses [LinkedIn Live Fetch](https://docs.fiber.ai/linkedin/live-fetch) and [reverse email lookup](https://docs.fiber.ai/enrichment/reverse-email-lookup). GitHub reads public project evidence for the submitted profile.

## Deploy on Maritime

The [subplan](subplan.md#maritime-handoff) documents Docker and Maritime ZIP packaging. Verify health, a dossier on disk, and restart persistence before promoting a deployed URL.

## Hand off

Configure `BOX_URL` and the matching `BOX_SECRET` in `app/.env.server`. The adapter uses Wasp's bundled fixtures when `BOX_URL` is absent. Keep credentials out of the PR and report which acceptance checks passed.

## Done-when checklist

See [lane.md](lane.md) and the acceptance criteria in the PRD.
