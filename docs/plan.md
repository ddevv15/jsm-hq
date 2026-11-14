# Plan

The build order for this fork of JSM HQ. `docs/project.md` describes HQ in detail.

## Rules

- Build phases in this order. Don't add, remove, or reorder phases. Only the product owner adds phases.
- Every phase after Phase 0 has two parallel lanes, one per developer, so nobody waits.
- Each phase is one board in JSM HQ. The lead creates the board and its tasks there, with the product owner, before the phase starts. The next phase can be broken down while the current one is being built.
- Tasks and their status live only in JSM HQ. This file never lists tasks.
- A phase is done when all its tasks are merged, CI is green on `main`, and its "Done when" checks pass in `pnpm dev` and, for server changes, in the product owner's live run.
- Keep JSM HQ's "Export plan to docs/plan.md" off. It would overwrite this file.

---

## Phase 0 — Setup

**Goal:** the fork is ready for the team: agents can build it, run the demo, and get a PR reviewed.

**Lanes:** one. The lead plans it like any other phase, and gives every task to one developer.

**Product owner, before the last task:** install CodeRabbit on `ddevv15/jsm-hq`, set the review tool in Settings → Workflow, and allow port forwarding for the developers' sandboxes.

| Includes                                                                     | project.md |
| ---------------------------------------------------------------------------- | ---------- |
| `pnpm install` and `pnpm build` pass inside a developer sandbox              | §3, §4     |
| `pnpm dev --host 0.0.0.0` runs in the sandbox and opens via **Forward port** | §4         |
| A short "Checking your change" section in `CONTRIBUTING.md` for sandboxes    | §4         |
| A trivial PR goes through CI and review on the fork                          | §2         |

**Done when:** a PR on the fork gets green CI on all three OSes and a review, and the product owner opens the demo through a forwarded port.

---

## Phase 1 — Clicking fixes

**Goal:** every click, drag, hover and key does what §6 says, in the demo and in a live run.

**Before planning:** the lead asks the product owner for each clicking problem they've seen: where, what they did, what happened, what they expected. Each becomes a task or part of one.

| Lane                       | Includes                                                                                                          | project.md |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| **A — Office canvas**      | Hit-testing, click vs drag, hover and cursor, zoom and pan, hit areas after resize (`src/office/`)                | §6         |
| **B — HUD and drawers**    | Clicks on the top bar, team panel, drawers, settings and welcome; clicks leaking to the canvas; focus and keyboard shortcuts (`src/ui/`) | §6 |

Changes to `src/store/ui.ts` go in one task, first.

**Done when:** every problem the product owner listed is fixed in `pnpm dev`, every row of §6 holds, and the core flow (§2) still passes.

---

## Phase 2 — Themes

**Goal:** more themes on top of the current design. The pixel office, layout and HUD stay; a theme only recolours the office and the panels.

**Before planning:** the product owner names the next themes. Classic and Night already exist (upstream PR "Add themes, starting with Night").

| Lane                          | Includes                                                                                          | project.md |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | ---------- |
| **A — Theme tokens**          | New theme ids and their CSS token values in `src/index.css`, the theme list in `src/theme/theme.ts`. Tokens task first. | §9 |
| **B — Office palettes**       | The office colour transform per theme in `src/office/engine/shade.ts`, checked in the demo.        | §9         |

**Done when:** every theme passes WCAG AA for text in the HUD, the office reads clearly in each, and Classic is unchanged.

---

## Later phases

Added by the product owner when decided.
