# Donna agent settings

Dashboard field names change over time. Match by meaning if a label differs.

## Agent

- **Name:** Donna
- **First message:**
  `Hi {{candidate_name}}, this is Donna, an AI assistant calling for {{founder_name}} at {{company_name}}. This call is recorded. I saw your work on {{top_project}}. Got a few minutes for a quick screen for the {{role_title}} role?`
- **System prompt:** [prompt.md](prompt.md)
- **Language:** English
- **LLM:** a fast current model from the dashboard's list (lowest latency available)
- **Temperature:** low (about 0.3), so she sticks to the questions

## Voice

- A crisp, warm, confident female voice from the voice library; pick one that sounds natural at speed
- **Speed:** slightly above default (about 1.05)
- Turn on **interruptions**

## Dynamic variables

Declare these (all strings except `demo_fast_mode`, a boolean). Give each a placeholder so dashboard test calls work:

| Variable | Test value |
|---|---|
| `candidate_name` | Sam |
| `founder_name` | Alex |
| `company_name` | Acme |
| `role_title` | Founding Engineer |
| `top_project` | a Redis-backed rate limiter library |
| `tailored_questions` | 1. Your rate limiter claims 50k requests per second. How did you measure that, and what broke first? 2. On the payments team, what went wrong with idempotency keys and how did you find out? 3. If you joined tomorrow, what would you want to own in your first two weeks? |
| `founder_focus` | Tech they want to see: Postgres, Redis. Working traits they value: High ownership. |
| `demo_fast_mode` | false |

## Call limits

- **Max conversation duration:** 180 seconds
- **End call when silent for:** about 20 seconds
- Turn on the **end call** system tool, so Donna hangs up after the closing line

## Analysis (post-call)

**Evaluation criteria** (each a pass/fail with rationale; the Expected Parrot panel does the real scoring, so these are a backup):

| Name | Prompt |
|---|---|
| `shipped_real_systems` | Did the candidate describe a real system they built, with concrete details such as numbers, failures or trade-offs? |
| `depth_on_own_project` | When asked about their top project, did they explain how it works and why they made their decisions? |
| `communication` | Were their answers clear and direct, and did they admit what they didn't know? |
| `no_protected_topics` | Did Donna avoid asking about any protected topic (age, family, origin, religion, health, and so on)? |

**Data collection:**

| Name | Type | Description |
|---|---|---|
| `top_project_explained` | string | One sentence: what the candidate said their top project does and their role in it |
| `standout_quote` | string | The single most convincing sentence the candidate said, verbatim |
| `red_flags` | string | Any claim from the resume that the candidate couldn't back up; empty if none |

## Privacy and audio

- Keep **audio recording** on. The receipts player needs the call audio.
- Retention: the default is fine for the hackathon.
