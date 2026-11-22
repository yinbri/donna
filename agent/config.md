# Donna: dashboard settings

Everything to set on the "Donna" agent in the ElevenLabs dashboard, besides the prompt in [prompt.md](prompt.md). Check each field name against the dashboard as you go; these are written from the docs, not exported.

## Agent

| Setting | Value |
|---|---|
| Name | Donna |
| First message | From [prompt.md](prompt.md) |
| System prompt | From [prompt.md](prompt.md) |
| Language | English |
| LLM | A fast model (latency matters more than depth here) |
| Tools | System tool **End call** on |

## Voice

| Setting | Value |
|---|---|
| Voice | Crisp and warm, natural pace |
| Interruptions | On |

## Dynamic variables

Declare all seven. The browser call passes them from `StartScreenResult.dynamicVariables` in [contracts/contracts.ts](../contracts/contracts.ts). Placeholders are for dashboard tests only.

| Variable | Type | Test placeholder (from the fixtures) |
|---|---|---|
| `candidate_name` | string | Sam |
| `founder_name` | string | Alex |
| `company_name` | string | Acme |
| `role_title` | string | Founding Engineer |
| `top_project` | string | a Redis-backed rate limiter library |
| `tailored_questions` | string (newline-joined) | The three `tailoredQuestions` from `fixtures/dossier.json` |
| `demo_fast_mode` | boolean | false |

The same values are in [test-variables.json](test-variables.json) for pasting.

## Call limits

| Setting | Value |
|---|---|
| Max conversation duration | 180 seconds (the UI also hangs up at 180 s) |
| Silence end-call timeout | 20 seconds |

## Analysis

Turn on post-call analysis. Add one **evaluation criterion** per rubric line in `fixtures/roles.json`. The box does the real scoring with evidence turns; these are a second opinion the backend saves in `analysis`.

| ID | Prompt |
|---|---|
| `shipped_real_systems` | Did the candidate describe a real system they built or ran, with concrete details (tools, numbers, what broke)? Quote the turn. |
| `depth_on_own_project` | Did the candidate explain the design and trade-offs of their own project in depth, beyond what a README would say? Quote the turn. |
| `communication` | Were the candidate's answers clear, direct and honest about what they did and didn't do? Quote the turn. |
| `fairness_guard` | Did Donna avoid every protected topic and avoid promising any outcome? Success means yes. |

Add **data collection** fields:

| ID | Type | Description |
|---|---|---|
| `top_project_confirmed` | boolean | The candidate confirmed they built {{top_project}} themselves |
| `standout_quote` | string | The single most specific thing the candidate said, verbatim |

## Privacy and audio

- Keep call audio (the receipts player needs it). Leave retention at the default or longer than the event.
- Authentication: off for local testing with the public agent ID; switch to signed URLs once Dev 2's `startScreen` returns one.

## Hand-off

Put the agent ID in `ui-sandbox/.env.local` as `VITE_ELEVENLABS_AGENT_ID` (git-ignored), and send it to Dev 2 for `ELEVENLABS_AGENT_ID` in `app/.env.server`. Never commit it alongside an API key.
