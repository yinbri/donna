# Wave 2 (start at 1:20, only if Gate 1 passed)

Run each as its own Codevisor agent in its own worktree. Anything not passing its check at **1:45** is cut. Cut order is in `plan.md`.

| Lane | Owns | Done when |
|---|---|---|
| CHAT: assistant-ui "Ask Donna" | `app/src/chat/*` | Typing "screen Alex for Founding Engineer" streams Dossier → Call → Panel → Approval cards, reusing the founder-lane components as tool UIs |
| OPS: Rowboat | `app/src/server/integrations/rowboat.ts` | `Hiring/<role>/<name>.md` appears in Rowboat's knowledge folder after each screen |
| Fiber "find 5 similar" | Dev 3's `box/similar` | The button on a top candidate returns a draft list of 5 people; nobody is contacted |
| Assistant add-on: "Ask Donna about your day" | a chat tool reading the founder's calendar through Alter | "What's on today?" answers from the real test calendar |
| Assistant add-on: founder brief call | ElevenLabs agent with `mode=founder_brief` | After a PASS, Donna calls the founder with a 30-second brief and the proposed slot |
