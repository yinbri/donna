# Dev 2 guide: Wasp backbone + Codevisor lead

How to build, run and hand off this lane. Requirements are in [prd.md](prd.md).

## Setup (macOS, Apple silicon)

1. Install Codevisor from codevisor.dev, sign in, and open the `donna` repo.
2. Node 24.22.1 or newer (`node -v`). Then:

```bash
npm i -g @wasp.sh/wasp-cli@latest
```

```bash
claude plugin marketplace add wasp-lang/wasp-agent-plugins
```

```bash
git switch -c lane/wasp-backbone
```

3. Scaffold in `app/` with `wasp new`, picking the basic template. Set the database to SQLite in the Wasp config (check Wasp's docs for the current option name). Run `wasp db migrate-dev`, then `wasp start` (web on port 3000, server on 3001).

## Codevisor crew

Open one worktree per task and give each agent the matching brief plus `AGENTS.md`:

| Worktree branch | Agent | Task |
|---|---|---|
| `lane/wasp-backbone/schema` | Claude Code | Prisma models, seed script from `fixtures/` |
| `lane/wasp-backbone/ops` | Codex | Operations table from the PRD, with stubs |
| `lane/wasp-backbone/elevenlabs` | Claude Code | `integrations/elevenlabs.ts`: signed URL, conversation polling, transcript normalization, audio download |
| `lane/wasp-backbone/check` | Codex | `npm run check:screen` |

Merge each worktree into `lane/wasp-backbone` when its check passes. Log every merge in `BUILDLOG.md`.

## Environment (`app/.env.server`, git-ignored)

```
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
BOX_URL=            # empty = box.ts returns fixtures
BOX_SECRET=
ALTER_API_KEY=      # empty = alter.ts returns fixtures
TRACEROOT_TOKEN=    # empty = no tracing
```

Commit an `app/.env.server.example` with the same keys and no values.

## ElevenLabs integration notes

Verify every endpoint in the ElevenLabs API reference before coding; these come from a quick research pass:
- **Signed URL for a browser session:** look for "get signed url" under the conversational agents API. Requires the agent ID and the API key on the server, never in the browser.
- **Conversation details:** fetch by conversation ID. Returns the status, the transcript with per-turn time in call, and the analysis. Poll until the status is done.
- **Conversation audio:** a separate endpoint by conversation ID. Save it to `app/data/audio/<candidateId>.mp3` (git-ignored) and serve it at `/api/audio/:id`.
- **Transcript normalization:** map each message to `{ i, role: "agent" | "user", text, t }` with `t` in seconds from call start. The receipts player depends on `t` being correct.

## Integrating other lanes (12:50 onward)

1. Merge `lane/wasp-backbone` into `main` first (by about 12:40), so the others have something to drop into.
2. Then, one at a time: Dev 3's `box.ts`, Brian's UI (add their routes to the Wasp config), then Dev 4's `alter.ts` and `traceroot.ts`.
3. After each merge, `wasp start` and click through one candidate before taking the next PR.

## Public URL

```bash
caffeinate -dimsu
```

```bash
cloudflared tunnel --url http://localhost:3000
```

Run them in separate terminals. If the client calls the server on 3001, tunnel that too and set the client's API URL to it. Wasp has an env var for this; check its deploy docs. Fallback: deploy with `wasp deploy` to Railway or Fly.

## Done-when checklist

See [lane.md](lane.md) and the acceptance criteria in the PRD.
