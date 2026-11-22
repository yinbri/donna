# Porting ui-sandbox into the Wasp app

Adapter: `app/src/dev/uiApi.ts`. It keeps the sandbox `lib/api` names and maps the backbone's `CandidateView` onto the sandbox's `UICandidate`. Source of truth for the sandbox: `origin/dev1-brian` (`origin/lane/ui-voice` differs only in `agent/*`, one line of `CallPage.tsx` and the deleted `public/conversation.mp3`).

**Status (12:55):** the adapter compiles inside the Wasp app, and the app's `react-router` 8 does export `Link`, `NavLink`, `useParams`, `useSearchParams`, `useNavigate` and `Outlet`. Nothing else here has been run: the port steps in section c and the route block in section d were written from reading the sandbox code and are untested. Expect small fixes when you compile.

## a. Function map

| Sandbox call | Wasp operation(s) | Notes |
|---|---|---|
| `useCandidates()` | `useQuery(listCandidates, {})` | `[]` while loading. Sorted by the server (overall desc). |
| `useCandidate(id)` | `useQuery(getCandidate, { id })` | `undefined` while loading. `scorecard` → `evaluation`, last of `approvals` → `approval`, `null` → `undefined`, `audioUrl` made absolute with `config.apiUrl` (`wasp/client`), adds `role`. |
| `listRoles()` | `useQuery(listRoles)` | **Renamed `useRoles()`**: a query cannot be synchronous. |
| `getRole(c.roleId)` | none (in `getCandidate`/`listCandidates`) | **Not exported.** Use `c.role`. |
| `createCandidate(input)` | `createCandidate` | **Now async, and takes `consent: boolean`** (server rejects anything but `true`). |
| `research(id, onStep)` | polls `getCandidate` every 1 s, 90 s cap | Research already runs server-side from `createCandidate`. No per-step progress: all steps "run", then ok/skip from `dossier.sources`. Throws with the `research_done` detail if no dossier. |
| `startScreen(id, fast)` | `startScreen({ candidateId, fast })` | **Now async.** `token` is a WebRTC conversation token. |
| `finalizeScreen(id, { conversationId })` | `finalizeScreen({ candidateId, conversationId })` | Throws if `conversationId` is missing. `transcript`/`durationSecs` are not sent: the server fetches them from ElevenLabs. |
| `proposeBooking(id, slotIso?)` | `proposeBooking` | Returns the `Approval`. |
| `attemptWithoutApproval(candidateId)` | `getCandidate` + `attemptWithoutApproval({ approvalId })` | Same signature as sandbox; uses the newest PENDING/DENIED_ATTEMPT approval, throws if none. |
| `decide(candidateId, approve)` | `getCandidate` + `decide({ approvalId, approve })` | As above. |
| `setDecision` | none | Exported, **throws** (no backend op). |
| `resetDemo` | none | Exported, **throws**; use `wasp db seed`. |
| `fmtDuration`, `panelSpread`, `PANEL_SPLIT` | none | Copied unchanged. |
| `STUBS` | `useQuery(getIntegrationStatus)` | **Not exported.** Use `useIntegrationStatus()` (see b); values are inverted (`true` = live). |
| `LIVE_AGENT_ID` | `startScreen().agentId` | **Not exported.** Use `isStubScreen(s)` / `STUB_CONVERSATION_ID`. |

## b. Mismatches and missing capabilities

| Gap | Effect | Recommended fix | Owner |
|---|---|---|---|
| ~~`durationSecs` not stored~~ **Closed:** `Candidate.durationSecs` is saved by `finalizeScreen` and seeded (96 s on the fixture) | `UICandidate.durationSecs` is the real value (undefined before the call); use it as-is with `fmtDuration` | Done | Dev 2 |
| No per-step research progress | Research page shows all steps running, then the result | Accept for demo, or emit events per source from the box | Dev 3 (box) + Dev 2 |
| ~~`STUBS` flags have no backend source~~ **Closed:** `getIntegrationStatus` query | `const live = useIntegrationStatus();` (from `uiApi`, `undefined` while loading) gives `{ elevenlabs, box, alter, traceroot }`, `true` = live. Show a `<Stub>` badge where `live && !live.box` etc. (sandbox `STUBS.x` = `!live.x`) | Done | Dev 2 |
| `setDecision` (founder overrides recommendation) | Chips throw | Add an `overrideRecommendation` action, or make chips read-only | Dev 2 (op) / Brian (UI) |
| `resetDemo` | Link throws | Remove the link; reseed with `wasp db seed` | Brian |
| Sandbox audio fallback `/conversation.mp3` | Not in the app's `public/` | Copy it to `app/public/` or play speech fallback (receipts.ts already does when HEAD fails) | Brian |
| Stub ElevenLabs (`agentId === "stub-agent"`) has no live call | CallPage must simulate | Simulate on the fixture transcript and finalize with `STUB_CONVERSATION_ID` | Brian |

## c. Port steps (Brian)

1. Files: `src/candidate/*` → `app/src/candidate/`, `src/founder/*` → `app/src/founder/`, `src/components/*` → `app/src/components/`, `src/lib/receipts.ts` → `app/src/lib/receipts.ts`, `src/Landing.tsx` → `app/src/Landing.tsx`, `src/styles.css` → `app/src/styles.css` (import it once, e.g. in `Shell.tsx`). Drop `lib/api.ts` and `lib/types.ts`.
2. Imports: `'../lib/api'` → `'../dev/uiApi'`; type imports from `'../lib/types'` → `'../server/contracts'` (`UICandidate` from `'../dev/uiApi'`); `'react-router-dom'` → `'react-router'` (the app has react-router 8, not react-router-dom); remove the `fixtures/*.json` import from `CallPage.tsx` (import the fixture transcript from `'../server/fixtures'` only if it has no server-only imports, else inline it).
3. Code changes: `listRoles()` → `useRoles()`; `getRole(c.roleId)` → `c.role`; `await createCandidate({ ..., consent })`; `await` on `startScreen`, `proposeBooking`; remove `STUBS`/`LIVE_AGENT_ID` uses (see b).
4. Layout: Wasp routes are flat, so `Shell` cannot use `<Outlet/>`. Change it to render `children` and wrap each page: `export function ApplyRoute() { return <Shell><ApplyPage/></Shell>; }`, or do it inside each page file.
5. ElevenLabs: from `app/`, `npm install @elevenlabs/react@^1.23.1`. Wrap the call page: `<ConversationProvider><CallPage/></ConversationProvider>` (only the call page needs it).
6. Call flow in `CallPage.begin()`:
   ```ts
   const s = await startScreen(id, fast);
   if (isStubScreen(s)) { /* run the simulation, then */ convId.current = STUB_CONVERSATION_ID; }
   else {
     await navigator.mediaDevices.getUserMedia({ audio: true });
     convId.current = await conversation.startSession({ conversationToken: s.token, connectionType: "webrtc", dynamicVariables: s.dynamicVariables });
   }
   ```
   In `finish()` (on `onDisconnect`, End call, or the cap): `await finalizeScreen(id, { conversationId: convId.current })`, then navigate to done. Keep the live transcript only for display.
7. Receipts: `c.audioUrl` is absolute (server port), so `playReceipt(c.audioUrl ?? fallback, ...)` works cross-origin; the server sends range responses.
8. Run `wasp compile` from `app/`.

## d. Routes for `app/main.wasp.ts`

Add the imports and replace the existing `FounderRoute` (currently the dev console; `/dev` keeps it). Names assume the wrapped components from step 4.

```ts
import { Landing } from "./src/Landing" with { type: "ref" };
import { ApplyPage } from "./src/candidate/ApplyPage" with { type: "ref" };
import { ResearchPage } from "./src/candidate/ResearchPage" with { type: "ref" };
import { CallPage } from "./src/candidate/CallPage" with { type: "ref" };
import { DonePage } from "./src/candidate/DonePage" with { type: "ref" };
import { FounderHome } from "./src/founder/FounderHome" with { type: "ref" };
import { CandidatePage } from "./src/founder/CandidatePage" with { type: "ref" };

    route("RootRoute", "/", page(Landing)),
    route("ApplyRoute", "/apply", page(ApplyPage)),
    route("ResearchRoute", "/apply/:id/research", page(ResearchPage)),
    route("CallRoute", "/apply/:id/call", page(CallPage)),
    route("DoneRoute", "/apply/:id/done", page(DonePage)),
    route("FounderRoute", "/founder", page(FounderHome)),
    route("FounderCandidateRoute", "/founder/candidates/:id", page(CandidatePage)),
```

`RootRoute` replaces the current `HomePage` route; drop the `HomePage` import if unused.
