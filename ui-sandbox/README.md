# ui-sandbox (Dev 1)

The Donna UI, built as a plain Vite + React app on fixtures so it runs on Windows before the Wasp app exists. At integration the `candidate/`, `founder/`, `components/` and `lib/` folders move into `app/src/`, and only `lib/api.ts` changes to call the Wasp operations.

```powershell
npm install
```

```powershell
npm run dev
```

Open http://localhost:5173.

## Routes

| Route | What |
|---|---|
| `/` | Landing |
| `/apply` | Candidate: role, details, consent. Add `?demo=1` for the 60-second fast mode |
| `/apply/:id/research` | Live research steps |
| `/apply/:id/call` | Voice screen with Donna |
| `/apply/:id/done` | Candidate feedback (no score) |
| `/founder` | Ranked candidates per role, counters |
| `/founder/candidates/:id` | Scorecard with ▶ receipts, panel, dossier, transcript, approval card, timeline |

## Real vs. stubbed

- **Voice call:** simulated from `fixtures/conversation.json` until `VITE_ELEVENLABS_AGENT_ID` is set in `ui-sandbox/.env.local` (git-ignored). With it set, the call uses `@elevenlabs/react` over WebRTC with the candidate's dynamic variables.
- **▶ receipts:** play `/conversation.mp3` (put any mp3 in `public/`) or the candidate's real call audio; without audio they read the quote aloud and the UI says so.
- **Research, panel, Alter:** fixture data, labeled with a yellow tag in the UI. `STUBS` in `src/lib/api.ts` controls the labels.
- **State:** kept in `localStorage`. "Reset demo data" on the founder page restores the seed.

## Design

Warm paper with a dotted grid in light mode, near-black monochrome in dark mode (toggle in the top bar). Serif display type (Instrument Serif), Inter for body, JetBrains Mono for labels, one terracotta accent. Donna's presence is a dot-matrix orb that ripples with voice level.
