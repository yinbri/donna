# Branching and workflow

Each teammate has a folder (`dev1/` to `dev4/`) holding their `prd.md`, `guide.md` and one-page `lane.md`. Everyone works on their own branch and merges into `main` through a pull request. `main` must always run with every integration stubbed.

## Branches

| Folder | Teammate | Lane | Branch | PRD | Guide |
|---|---|---|---|---|---|
| [dev1/](../dev1) | Brian | UI + Donna's voice | `lane/ui-voice` | [dev1/prd.md](../dev1/prd.md) | [dev1/guide.md](../dev1/guide.md) |
| [dev2/](../dev2) | (has the Mac) | Wasp backbone + Codevisor lead | `lane/wasp-backbone` | [dev2/prd.md](../dev2/prd.md) | [dev2/guide.md](../dev2/guide.md) |
| [dev3/](../dev3) | (has Fiber AI access) | Donna box (Fiber, GitHub, EDSL, Maritime) | `lane/donna-box` | [dev3/prd.md](../dev3/prd.md) | [dev3/guide.md](../dev3/guide.md) |
| [dev4/](../dev4) | | Trust + ops (Alter, TraceRoot, pilot) | `lane/trust-ops` | [dev4/prd.md](../dev4/prd.md) | [dev4/guide.md](../dev4/guide.md) |

Wave 2 work (after Gate 1) uses `wave2/<name>`, for example `wave2/chat`. In Codevisor, each agent gets its own worktree on a branch under its lane, such as `lane/wasp-backbone/schema`.

## Start

```powershell
git clone https://github.com/yinbri/donna.git
```

```powershell
cd donna
```

```powershell
git switch -c lane/ui-voice
```

Use your own branch name from the table.

## Work

- Edit only the files your lane owns ([AGENTS.md](../AGENTS.md)). Two lanes never edit the same file, so merges stay clean.
- Commit small and often. Push your branch at least every 30 minutes so others can see progress.
- Pull `main` into your branch before opening a PR: `git pull origin main`.

## Merge into main

1. Open a PR from your branch into `main`: `gh pr create --base main --fill`.
2. The PR description says which "done when" items from your PRD now pass.
3. Dev 2 merges (squash), or the lane owner does if they are busy. Merge only if the app still starts with stubs.
4. Add one line to `BUILDLOG.md`: time, lane, who, what landed.

## Merge windows

| Time | What merges |
|---|---|
| 12:05 | Repo setup, contracts, fixtures (done) |
| ~12:40 | Wasp scaffold with stubs, so other lanes can drop their code in |
| 12:50–1:20 | Each lane's real integration, one PR at a time, in this order: box → UI → Alter |
| 1:20 | **Gate 1** on `main` |
| 1:20–1:45 | Wave 2 PRs |
| **2:20** | **Freeze**: bug fixes only after this |

## Contract changes

`contracts/contracts.ts` is frozen. If you need a change, tell Dev 2. They change it on `main`, note it in `BUILDLOG.md`, and everyone pulls.
