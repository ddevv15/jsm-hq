# Project: JSM HQ (fork)

A local app that runs a team of AI coding agents (Claude Code, Codex) on a repo, each in its own Docker Sandbox, and shows them working in a pixel-art office. Shipped as the npm package `@therealjsmastery/jsm-hq`.

This fork is where we change HQ itself. This file is the source of truth for **what** HQ is and how it must behave. `docs/plan.md` says **in what order** we change it. Tasks, owners and status live in JSM HQ.

---

## 1. Users

| User              | What they do                                                                                     | Where                     |
| ----------------- | ------------------------------------------------------------------------------------------------ | ------------------------- |
| **HQ user**       | Runs `npx @therealjsmastery/jsm-hq` in a repo, sets up the team, messages the lead, merges PRs   | Browser UI at `localhost:7420` |
| **Agent**         | Reads its role, takes tasks, talks to HQ through the `hq` MCP server, opens PRs                  | Sandbox / tmux session    |
| **Contributor**   | Changes HQ from source (`pnpm dev`, `pnpm dev:hq`)                                               | This repo                 |

---

## 2. Core flow

What must keep working after every change. A phase that breaks any step is not done.

1. `pnpm dev` opens the demo office with fake data. Agents walk, the plan wall and belt animate.
2. Click an agent → its drawer opens. Click the plan wall → Boards. Click the review gate or PR belt → Pull requests. Click an environment → its drawer.
3. Drag pans the office, wheel zooms, `1`–`9` open agents, `Esc` closes panels, `+`/`-` zoom, `D` toggles debug.
4. Top bar: Action items, Terminal, Settings, Start team all open and close.
5. Every Settings tab (Project, Team, Workflow, Stack, MCP, Sandbox, Boards) opens, saves and closes.
6. `pnpm build` passes (type-check UI + server, build UI and server).
7. CI passes on all three OSes (build, session backend test, workspace test, pack, smoke test).
8. Live (product owner, on the host): `pnpm dev:hq` against a throwaway repo → welcome → setup checklist → Start team → the lead creates a board → a worker opens a PR → HQ tracks it.

---

## 3. Stack

| Layer      | Tool                                                         | Notes                                                       |
| ---------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| UI         | React 18 + TypeScript + Vite 6 + Tailwind 4                  | `src/`                                                      |
| Office     | PixiJS 8                                                     | `src/office/`. Pixel art drawn in code, no image assets.    |
| State      | Zustand 5                                                    | `src/store/`. The only code that talks to the data source.  |
| Motion     | framer-motion 11                                             | Drawers and panels                                          |
| Terminals  | xterm.js (browser), `@xterm/headless` + `node-pty` (server)  |                                                             |
| Server     | Node 20+, `ws`, `@modelcontextprotocol/sdk`, `zod`           | `server/`. Bundled to `dist-server/` with esbuild.          |
| Sessions   | tmux (macOS, Linux), HQ-run pty (Windows)                    | `server/backends/`                                          |
| Sandboxes  | Docker Sandboxes CLI (`sbx`)                                 | `server/sbx.ts`. Read output in both pre- and post-0.48 formats. |
| GitHub     | `gh` CLI                                                     | `server/github.ts`, `server/githubSync.ts`                  |
| Package    | pnpm 10 (lockfile: `pnpm-lock.yaml`)                         | Never switch package manager or add a second lockfile.      |

**Constraint:** no new runtime dependency without the product owner's approval. The npm package must install on a bare machine with no compilers (CI's `linux-bare` job).

---

## 4. Environments

| Environment | What it is                                                         | Who runs it                          |
| ----------- | ------------------------------------------------------------------ | ------------------------------------ |
| Demo        | `pnpm dev`: UI with fake data (`src/data/mock`), nothing leaves the browser | Developers, in their sandbox  |
| Source      | `pnpm dev:hq` / `pnpm hq` against a throwaway repo (`HQ_REPO=<path>`) | Product owner only, on the host  |
| CI          | GitHub Actions on every PR (`.github/workflows/ci.yml`)            | Automatic                            |
| Release     | `npm publish`                                                      | Nobody on this fork. Never publish.  |

| Rule | Detail |
| --- | --- |
| The team runs the released HQ | The product owner runs this team with `npx @therealjsmastery/jsm-hq@latest`, never from source in this folder. A broken branch can't take down the team building it. |
| Source mode needs the host | `pnpm dev:hq` needs tmux, `sbx` and `gh` on the host. It can't run inside a sandbox (no nested sandboxes). Server changes are checked live by the product owner. |
| Demo data follows the UI | Every UI-visible change updates `src/data/mock` so `pnpm dev` shows it. |
| Upstream | `upstream` is `jsmastery-pro/jsm-hq`. Only the product owner syncs from it or opens PRs to it. |

---

## 5. Areas of the code

| Area                  | Path                                  | Owns                                                                 |
| --------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| Contract              | `src/data/types.ts`, `src/data/source.ts` | Types shared by UI and server, the `OfficeDataSource` interface   |
| Data sources          | `src/data/mock/`, `src/data/ws/`      | Fake data for `pnpm dev`; real data over WebSocket                   |
| Stores                | `src/store/`                          | `office` (snapshot), `ui` (open panels, selection), `terminal`, `ports` |
| Office canvas         | `src/office/`                         | Scene, camera, layout, hit-testing and input (`sceneInput.ts`), sprites |
| HUD                   | `src/ui/hud/`                         | Top bar, team panel, activity feed, tooltip, connection banner       |
| Drawers               | `src/ui/drawers/`                     | Agent, Boards, PRs, Action items, Terminal, Environment, Ports       |
| Settings + setup      | `src/ui/settings/`, `src/ui/setup/`   | Settings modal and tabs, setup checklist, welcome                    |
| UI kit + theme        | `src/ui/kit.tsx`, `src/theme/`        | Shared controls, colour tokens, fonts                                |
| Server                | `server/`                             | Setup checks, workspaces, sessions, sbx, hooks, Team MCP, GitHub sync, planner, action items |
| CLI                   | `bin/jsm-hq.mjs`                      | The `jsm-hq` command                                                 |

**Shared paths:** `src/data/types.ts`, `src/data/source.ts`, `src/store/`, `src/theme/` and `src/ui/kit.tsx` belong to one task at a time.

---

## 6. Interaction rules

How clicks and input must behave. Phase 1 fixes anything that doesn't match.

| Input                         | Must do                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- |
| Click an agent                | Open its drawer. Agents in front win over agents behind and over furniture. |
| Click plan wall / gate / belt / environment | Open Boards / Pull requests / Pull requests / that environment |
| Drag                          | Pan. A drag never counts as a click when released over something.       |
| Wheel / pinch                 | Zoom around the pointer                                                 |
| Hover                         | Tooltip for the thing under the pointer; cursor shows it is clickable   |
| Click on a HUD element or open drawer | Handled by that element only. Never reaches the canvas underneath. |
| Click outside a drawer        | Doesn't close it unless that drawer says so. `Esc` closes the top one.  |
| Keys `1`–`9`, `+`, `-`, `D`   | Work unless focus is in a text field or terminal                        |
| Window resize, drawer resize  | Hit areas still line up with what's drawn                              |

---

## 7. Rules for every PR

| Rule              | Detail                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Colours           | Only from `src/theme/tokens.ts`. No hex values or raw Tailwind colour classes elsewhere. |
| Types             | TypeScript strict. No `any`, no `@ts-ignore`.                                            |
| Imports           | Relative imports, as the repo already does. No new path aliases.                         |
| Cross-platform    | Works on macOS, Linux and Windows. Windows has no tmux. Use `server/lib/exec.ts` for processes. |
| Secrets           | HQ never stores, reads or logs key values. Agents get variable names only.               |
| Network           | Never change the user's sbx base policy. Only add or remove rules HQ created.            |
| Docs              | User-visible behaviour change → update `README.md` or `docs/how-it-works.md` in the same PR. |
| Version           | Never bump `version` in `package.json`, never publish.                                   |
| Upstream files    | Don't edit `LICENSE`, `TRADEMARKS.md`, `SECURITY.md`.                                    |

---

## 8. Repo layout

```
bin/          jsm-hq CLI
server/       local HQ server (Node)
src/          UI: data, store, office (PixiJS), ui (React), theme
scripts/      build and CI test scripts
docs/
  project.md  this file
  plan.md     phases (product owner writes)
  roles/      ROLE.md text for the lead and developers
context/      upstream implementation plans (read-only history)
```

---

## 9. Design

The current design stays: the pixel-art office, its layout, the robot characters and the game-HUD panels (decided 2026-11-14; two redesign directions were rejected). Visual change comes only through **themes**:

| Rule | Detail |
| ---- | ------ |
| What a theme changes | Colours of the office and the panels together. Never layout, sizes or the pixel art. |
| Office | Every pixel goes through `Pen.rect`, which passes its colour through `shade()` in `src/office/engine/shade.ts`. |
| Panels | CSS tokens in `src/index.css`, overridden under `:root[data-theme="<id>"]`. `ink` = text, `line` = outlines, `paper` = inputs, `snow` = light text on dark plates. |
| Choice | Settings → Project → Theme: Auto (follows system light/dark), or a fixed theme. Saved per browser. |
| Contrast | WCAG AA for all text in every theme; text on bright plates stays dark. |
| Shipped | Classic (default), Night. |

---

## 10. Out of scope (for now)

| Feature                          | Reason                                  |
| -------------------------------- | --------------------------------------- |
| AI stack suggestion (#33)        | Not planned yet                         |
| More coding agents (#24)         | Not planned yet                         |
| Bitbucket (#27)                  | Not planned yet                         |
| Publishing to npm                | Upstream maintainers only               |
