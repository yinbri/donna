# AGENTS.md

Rules for every teammate and coding agent (Claude Code, Codex, Codevisor crews) working in this repo. The full plan is in [plan.md](plan.md).

## Clock

- Hacking ends and submissions close at **3:00 PM EST**. **Feature freeze at 2:20.**
- **Gate 1 at 1:20:** one full run, apply → call → receipts play → denied attempt → Approve → invite.
- **At 1:45, anything not passing its lane's check is cut, not rescued.** Cut order is in `plan.md`.

## Ownership

Each lane edits only the files it owns (see your folder: `dev1/` to `dev4/`). If you need a change in another lane's file, ask its owner.

| Folder | Lane | Owner | Owns |
|---|---|---|---|
| `dev1/` | UI + voice | Brian | `app/src/candidate/*`, `app/src/founder/*`, `ui-sandbox/*`, the ElevenLabs agent config in `agent/*` |
| `dev2/` | Wasp backbone | Dev 2 (Mac) | `app/main.wasp`, `app/schema.prisma`, `app/src/server/*` except `integrations/box.ts` and `integrations/alter.ts`, `BUILDLOG.md` |
| `dev3/` | Donna box | Dev 3 | `box/*`, `app/src/server/integrations/box.ts` |
| `dev4/` | Trust + ops | Dev 4 | `app/src/server/integrations/alter.ts`, `app/src/server/integrations/traceroot.ts`, `app/src/founder/ApprovalCard.tsx` logic, `app/seed/roles.json`, `pilot/*` |

`contracts/contracts.ts` is frozen. Only the Wasp backbone owner edits it, and only with a note in `BUILDLOG.md` and a heads-up to everyone.

## Stubs first

Every integration ships first as a stub that returns the matching file in `fixtures/`. Swap the stub for the real call only when your lane's check passes against the real service. The app must still run with every integration stubbed.

## Verify against live docs

The request shapes for Fiber AI, Ploid, Alter, Maritime, TraceRoot, Expected Parrot and ElevenLabs in the plan come from a quick research pass. **Read the sponsor's docs before writing the client.** Doc links are in [docs/hackathon/use-cases.md](docs/hackathon/use-cases.md).

## Guardrails (product rules, not suggestions)

- Donna's first sentence says she is an AI and the call is recorded.
- She never asks about age, family, origin, religion, health or other protected topics, and never promises an outcome.
- Research looks up only the person who applied, using what they typed, after the consent box is ticked.
- No calendar write or email happens without a recorded founder approval.
- Pilot pages say: "Unofficial hackathon demo. This is not an application to the company."

## Secrets

- Keys go in `app/.env.server` and `box/.env`, which are git-ignored. Never commit a key or a promo code.
- `Hacker Package.pdf` contains promo codes and stays out of git.

## Commits

- Small commits, one change each, short messages. Pull before pushing.
- After merging a lane, add one line to `BUILDLOG.md`: time, lane, agent or person, what landed.

## Honest claims

The README and the pitch list only what runs. Say "isolated micro-VM that sleeps" for Maritime, not "Firecracker". Say "built with parallel agents in Codevisor" only for code that was.
