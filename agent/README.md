# Donna agent (ElevenLabs)

Donna's voice agent configuration, kept in the repo so changes are reviewed. The live agent is configured in the ElevenLabs dashboard (Agents → Donna); this folder is the source of truth to paste from.

| File | What |
|---|---|
| [prompt.md](prompt.md) | System prompt |
| [settings.md](settings.md) | First message, voice, dynamic variables, evaluation criteria, data collection, call limits |
| [tests.md](tests.md) | Agent tests to add in the dashboard |
| [ask-donna-prompt.md](ask-donna-prompt.md) | Prompt for the separate text-only agent behind the founder's Ask Donna chat (`ELEVENLABS_CHAT_AGENT_ID`, created by `app/scripts/create-text-agent.mjs chat`) |
| [scoring-guidelines.md](scoring-guidelines.md) | Scoring guidelines: the prompt for the text-only agent that scores each screen (`ELEVENLABS_SCORER_AGENT_ID`, created by `app/scripts/create-text-agent.mjs scorer`) |

## After creating the agent

1. Copy the **agent ID** from the agent's page.
2. Put it in `ui-sandbox/.env.local` (git-ignored) as `VITE_ELEVENLABS_AGENT_ID=<id>`, then restart `npm run dev`. The call page switches from the simulated call to the real agent.
3. Send the agent ID to Dev 2 for `app/.env.server` (`ELEVENLABS_AGENT_ID`). The API key never goes in the browser or in git.
4. While the agent is public (no auth), the browser connects with just the agent ID. Before the pilot, turn on authentication and have the Wasp server issue a signed URL or conversation token in `startScreen`.
