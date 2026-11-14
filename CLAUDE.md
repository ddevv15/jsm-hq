# JSM HQ (fork)

Read `docs/project.md` (what HQ is and its rules) and `docs/plan.md` (phase order) before any task.

## Commands

| Command | Does |
| --- | --- |
| `pnpm install` | Install (pnpm 10; never npm or yarn) |
| `pnpm dev --host 0.0.0.0` | Demo UI with fake data, port 5173. Use **Forward port** to open it. |
| `pnpm build` | Type-check UI + server, build both. Must pass before a PR. |
| `pnpm typecheck` | Type-check only |
| `npx tsx scripts/session-backend-test.ts` | Session backend test (CI runs it) |
| `npx tsx scripts/workspace-test.ts` | Workspace clone test (CI runs it) |

`pnpm dev:hq` and `pnpm hq` need tmux, `sbx` and `gh` on the host. Don't run them in a sandbox.

## Working on a task

- Edit only the files your task lists. Need another file? Ask the lead.
- One task, one branch, one PR titled `[TASK-ID] Title`.
- UI change: update the demo data in `src/data/mock` so `pnpm dev` shows it.
- Before opening the PR: `pnpm build` passes, and you've checked the change in `pnpm dev`.
- In the PR description: what changed, and the exact clicks to check it in the demo. For server changes, the steps for the product owner's live run.

## How to talk to the product owner

- Through `ask_user` for anything outside your sandbox (a key, a setting, a live test), with exact steps. Never put a secret value in it.
- One question at a time. Say what you found, give your recommendation, and ask yes/no or pick-one.
- Short and plain. No headings, no walls of text.
- Never ask what the docs already answer.

## Never

- Bump `version`, run `npm publish`, or push to `upstream`.
- Merge a PR.
- Add a dependency without approval.
- Change the user's sbx base policy, or store or log key values.
- Edit `docs/plan.md` or `docs/project.md` unless your task lists them.
