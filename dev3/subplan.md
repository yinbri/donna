# Dev 3 Donna box subplan

Branch: `lane/donna-box`. See [lane.md](lane.md) and the [frozen contract](../contracts/contracts.ts).

1. Run the Python 3.12 FastAPI box locally with the shared fixtures and no provider keys. Check public health and the shared secret on both POST routes.
2. After Wasp records consent, enrich the submitted LinkedIn URL with Fiber or resolve the submitted email. Fetch project evidence from the submitted GitHub handle. Write three questions and persist a Markdown dossier. Verify the live response, source flags, and dossier with a consenting teammate in under 15 seconds.
3. Run the three EDSL personas and check every receipt against the candidate's actual turn number. Use the fixture conversation to check the 10-second target. If live evaluation is unavailable, keep the known demo fixture usable.
4. Hand off the Wasp adapter with the stub and HTTP paths to Dev 2. Test the integrated flow once the Wasp scaffold lands.
5. Verify the local service before attempting Maritime. Deploy a single box with separate role folders under the persistent data directory. Keep local `uv` available for the demo.

Ploid is subject to the key cutoff. Similar-person search is a stretch after Gate 1 and the first feature to cut.

## Run the box

From the repository root, copy `box/.env.example` to `box/.env` and set a shared `BOX_SECRET`. Run `uv run --project box python box/main.py`. The box listens on port 8000 locally. `GET /health` is public. Send the secret as `X-Box-Secret` for research and evaluation.

For live research and evaluation, set `BOX_MODE=live`, add the Fiber key and either the Expected Parrot or OpenAI key, and run `uv run --project box --extra live python box/main.py`. GitHub uses public repository data and supports an optional `GITHUB_TOKEN` for rate limits. The box calls Fiber's HTTP endpoints directly to avoid the generated SDK's slow cold import on Windows. It looks up the submitted LinkedIn profile or the submitted email with a matching name. Questions come from templates that use the project and role context. A failed provider can be skipped, and evaluation falls back to the fixture only for the demo transcript and rubric. [Fiber Live Fetch](https://docs.fiber.ai/linkedin/live-fetch) · [Reverse Email Lookup](https://docs.fiber.ai/enrichment/reverse-email-lookup)

The Wasp server calls the adapter after recording applicant consent. For local live research, set `BOX_URL=http://127.0.0.1:8000` and the matching `BOX_SECRET` in `app/.env.server`. Without a URL, the adapter uses Wasp's bundled fixtures. For a real call without a working panel, the box returns 503. Wasp records ElevenLabs analysis before calling the box. Dev 2 owns the remaining wiring to turn that analysis into a founder scorecard.

When Fiber is unavailable, the applicant's submitted GitHub username or profile URL can still supply a project and a tailored question. GitHub-only research works in live mode with no Fiber key. If the applicant provides no GitHub handle and Fiber is unavailable, the box uses general role questions.

## Verification

- The 13-case box suite covers fixtures, authorization, input validation, receipt validation, panel caching, provider failures, and Markdown persistence. Wasp compiled and passed `npm run check:screen` against a fresh temporary database. The configured adapter also verified fixture receipts against the running local box over HTTP in 52 ms.
- Live Fiber research on an authorized applicant took 4.25 s. Live GitHub research on GitHub's Octocat example took 0.60 s. Both produced a dossier and three questions. A combined response was covered with provider mocks.
- The three-persona survey with EDSL's offline model took 0.26 s. Live model timing still needs an Expected Parrot or OpenAI key. Ploid and Wave 2 were cut from the verified demo path. Maritime is unverified, so report local box use to the owner of `BUILDLOG.md`.

## Maritime handoff

Build locally from the repo root with `docker build -f box/Dockerfile -t donna-box .`. For Maritime's ZIP source, put a copy of `box/Dockerfile` at the archive root, with the source files under `box/` and the three fixtures named in the Dockerfile under `fixtures/`. Build the archive from those files only. Configure the environment in Maritime, verify `/health`, and confirm a dossier under `/data/dossiers` survives a restart before switching the demo's `BOX_URL`. [Maritime build docs](https://maritime.sh/docs/builds) · [Public web agents](https://maritime.sh/docs/web-apps)
