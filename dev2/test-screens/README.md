# Scripted test screens

Seven real conversations with the Donna agent, run on 2026-11-22 between 14:16 and 14:22 EST, each put through the app's own pipeline (`createCandidate`, `startScreen`, `finalizeScreen`). Five scripted candidates took the screen once, and two of them took it a second time to see how much the scores move.

Every scorecard here has `"source": "call_analysis"`: the scores, quotes and feedback come from ElevenLabs' analysis of that conversation, placed on the transcript by `app/src/server/scoring.ts`. None of it is fixture data.

| File | Persona | Run | Result | Overall | Shipped real systems | Depth on own project | Communication | Quotes found in the transcript |
|---|---|---|---|---|---|---|---|---|
| [01-strong-builder.json](01-strong-builder.json) | Strong builder | 1 | PASS | 10 | 10 | 10 | 10 | PASS |
| [02-buzzword-talker.json](02-buzzword-talker.json) | Buzzword talker | 1 | REJECT | 0 | 0 | 0 | 0 | PASS |
| [03-honest-junior.json](03-honest-junior.json) | Honest junior | 1 | MAYBE | 6.7 | 6 | 4 | 10 | PASS |
| [04-evasive.json](04-evasive.json) | Evasive | 1 | REJECT | 0 | 0 | 0 | 0 | PASS |
| [05-mixed.json](05-mixed.json) | Mixed | 1 | PASS | 7.3 | 9 | 6 | 7 | PASS |
| [06-honest-junior-run2.json](06-honest-junior-run2.json) | Honest junior | 2 | MAYBE | 6 | 3 | 5 | 10 | PASS |
| [07-mixed-run2.json](07-mixed-run2.json) | Mixed | 2 | MAYBE | 6.7 | 9 | 7 | 4 | PASS |

PASS is 7 or more overall, MAYBE is 4.5 or more, REJECT is below that.

## What each file holds

- `transcript`: the conversation as the app stored it. Turn `i`, `role` (`agent` is Donna, `user` is the candidate), `text`, and `t`, the second the turn started.
- `scorecard`: what the founder sees. Each criterion has a 0 to 10 score, the candidate turn it rests on (`evidenceTurn`) and a `quote` copied word for word from that turn. `personas` is empty because the 3-persona panel was not connected.
- `elevenLabsAnalysis`: the analysis ElevenLabs returned for the conversation, which the scorecard was built from.
- `evidenceCheck`: PASS when every criterion's quote is inside the candidate turn it cites.

## What the runs showed

- Every quote was found in the turn it cites, in all seven runs.
- The scores are coarse. The two weak candidates got 0 on every criterion and the strong one got 10 on every criterion.
- The scores move between runs. The same scripted answers scored 7.3 (PASS) and then 6.7 (MAYBE) for "Mixed", and single criteria moved by up to 3 points.
- "Mixed" gives a wrong answer about idempotency keys. No criterion covers that, so it shows up only in the red flags and the feedback.
- For the weak candidates the feedback "strengths" read as advice ("Next time, you could...").
- The candidate's answers are scripted and sent in order, so when Donna pushes for specifics an answer can land one question late.
- These are text conversations. There is no recording, so the ▶ buttons have nothing to play for these candidates. A voice call is needed for that.

## Run them again

From `app/`, with `wasp start` running and the ElevenLabs key set. Each run makes real conversations and leaves `Test: <persona>` candidates in the app.

```bash
node scripts/run-test-screens.mjs
```

The files here are that script's raw output with the candidate id, email, conversation id and local audio path removed.
