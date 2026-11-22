# Guide: UI + Donna's voice

How to build, run and hand off this lane. Requirements are in [prd/ui-voice.md](../prd/ui-voice.md).

## Setup (Windows, no WSL needed)

```powershell
git switch -c lane/ui-voice
```

```powershell
npm create vite@latest ui-sandbox -- --template react-ts
```

```powershell
cd ui-sandbox; npm install; npm install @elevenlabs/react
```

```powershell
npm run dev
```

Read fixtures straight from the repo: `import panel from "../../fixtures/panel.json"`. Import types from `../../contracts/contracts.ts`. If Vite blocks files outside its root, set `server.fs.allow: [".."]` in `vite.config.ts`.

## Folder layout

```
ui-sandbox/src/
  candidate/  ApplyPage.tsx  ResearchSteps.tsx  CallPage.tsx  FeedbackPage.tsx
  founder/    FounderHome.tsx  CandidatePage.tsx  DossierCard.tsx  Scorecard.tsx
              PersonaPanel.tsx  Transcript.tsx  ApprovalCard.tsx  Timeline.tsx
  lib/        api.ts   (one function per operation; returns fixtures for now)
```

Keep every data access behind `lib/api.ts`. At integration, only that file changes to call the Wasp operations; the components move to `app/src/candidate` and `app/src/founder` unchanged.

## Receipts player (the key feature)

```ts
// Scorecard row ▶ handler
const turn = transcript[criterion.evidenceTurn];
const next = transcript.find(t => t.i > turn.i);
audio.currentTime = turn.t;
audio.play();
const stopAt = next ? next.t : audio.duration;
const onTime = () => { if (audio.currentTime >= stopAt) { audio.pause(); audio.removeEventListener("timeupdate", onTime); } };
audio.addEventListener("timeupdate", onTime);
setHighlightedTurn(turn.i);
```

Until real audio exists, put any mp3 at `ui-sandbox/public/conversation.mp3`.

## Browser call

Use the `useConversation` hook from `@elevenlabs/react`. Start a session with the agent ID (or the signed URL from `startScreen`) and pass `dynamicVariables`. Check the exact option names in the ElevenLabs React SDK docs (elevenlabs.io/docs, "React SDK") before wiring it. Show `status` and `isSpeaking` in the UI. Save the returned conversation ID; the backend needs it for `finalizeScreen`.

For local testing before the backend exists, use the public agent ID directly. Switch to signed URLs once the Wasp operation is live.

## Donna agent

1. In the ElevenLabs dashboard, create the agent "Donna". Choose a voice that sounds crisp and warm, and turn on interruptions.
2. Paste the prompt from `agent/prompt.md` (write it there first so it's versioned). Declare the dynamic variables `candidate_name`, `founder_name`, `company_name`, `role_title`, `top_project`, `tailored_questions` and `demo_fast_mode`.
3. Turn on post-call analysis. Add evaluation criteria matching the fixture rubric, and keep the audio.
4. Add agent tests: "Are you married?" must be politely declined; a long-winded candidate must still finish under 180 s; "I don't know" gets one follow-up, then moves on.
5. Put the agent ID in `ui-sandbox/.env.local` as `VITE_ELEVENLABS_AGENT_ID`. It is git-ignored. Send it to the Mac teammate for `app/.env.server`.

## Hand off (12:50)

1. Pull `main` (which should now have the Wasp scaffold).
2. Copy `ui-sandbox/src/candidate` and `ui-sandbox/src/founder` into `app/src/`. Point `lib/api.ts` at the Wasp operations.
3. Ask the Mac teammate to add the routes in the Wasp config. They own that file.
4. Open a PR from `lane/ui-voice` and list which acceptance criteria pass.

## Done-when checklist

See [lanes/ui-voice.md](../../lanes/ui-voice.md) and the acceptance criteria in the PRD.
