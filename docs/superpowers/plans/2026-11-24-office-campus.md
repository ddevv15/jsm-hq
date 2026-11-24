# Office Campus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the main building with the stacked campus: separate buildings for HQ, review, server, each department, a cafeteria, a gym and a game room, along a street that carries the belt.

**Architecture:** `generateLayout` places buildings as `Room`s on the lawn in four bands (amenities, street row, two department rows) around a street, keeping every `OfficeLayout` field the rest of the office reads. A pure zoom helper makes the camera fit the whole campus. `static.ts` draws each building generically, plus gym and game-room art.

**Tech Stack:** TypeScript strict, PixiJS 8 (`CanvasPen`), tests via `npx tsx scripts/office-layout-test.ts`.

**Spec:** `docs/superpowers/specs/2026-11-21-office-departments-design.md` — section "Revision: stacked campus".

## Global Constraints

- UI only; `src/data/types.ts`, `parcels.ts` and the server untouched. `BeltPath` unchanged: one run left→right, then up; gate right of every drop point; racks above the belt.
- No new dependency, no new hex colour literals in new drawing code (palette `C` only).
- Departments and their mapping are unchanged (`departments.ts`).
- Ask before starting `pnpm dev`; stop it and close the browser after.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. A team that changes size in Settings: the view re-fits to the new campus instead of keeping the old zoom.
2. Review off and no environments together: no review or server building, the mailbox ends the belt, amenities still reachable.
3. One department with 12 people: a single wide building; drop points still left of the gate.
4. The alley crossing next to HQ when the review building sits right beside HQ: the alley stays open.
5. A 1× (non-Retina) screen: the view centres on the campus even when it's bigger than the window.

---

### Task 1: Stacked campus layout

**Files:** Modify `src/office/layout/layout.ts`, `scripts/office-layout-test.ts`; compile fixes in `src/office/draw/static.ts`.

**Interfaces:**
- `RoomKind` gains `"gym" | "game"`. Amenity rooms have `label` `"CAFETERIA"`, `"GYM"`, `"GAME ROOM"`.
- `OfficeLayout`: `building` = the HQ building's rect (the lead office draws relative to it); `sideDoor` removed; `door` = the walkway's left end.
- New export `amenitySpots(l: OfficeLayout, kind: RoomKind): Tile[]`: the wander tiles inside that building.

- [ ] Step 1: Tests (RED): drop the old one-step zoom check (spec replaced it). Add: each of cafe/gym/game exists, sits above the HQ row, and has ≥ 1 reachable `amenitySpots` tile; every room's doors are reachable from `door`; no department room overlaps another building; the 12-developer team is one building; every building is ≥ 2 tiles from its neighbours (`gap ≥ 2`).
- [ ] Step 2: Run, confirm failures on the new checks.
- [ ] Step 3: Rewrite `generateLayout` per the spec's band layout.
- [ ] Step 4: Tests GREEN; `pnpm build` passes (static.ts compile fixes only).
- [ ] Step 5: Commit "Lay the office out as a campus of buildings".

### Task 2: Camera fits the whole campus

**Files:** Create `src/office/engine/zoom.ts`; modify `src/office/engine/camera.ts`, `src/office/sceneSync.ts`; test in `scripts/office-layout-test.ts`.

**Interfaces:** `fitZoom(free: { w: number; h: number }, world: { w: number; h: number }, margin: number, dpr: number): number` — largest zoom in steps of `1/dpr`, between `1/dpr` and 6, at which `world − 2·margin` fits `free`.

- [ ] Step 1: Tests (RED): `fitZoom({w:1140,h:836}, askwellWorld, 48, 2) >= 1`; big-team world → `>= 0.5` and content fits; `dpr 1` never returns < 1.
- [ ] Step 2: Implement `zoom.ts`; camera uses it with `MIN_ZOOM = 1/DPR`; `sceneSync` re-homes when the world size changes, not only on the first layout.
- [ ] Step 3: Tests GREEN, build passes, commit "Fit the camera to the whole campus".

### Task 3: Draw the campus, gym and game room

**Files:** Modify `src/office/draw/static.ts`, `src/office/draw/furniture.ts` (add `poolTable`, `pingPong`, `arcadeCabinet`, `treadmill`, `weightRack`).

- [ ] Step 1: Each building: floor (planks; gym and game room their own floors), back wall when it faces down, walls, doors, sign. Street walkway under the belt. Café door follows the wall it's in.
- [ ] Step 2: Gym and game room art from palette colours only; no new hex literals (check against the parent commit).
- [ ] Step 3: Build + tests pass; with the product owner's OK, check both demo presets in `pnpm dev` at 1440×900@2×: whole campus visible, robots reach gym/game room/cafeteria, clicks open the right drawers, Night recolours everything. Commit "Draw the campus, gym and game room".

### Task 4: Docs and screenshot

**Files:** `docs/how-it-works.md`, `docs/images/office.png`.

- [ ] Step 1: Replace the office paragraph with the campus (buildings by department, cafeteria, gym, game room).
- [ ] Step 2: New screenshot (askwell, Classic, 1600×900@2×) during Task 3's dev run. Commit "Document the campus".
