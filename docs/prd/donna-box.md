# PRD: Donna box (research + hiring panel)

**Owner:** Dev 3 · **Branch:** `lane/donna-box` · **Guide:** [guides/donna-box.md](../guides/donna-box.md)

## Problem

Generic screening questions get generic, AI-polished answers, and a single LLM score is a black box. Donna needs to know what each candidate actually built so she can ask about it, and her verdict needs to come from several viewpoints that cite the transcript. This lane is Donna's brain: a long-lived service per role that researches applicants, writes their questions, and grades their calls.

## Goals

1. A dossier with 3 tailored "anti-slop" questions in under 15 s from name + email + GitHub/LinkedIn.
2. A 3-persona verdict where every criterion cites the transcript turn behind it, in under 10 s.
3. A real persistent agent on Maritime, holding its dossiers on disk. That is the Maritime prize story.

## Non-goals

The voice call, the UI, the calendar and email. No outreach to anyone: the Fiber "find similar" result is a draft list only.

## Functional requirements

**`GET /health`** → `{ ok: true, sources: { fiber, ploid, github, edsl } }`, showing which keys are configured.

**`POST /research`** (`ResearchRequest` → `ResearchResult`)
1. **Fiber AI (primary):** live-enrich the LinkedIn URL for current and past roles, companies and education. If there's no LinkedIn URL, use a people search on name, email and school.
2. **GitHub:** with `githubUser`, take the top 3 repos by stars or recent push, the top repo's README (first 2,000 characters) and its last 10 commit messages. This sets `topProject`.
3. **Ploid (optional):** only if `PLOID_API_KEY` is set; adds identity and links.
4. **Question writer** (EDSL or one LLM call): 3 questions. Question 1 must be about `topProject` and ask how something was measured, broke, or was decided. Question 2 probes one item from `claimsToVerify`. Question 3 is role-specific. Each is one sentence, speakable aloud, and never about protected topics.
5. Write `dossiers/<roleId>/<slug>.md` (summary, sources, questions) to the box's disk.
6. `sources` flags are true only if that source returned data.
7. If every external source fails, return a valid result built from the role's fallback questions, with all `sources` false. Never return a 500.

**`POST /evaluate`** (`EvaluateRequest` → `EvaluateResult`)
- An EDSL survey run against 3 agent personas: **Principal Engineer** (technical depth), **YC Founder** (ownership, speed, communication) and **BS Detector** (claims versus evidence, vagueness).
- For each rubric criterion, each persona gives a 0–10 score and the transcript turn number `i` of a **candidate** turn as evidence. Combine per criterion (median score; the evidence turn from the persona closest to the median). The `quote` is that turn's verbatim text.
- `recommendation`: PASS if overall is 7 or more with no red flag rated severe; REJECT if under 5; otherwise MAYBE.
- `feedback` for the candidate: 2 strengths, 1 thing to sharpen, no numbers.
- Validate that every `evidenceTurn` exists and is a user turn. Retry once if not.
- Cache by a hash of the inputs.

**`POST /similar`** (wave 2): Fiber natural-language search seeded from the top scorer's profile; returns 5 `{name, title, company, linkedinUrl}`. A draft list; nobody is contacted.

**Security:** every route except `/health` requires the `X-Box-Secret` header. CORS is closed; only the Wasp server calls the box.

**Deploy:** a Dockerfile with Python 3.12 and `uv`, deployed on Maritime. One box per role if time allows; otherwise one box with per-role dossier folders.

## Acceptance criteria

- [ ] `/research` with a teammate's real GitHub and LinkedIn returns a dossier where `sources.fiber` and `sources.github` are true and question 1 names their actual project. The `.md` file exists on the box
- [ ] `/research` with garbage input returns fallback questions, not an error
- [ ] `/evaluate` on `fixtures/conversation.json` returns 3 personas, and every `evidenceTurn` is an odd-numbered (user) turn, in under 10 s
- [ ] The deployed Maritime URL answers `/health`; `BUILDLOG.md` says whether the demo uses Maritime or the local fallback
- [ ] `app/src/server/integrations/box.ts` calls the box when `BOX_URL` is set and returns fixtures when it isn't

## Dependencies

| Needs | From | By |
|---|---|---|
| Fiber API key | Dev 3 (already has access) | 12:05 |
| Expected Parrot perk (@uwaterloo.ca email) or your own model key | Dev 3 | 12:10 |
| Maritime perk redeemed (card required, not charged) | Dev 3 | 12:30 |
| Wasp scaffold for `box.ts` | Mac teammate | ~12:40 |

## Risks

| Risk | Mitigation |
|---|---|
| EDSL needs Python ≤ 3.13 | Pin 3.12 with `uv` |
| Fiber returns nothing for a student | GitHub-only dossier; questions still name a repo |
| Panel too slow | A fast current model, the 3 personas in parallel, caching |
| Maritime deploy stalls | Run locally with `uv`, set `BOX_URL` to the local or tunneled address, and say so honestly |
| Fiber credits | Cache research per email; don't re-enrich on retries |
