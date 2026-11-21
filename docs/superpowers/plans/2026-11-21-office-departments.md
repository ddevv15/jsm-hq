# Office Departments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the office layout as a main building of rooms (lead office, review room, corridor, one room per department) set in grounds with a café and a server building outside, without changing any logic.

**Architecture:** `generateLayout` in `src/office/layout/layout.ts` builds a list of rooms, packs them into a site (building + grounds), and outputs the same positional fields the rest of the office code reads today (desks, belt, gate, racks, hits, walk grid). A new `departments.ts` maps a role to a department. `static.ts` draws floors, walls, doors and signs per room. A headless test script checks the layout's invariants for many teams.

**Tech Stack:** TypeScript (strict), PixiJS 8 canvas drawing via `CanvasPen`, test scripts run with `npx tsx`, pnpm 10.

**Spec:** `docs/superpowers/specs/2026-11-21-office-departments-design.md`

## Global Constraints

- UI only: no change to agents, tasks, PRs, review, sessions, the server, `src/data/types.ts` or `src/office/actors/parcels.ts`.
- No new pixel-art style. New art is limited to room name signs, a side door, benches and belt crossing plates, drawn through `Pen`, so themes recolour them.
- No new dependency. No Settings change.
- Colours from `src/office/engine/palette.ts` (`C`) only; add a palette entry rather than a hex literal in drawing code.
- TypeScript strict: no `any`, no `@ts-ignore`. Relative imports, as the repo does.
- `BeltPath` stays as is: one horizontal run left→right, then an optional vertical run that only goes up. Gate to the right of every drop point; racks above the belt row.
- Departments (role text, trimmed, case-insensitive): Engineering = developer, frontend, frontend developer, backend, backend developer; Design & Docs = designer, docs; Quality = qa, code reviewer, security; Ops = devops; anything else → Engineering. Building order: Engineering, Quality, Design & Docs, Ops. Empty departments are not drawn. The lead is never in a department.
- Cubicles keep 7×7 tiles, pitch 8.
- Zoom limit: in a 1440×900 window, each demo preset's default view zooms out at most one zoom step further than today.
- `pnpm build` passes at the end of every task. Every UI change shows in `pnpm dev`.
- Ask the product owner before starting `pnpm dev`; stop it and close any browser tab opened when done.
- `docs/project.md` §9 and `docs/plan.md` are not edited by these tasks (the product owner updates §9).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Role text with odd spacing or case (`"  QA "`, `"Frontend Developer"`, `"DEVOPS"`) lands in the right department, not Engineering. Test in Task 1.
2. Review turned off: no review room, the lead office spans the top row, no gate, and parcels still reach the mailbox or racks. Test in Task 2.
3. Deploy on but zero environments: no server building, mailbox at the belt's end, belt has no vertical run. Test in Task 2.
4. Lead-only team (no workers) and a team with no lead: the layout still builds, every reachable spot is reachable, and no department room is drawn. Test in Task 2.
5. Twelve workers all in one department: the room row wraps and every desk still reaches the corridor through a passage, with its drop point left of the gate. Test in Task 2.

---

### Task 1: Departments mapping, baseline sizes and the layout test script

**Files:**
- Create: `src/office/layout/departments.ts`
- Create: `scripts/office-layout-test.ts`
- Modify: `.github/workflows/ci.yml` (add a step after "Agent clones (line endings)")

**Interfaces:**
- Produces:
  - `type DepartmentId = "engineering" | "quality" | "design-docs" | "ops"`
  - `interface Department { id: DepartmentId; label: string }` (labels: `"Engineering"`, `"Quality"`, `"Design & Docs"`, `"Ops"`)
  - `const DEPARTMENTS: Department[]`, in building order
  - `function departmentOf(role: string): DepartmentId`
  - `function groupByDepartment<T extends { role: string }>(workers: T[]): { dept: Department; members: T[] }[]`: non-empty groups only, in building order, members in input order
  - In the test script: `check(name: string, ok: boolean, detail?: string): void`, `envsFor(config: HqConfig): Environment[]`, and `BASELINE_FIT: Record<string, number>` keyed by preset id

- [ ] **Step 1: Record today's fit per preset.** Before touching `layout.ts`, write a throwaway snippet (not committed) that runs today's `generateLayout(preset.config, envsFor(preset.config))` for each of `presets` and prints `fit = snap(min(1440 / worldW, 900 / worldH) + 0.2)`, where `snap(z) = Math.floor(z / 0.5) * 0.5`. That mirrors `camera.fitZoom` at DPR 2 with no HUD insets. Put the printed numbers into `BASELINE_FIT` in the test script.

  `envsFor`: deploy off → `[]`. Deploy on with `perAgentEnvironments` → one env per worker (`name` = agent id, `agentId` = id) plus `"main"`. Otherwise just `"main"` (`agentId: null`). Use `url: ""`, `status` = any valid `EnvironmentStatus`, `lastDeployAt: ""`.

- [ ] **Step 2: Write the failing department tests** in `scripts/office-layout-test.ts` (same `check` and `failed` pattern as `scripts/workspace-test.ts`; exit 1 when anything fails):

```ts
check("developer → engineering", departmentOf("Developer") === "engineering");
check("frontend developer → engineering", departmentOf("Frontend Developer") === "engineering");
check("spaced QA → quality", departmentOf("  QA ") === "quality");
check("code reviewer → quality", departmentOf("Code Reviewer") === "quality");
check("security → quality", departmentOf("security") === "quality");
check("designer → design-docs", departmentOf("Designer") === "design-docs");
check("docs → design-docs", departmentOf("Docs") === "design-docs");
check("DEVOPS → ops", departmentOf("DEVOPS") === "ops");
check("unknown → engineering", departmentOf("Data Wizard") === "engineering");
check("empty → engineering", departmentOf("") === "engineering");
const g = groupByDepartment([{ role: "QA" }, { role: "Dev" }, { role: "Docs" }, { role: "qa" }]);
check("groups in building order, empty skipped",
  g.map((x) => x.dept.id).join() === "engineering,quality,design-docs");
check("members keep input order", g[1].members.length === 2);
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npx tsx scripts/office-layout-test.ts`
Expected: fails to resolve `../src/office/layout/departments`.

- [ ] **Step 4: Implement `departments.ts`** with the exported names above. Use a lookup table keyed by lowercase role text, per the Global Constraints.

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npx tsx scripts/office-layout-test.ts`
Expected: every line `✓`, exit code 0.

- [ ] **Step 6: Add the CI step**

```yaml
      - name: Office layout
        run: npx tsx scripts/office-layout-test.ts
```

- [ ] **Step 7: `pnpm build` passes, then commit**

```bash
git add src/office/layout/departments.ts scripts/office-layout-test.ts .github/workflows/ci.yml
git commit -m "Map roles to office departments and add the layout test"
```

---

### Task 2: Room-block layout

**Files:**
- Modify: `src/office/layout/layout.ts` (rewrite `generateLayout`; extend `layoutKey`)
- Modify: `src/office/draw/static.ts`, `src/office/draw/live.ts`: compile fixes only (replace reads of removed fields). The visual redesign is Task 3.
- Test: `scripts/office-layout-test.ts`

**Interfaces:**
- Consumes: `groupByDepartment`, `DEPARTMENTS`, `DepartmentId` (Task 1).
- Produces (in `layout.ts`):
  - `type RoomKind = "lead" | "review" | "corridor" | "department" | "cafe" | "server"`
  - `interface Room { kind: RoomKind; id: string; x0: number; y0: number; w: number; h: number; label: string | null; doors: Tile[] }`: site tiles. `id` is the `DepartmentId` for departments, otherwise the kind. `label` is the department label, or null.
  - `OfficeLayout` changes:
    - Grid and `W`/`H` now cover the whole **site** (building + grounds). `ox`/`oy` stay the site origin in world px.
    - New fields: `building: { x0: number; y0: number; w: number; h: number }` (site tiles), `rooms: Room[]`, `crossings: Tile[]` (belt tiles robots may walk over), `benches: Tile[]`, `sideDoor: Tile`.
    - `lounge` becomes `{ coffee: Tile[] }`.
    - `mainW` and `serverRoom` are removed.
    - All other fields keep their names and meaning.
  - `layoutKey` also includes each agent's `role`.

- [ ] **Step 1: Write the failing layout tests.** Add a function `invariants(name: string, l: OfficeLayout, config: HqConfig)` that checks:
  - every worker has exactly one `DeskSpot`, and its desk rect lies inside the `department` room whose `id === departmentOf(role)`;
  - there is one `department` room per non-empty department, and none for empty ones;
  - no two rooms overlap; every room lies inside the site;
  - `grid.find(door → t)` ends at `t` for each desk `seat` and `drop`, `lead.seat`, `plan.spot`, each `lounge.coffee` and each `wander` tile;
  - when `l.gate` exists: `l.gate.x - 6 > l.ox + d.drop[0] * 16 + 8` for every desk (gate entry past every drop);
  - when `l.racks.length`: `l.belt.topY !== null && l.belt.topY < l.belt.y`, and `r.y + r.h <= l.belt.y` for every rack;
  - every `hit.rect` lies inside `0..worldW × 0..worldH`;
  - every `crossings` tile is on the belt row, and walkable.

  Run `invariants` on: each preset in `presets` (with `envsFor`); synthetic teams of 1, 5 and 12 workers with mixed roles; 12 workers all `"Developer"`; a lead-only team; a team with no lead; each preset with `workflow.review.enabled = false`; a deploy preset with `envs = []`.

  Add these too:

```ts
check(`${id}: fit within one step of today`, fit(l) >= BASELINE_FIT[id] - 0.5, `${fit(l)} vs ${BASELINE_FIT[id]}`);
check("review off → no gate, no review room", !lNoReview.gate && !lNoReview.rooms.some((r) => r.kind === "review"));
check("deploy, zero envs → mailbox, no server", !!lNoEnv.mailbox && !lNoEnv.rooms.some((r) => r.kind === "server") && lNoEnv.belt.topY === null);
check("role change changes layoutKey", layoutKey(cfg, envs) !== layoutKey(withRole(cfg, "dwight", "QA"), envs));
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx tsx scripts/office-layout-test.ts`
Expected: type errors or `✗` lines on the new fields (`rooms`, `building`).

- [ ] **Step 3: Rewrite `generateLayout(config, envs): OfficeLayout`.** Pack the rooms in this shape (spec, "The layout"):
  - **Top row:** the lead office (today's lead-corner furniture tiles, relative to its origin), then the review room at the right end when review is on.
  - **Corridor:** the belt row along the top of the corridor against the top row's wall, then a one-tile walking strip under it. Drops sit on the strip.
  - **Department rows:** each department room is `2 + cols × PITCH` tiles wide, using today's `deskColumns` per department. Rooms wrap to a new row when the next room would pass the gate's x. A wrapped row joins the corridor through a passage one tile wide.
  - **Gate:** on the belt at the corridor's right end, in front of the review room.
  - **Grounds:** the café (lower right) and, when there are racks, the server building (upper right, entirely above the belt row) sit outside the building's right wall. The belt exits the right wall at its own row and climbs to the racks. The side door is on the right wall at the walking strip, and the path from it runs down to the café. Mark the grass, paths and outbuilding floors walkable in the grid. Place `benches` and extra `wander` tiles near the café.
  - **Crossings:** one per top-row door; mark that belt tile walkable and list it in `crossings`.
  - **Cables:** desk → own rack, routed under the grass to the server building.

  Exact sizes, gaps and furniture tiles are the builder's call, within the zoom limit.

- [ ] **Step 4: Compile fixes.** In `static.ts` and `live.ts`, replace reads of `mainW`, `lounge.x0`, `lounge.w` and `serverRoom` with the matching `rooms` entry (lead, cafe, server) or `building`. It only needs to compile and draw something; Task 3 redraws it.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx tsx scripts/office-layout-test.ts`
Expected: every line `✓`, exit code 0.

- [ ] **Step 6: `pnpm build` passes, then commit**

```bash
git add src/office/layout/layout.ts src/office/draw/static.ts src/office/draw/live.ts scripts/office-layout-test.ts
git commit -m "Lay the office out as rooms, a corridor and grounds"
```

---

### Task 3: Draw rooms, outbuildings and grounds

**Files:**
- Modify: `src/office/draw/static.ts`
- Modify: `src/office/draw/furniture.ts` (add `bench(p: CanvasPen, x: number, y: number): void`, `roomSign(p: CanvasPen, label: string, cx: number, y: number): void`, `crossingPlate(p: CanvasPen, x: number, y: number): void`)
- Modify: `src/office/draw/live.ts` (window and clock placed from the café room)
- Modify: `src/office/engine/palette.ts`, only if a needed colour has no entry

**Interfaces:**
- Consumes: `OfficeLayout.rooms`, `building`, `crossings`, `benches`, `sideDoor` (Task 2).
- Produces: nothing new for other tasks.

- [ ] **Step 1: Redraw `buildStatic(l, config)` per room.** Keep the lawn, flowers and trees across the site, and keep the front path to `l.door`. For each room:
  - **floor:** wood for lead, review, corridor and departments; café tiles for the café; grate for the server;
  - **walls:** back wall with today's wall art, side and bottom walls in `C.wallTop`;
  - a door gap at each of `room.doors`;
  - a `roomSign` on each department's back wall.

  The lead office gets today's lead-corner drawing (plan wall, office sign, SHIP poster, bookshelf, lead desk, stand-up rug and beanbags), offset to the room's origin. The café gets today's lounge furniture. The server building gets the `SERVER ROOM` label and racks. Also draw the side door, the path from it to the café, `bench` at each `benches` tile, and `crossingPlate` at each `crossings` tile. Cubicles, desks, name plates, the easel and the mailbox draw exactly as today, at their new positions.

- [ ] **Step 2: Theme check, headless.** Run `grep -nE '"#[0-9a-fA-F]{3,6}"' src/office/draw/static.ts src/office/draw/furniture.ts` and confirm there are no new hex literals in this task's diff (`git diff` shows none added). Every colour comes from `C` and is drawn through `p.rect`, which applies `shade()`.

- [ ] **Step 3: `pnpm build` and the layout test pass**

Run: `pnpm build && npx tsx scripts/office-layout-test.ts`
Expected: build succeeds; every line `✓`.

- [ ] **Step 4: Check it in the demo.** Ask the product owner before starting `pnpm dev --host 0.0.0.0`. In each preset (switch presets in the demo) check that:
  - the main building, department rooms with signs, café and server building (bigTeam, askwell) all show;
  - robots walk to desks, the café and the grounds, and cross the belt only on the plates;
  - parcels run the belt, stop at the gate and reach the racks or mailbox;
  - clicking an agent, the plan wall, the gate, the PR board and a rack opens the right drawer;
  - drag pans, wheel zooms, and `1`–`9`, `Esc`, `+`/`-` and `D` all work;
  - in Settings → Team, changing an agent's role to QA moves them to Quality, and removing the only Docs agent removes Design & Docs if it's then empty;
  - Settings → Project → Theme → Night recolours every new piece;
  - at a 1440×900 window, the default view (`Esc`, then home) is within one zoom step of `main`.

  Stop the dev server and close the tab when done.

- [ ] **Step 5: Commit**

```bash
git add src/office/draw/static.ts src/office/draw/furniture.ts src/office/draw/live.ts src/office/engine/palette.ts
git commit -m "Draw department rooms, the café and server buildings, and the grounds"
```

---

### Task 4: Demo team and docs

**Files:**
- Modify: `src/data/mock/presets.ts` (bigTeam preset, after `agent("sam", …)` near line 131)
- Modify: `docs/how-it-works.md` (the team section near line 26)
- Modify: `docs/images/office.png` (new screenshot)

**Interfaces:**
- Consumes: the finished layout (Tasks 2–3).
- Produces: nothing.

- [ ] **Step 1: Add a DevOps agent** to the bigTeam preset: `agent("oscar", "Oscar", "DevOps", <an agent colour not used in that preset>)`, so Ops shows. Re-run `npx tsx scripts/office-layout-test.ts` (the presets loop now covers four departments) and update `BASELINE_FIT` for bigTeam if adding a worker changed today's number. Recompute it with Task 1's snippet against `upstream/main`'s layout plus this agent.

- [ ] **Step 2: Docs.** In `docs/how-it-works.md`, add one line under the team section: agents sit in department rooms by role (Engineering, Quality, Design & Docs, Ops; any other role sits in Engineering), with the café and server room as buildings on the grounds.

- [ ] **Step 3: Screenshot.** With the product owner's go-ahead to run `pnpm dev`, capture the askwell preset's default view at 1440×900 into `docs/images/office.png`. Keep the README alt text accurate, and update it in `README.md` if the image no longer matches. Stop the server and close the tab.

- [ ] **Step 4: `pnpm build` and the test pass, then commit**

```bash
git add src/data/mock/presets.ts docs/how-it-works.md docs/images/office.png README.md
git commit -m "Show every department in the demo and document the new office"
```
