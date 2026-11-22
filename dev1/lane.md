# Dev 1 (Brian): UI + Donna's voice

Read [AGENTS.md](../AGENTS.md) and the contracts in [contracts/contracts.ts](../contracts/contracts.ts) first.

## Owns

- `ui-sandbox/*`: a Vite + React (+ assistant-ui later) sandbox that runs on Windows with no Wasp
- `app/src/candidate/*` and `app/src/founder/*` once the components move into Wasp at 12:50
- `agent/*`: the Donna agent prompt, dynamic variables and test cases, kept in the repo as text

## Build

**Candidate flow** (`/apply`):
1. Pick company and role (from `fixtures/roles.json`).
2. Enter name, email, GitHub and/or LinkedIn; tick the consent box (AI interviewer, recorded and scored, public profile looked up, highlights may be shown to judges).
3. "Researching you…" with live steps (Fiber ✓, GitHub ✓, Ploid ✓, using `sources` from the dossier).
4. Browser call with Donna via `@elevenlabs/react`, using the agent ID and the `dynamicVariables` from `startScreen`.
5. Feedback page: two strengths and one thing to sharpen. No number.

**Founder flow** (`/founder`):
- Company switcher, roles, and ranked candidates with Advance / Maybe / Pass
- "N screens today · median m:ss" counter
- Candidate page:
  - dossier with source badges
  - **scorecard with ▶ receipts**: each criterion's `evidenceTurn` → that turn's `t` (seconds) → seek an `<audio>` element and play to the next turn
  - persona panel with a "panel split → needs you" flag when persona scores differ by 3+ points
  - transcript, with the evidence turn highlighted when its ▶ is pressed
  - timeline of `Event`s
- `ApprovalCard`: slot, email draft, Approve / Reject / **Try without approval**. It calls the actions in `contracts.ts`; Dev 4 owns the logic behind them.

**Donna agent** (ElevenLabs dashboard; keep the prompt in `agent/prompt.md`):
- Dynamic variables: `candidate_name`, `founder_name`, `company_name`, `role_title`, `top_project`, `tailored_questions`, `demo_fast_mode`.
- First sentence: *"Hi {{candidate_name}}, this is Donna, an AI assistant calling for {{founder_name}} at {{company_name}}. This call is recorded. I saw your work on {{top_project}}. Got a few minutes for a quick screen for the {{role_title}} role?"*
- 1–2 sentences per turn. Push once for specifics on vague answers. 3 questions, 180 s cap; if `demo_fast_mode` is true, 2 questions and about 60 s.
- Never ask about protected topics and never promise an outcome. Close with: *"Thanks, I'll pass my notes to {{founder_name}}."*
- Enable post-call analysis (evaluation criteria with evidence) and keep audio.
- Agent tests: fairness guard (refuses a protected-topic question), stays under 180 s, handles "I don't know".

## Done when

- [ ] Fixture candidates rank on `/founder`, and ▶ plays from the evidence turn in `fixtures/conversation.json` audio (use any local mp3 until real audio exists)
- [ ] ApprovalCard shows all three buttons and renders the PENDING / DENIED / APPROVED states from fixtures
- [ ] A browser call runs with a fixture candidate's variables
- [ ] Agent tests pass
- [ ] Components dropped into Wasp `app/src/` by 12:50
