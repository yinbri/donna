# Sponsor use cases

Small building blocks for each sponsor, to combine into a larger project once the challenge is revealed at 10:00. Researched on Nov 22 from each sponsor's docs.

Remember the judging: 25% of the score is **use of ElevenLabs and partner tools, central to the product, not bolted on**. Every partner tool used must be listed in the submission.

## Quick comparison

| Sponsor | What you actually get | Setup | Prize for using it | Watch out for |
|---|---|---|---|---|
| ElevenLabs | Voice agents, TTS, speech-to-text, voices, SFX, music, dubbing | 15–30 min | Best Use of ElevenLabs | Required by the theme anyway |
| Maritime | Hosting for agents on sleeping micro-VMs, plus desktops and phones for computer-use | 10–20 min | Best agents on Maritime (top 3) | Card needed; bring your own LLM key |
| Fiber AI | B2B people and company search, emails and phones, LinkedIn enrich | 10–15 min | Not a named prize | Every reveal costs credits |
| Ploid | People search over 2B profiles, emails and phones, GitHub search | 15–30 min | Not a named prize | Codes handed out at kickoff |
| Expected Parrot | Simulated survey respondents (Python, EDSL) | Under 15 min | Not a named prize | Python only; needs uwaterloo.ca email for the perk |
| TraceRoot | Tracing, failure detection and evals for agents | 15–30 min | Not a named prize | Code announced at kickoff |
| Alter | Credential vault and policy proxy between agents and APIs, with human approval | 20–30 min | Not a named prize | Google shows an "unverified app" warning |
| assistant-ui | React chat UI with tool UIs, voice hooks and cloud thread storage | 15–30 min | Not a named prize | Cloud code is Nov 22 only, renews at $50/mo |
| Wasp | Full-stack React + Node framework; Open SaaS template with auth, payments, admin | 30–60 min | Best project built with Wasp | Needs WSL2 on Windows, Node 24+, Postgres |
| Rowboat Labs | Open-source multi-agent group chat with memory; MCP in and out | Minutes (hosted) | Not a named prize | Self-hosting needs Postgres + OIDC |
| Codevisor | Desktop app running parallel coding agents in git worktrees | Minutes | Best project built with Codevisor (Mac mini) | **macOS (Apple silicon) or Linux only, no Windows** |
| Keike | Unknown | | | No product found; ask an organizer |

## ElevenLabs

Voice agents ("ElevenAgents") chain speech-to-text, your choice of LLM and TTS, with function calling. SDKs: `@elevenlabs/react`, `@elevenlabs/client`, Python `elevenlabs`. Agents can call client tools (in the browser), webhook tools (your backend) and MCP servers, use a knowledge base, and answer or place phone calls through Twilio.

- Voice agent on a web page whose client tool changes the UI (navigates, fills a form, highlights a result)
- Agent with a webhook tool that reads or writes your own backend
- Knowledge-base agent that answers questions from uploaded PDFs
- Phone number that answers calls and posts a summary via post-call webhook
- Outbound calling agent: places a call on your behalf and reports back
- Scribe transcription with speaker labels and word timestamps for a recorded meeting
- Sound effects or music generated from app events
- Narration in a custom-designed or cloned voice
- Dubbing a short clip into another language

## Maritime

Hosting for AI agents: each agent gets an isolated micro-VM that sleeps when idle. Also ephemeral VMs, Linux/Windows desktops and Android phones for computer-use agents, Telegram/WhatsApp channels and scheduled triggers. CLI: `maritime-cli` (`create --template claude_code|codex|...` or `--repo`, `logs`, `env set`, `sandbox exec`).

- Host the project's agent backend so the demo runs on a real deployment
- One persistent agent per user, keyed by user ID
- Telegram or WhatsApp agent through channels
- Scheduled agent run (daily digest, nightly check)
- Throwaway VM that safely runs AI-written code
- Computer-use agent driving a Linux desktop with a screenshot loop
- Android phone the agent operates to test or use a mobile app

## Fiber AI

B2B data API: search companies and people by filters or natural language, reveal work emails and phones, live-enrich LinkedIn profiles. Node `@fiberai/sdk`, Python `fiberai`, and an MCP server that works in Claude Code.

- Natural-language lead search ("CTOs at Series A fintechs in Toronto") into a ranked list
- LinkedIn URL to email and phone lookup
- Pre-meeting brief built from a live LinkedIn profile
- Lead-gen agent in Claude Code through the MCP server
- Company lookalike finder from one example company
- Voice SDR: Fiber finds the contact, ElevenLabs makes the call

## Ploid

People search over public data on more than 2B people: search by role, company, location or seniority; resolve a name to a person; enrich with emails and phones; search GitHub. REST at `api.ploid.com/v1` (`/search`, `/person`, `/enrich`, `/github/search`), a CLI, and an MCP server with `research_person` and `find_decision_makers`.

- "Who should I talk to at company X about Y" answered with a short list
- Research a person before a call, then draft personalized outreach
- Rank a list of leads or attendees against an ideal customer profile
- Find GitHub users with a given skill set to recruit
- Fill title, company and LinkedIn for every row of a CSV
- Slack or Discord bot that answers "who is X?"

Fiber AI and Ploid overlap heavily. Pick one unless comparing them is the point.

## Expected Parrot

EDSL, an open-source Python package: write survey questions, cross them with simulated respondent personas and input variations, and run the grid against one or more LLMs. Results come back as a table (`results.to_pandas()`). Runs offline with a test model, so you can build before keys are set up.

- Test 5 headlines or pitches on 20 personas and chart which win
- Willingness to pay at four price points, by segment
- Pre-test a survey on synthetic respondents before sending it to people
- Feature prioritization poll on a synthetic panel built from a CSV
- Compare the same question across GPT, Claude and Gemini
- Predict how different customer types react to a support reply

## TraceRoot

Open-source tracing and evaluation for AI agents. Instruments LLM and tool calls, runs "detectors" that flag failures, hallucinations or drift, clusters failures and runs evals on datasets. `pip install traceroot` or `@traceroot-ai/traceroot`; one `initialize` call.

- Trace tree of every agent step, shown during the demo
- Detector that flags hallucinated answers in a RAG or voice agent
- Alert when an agent run fails
- Eval before and after a prompt change, with scores compared
- Break a tool on purpose and show the failure caught and clustered
- In-app "why did the agent do that" debug panel

## Alter

A proxy between agents and third-party APIs. Alter holds OAuth tokens and keys, so the agent never sees them. Policies deny by default and can limit operations or fields ("no email outside the company", "no refund over $50"). Risky calls pause for human approval, and every call is logged. 130+ providers. SDKs `alter-sdk` (Python) and `@alter-ai/alter-sdk`: `app.connect()`, `app.proxy_request()`, `app.await_approval()`.

- Calendar agent that reads Google Calendar without holding the token
- Email agent blocked from sending outside your domain, with the blocked attempt shown live
- Payment or refund agent where amounts over a limit need a human tap to approve
- MCP tool server whose GitHub or Slack tools go through Alter with scoped access
- One-click "revoke the agent's access" button
- Audit log of what the agent did, for whom

## assistant-ui

Open-source React chat components connected to a backend through runtimes (Vercel AI SDK, LangGraph, custom). Tools can render their own UI, ask a human to approve, or come from an MCP server. Voice support: read-aloud and dictation adapters, plus realtime voice. There is no built-in ElevenLabs adapter, but there is a `with-elevenlabs-scribe` example, and you can write a speech adapter for ElevenLabs TTS. Assistant Cloud stores threads.

- Chat where a tool call renders a card (results, chart, map) instead of text
- Approval button before the agent sends or buys anything
- Dictation with ElevenLabs Scribe and replies read aloud in an ElevenLabs voice
- Thread history that persists across devices through Assistant Cloud
- Chat UI that drives an MCP server
- Step-by-step view of a multi-step agent

## Wasp

A full-stack framework: one config file declares routes, auth, operations and cron jobs, and it generates React, Node and Prisma/Postgres. Open SaaS adds Stripe/Polar/Lemon Squeezy payments, an admin dashboard, S3 uploads and analytics. `wasp new`, `wasp start`, `wasp deploy` (Fly.io or Railway).

- Google-login app with a database in under an hour
- Daily cron job that emails a digest
- Paywall around an AI feature with Stripe test mode
- Upload a file to S3, then summarize it with AI
- Admin dashboard of usage
- One-command deploy for a live demo URL

On Windows it needs WSL2, with the project on the Linux filesystem. Set it up before 11:00 if you plan to use it.

## Rowboat Labs

Open-source "agent team in a group chat": agents (hosted or your own, such as Claude Code) post in shared Spaces, hand work to each other and share docs and task lists. A desktop app builds a memory graph from email, meetings and chats. MCP both ways: each Space exposes `/mcp`, and the app can use external MCP servers.

- Connect Claude Code to a Space so it posts progress and takes tasks
- Researcher and writer agents handing off a report in one Space
- Background agent that triages email and drafts replies
- Meeting transcript turned into action items posted to the Space
- Plug Ploid's or Fiber's MCP into Rowboat for people lookups in chat

## Codevisor

A desktop app that runs several coding agents (Claude Code, Codex and others) side by side, each in its own git worktree, with machine stats and phone control. It is a tool for building, not a library to build on, so "built with Codevisor" most likely means the team ran parallel agents in it during the day. That reading is an inference; the prize criteria are not published.

- Split frontend, backend and tests across three parallel agents
- Run two agents on the same feature and keep the better result
- Have an agent browse the app to QA it
- Watch agents from a phone during the demo

**macOS on Apple silicon, or Linux, only.** It does not run on Windows; a teammate with a Mac is needed to go for the Mac mini.

## Keike

Listed as YC X25 in the Nov 19 email and the Hacker Package, but no product, site or YC listing could be found. Ask an organizer what it is.

## Building blocks that combine

Each line joins pieces above into the start of a larger idea.

| Combo | Sketch |
|---|---|
| ElevenLabs + Fiber or Ploid | Voice agent that researches a person, then calls them or briefs you aloud before a meeting |
| ElevenLabs + Alter | Voice assistant that can act on your email or calendar, with risky actions pausing for approval |
| ElevenLabs + assistant-ui | Chat interface that you can talk to and that talks back, with tool UIs on screen |
| ElevenLabs + Maritime | Phone or WhatsApp voice agent running on a real deployment |
| ElevenLabs + Expected Parrot | Simulate how different personas react to a voice agent's script before going live |
| ElevenLabs + TraceRoot | Voice agent whose every turn is traced, with hallucinations flagged |
| Wasp + any of the above | Full app with login, database and payments around the agent |
| Rowboat + Ploid or Fiber | Agent team that shares a memory of the people and companies it has researched |
| Codevisor | How the team builds, whatever the project is |

Prizes with a named partner category: ElevenLabs, Maritime, Codevisor and Wasp. Partner prizes stack with anything, so one project can target several.
