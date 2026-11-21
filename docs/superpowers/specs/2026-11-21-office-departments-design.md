# Office departments: a main building with grounds

Status: design, approved approach (room blocks). Date: 2026-11-21.

## Why

HQ should feel like a real company. Today the whole team sits in one open room: lead corner and pantry along the top, one grid of cubicles under them, the review gate and PR belt along the bottom, a server room behind a glass wall. The product owner wants the office split into rooms and departments, set in open land, so it reads like a company campus.

## Goals

- One **main building** made of separate rooms: a lead office, a review room, and one **department room** per department that has agents.
- Agents sit in their department by role. Each department room has its name on the wall.
- **Grounds** around the building: the café (today's pantry) and the server room become small separate buildings on the grass, joined to the main building by a path, with trees and benches.
- The office still sizes itself to the team, for any team size and any mix of roles.

## Non-goals

- No change to logic: agents, tasks, PRs, review, sessions, the server and the data contract (`src/data/types.ts`) all stay as they are.
- No new pixel-art style. Robots, desks, partitions, plants, racks, the plan wall, the easel, the gate and the belt keep their current drawings. Walls, floors, lawn, paths and trees reuse what `static.ts` and `furniture.ts` already draw. The only new art is small: room name signs, a side door, and benches, all in the same style and drawn through `Pen`, so themes recolour them.
- No new dependency.
- No change to Settings. Departments come from the role an agent already has.

## Anti-goals (a failure even if it works)

- Any click, hover, drag, zoom or keyboard behaviour from project.md §6 stops working or lines up wrong.
- A department room with one desk looks empty or broken, or an empty department is drawn.
- The office no longer fits a 5-agent team on screen at the default zoom.
- Night (or any theme) shows the new pieces in fixed colours.
- Parcels on the belt or robots on their errands get stuck, walk through walls or never arrive.

## Constraints

- Project rules (project.md §7): colours from the palette/tokens only, TypeScript strict, relative imports, works on all three OSes, `pnpm build` passes, demo data shows the change.
- project.md §9 currently says the layout stays. The product owner decided to change it (2026-11-21). §9 gets a line saying the layout now has rooms and grounds; the product owner makes or approves that edit. plan.md is not edited by this work.
- `src/data/roles.ts` (role catalog) is in upstream PR #45, not merged. This work must not depend on it.
- The belt is a `BeltPath` (`src/office/actors/parcels.ts`): one horizontal run left to right, plus one optional vertical run at its right end that only goes **up**. Parcels only move forward, and find a desk's drop point by x only (`sAtX`). So the gate must sit on the horizontal run to the right of every drop point, and the racks must be above the belt row. The layout must fit that shape so `parcels.ts` doesn't change.

## Approaches considered

1. **Room blocks (chosen).** `generateLayout` builds a list of rooms, each with a size that grows with its headcount and its furniture, and a packer places them. The layout's output keeps the same fields, so robots, parcels, the scene and input keep working. `static.ts` draws per room. Picked because any team and any mix of roles lays out correctly.
2. **Patch the current layout.** Add walls between today's zones and hard-code department spots. Quicker, but the fixed spots break or look empty as teams change, and every new role needs another patch.
3. **Hand-drawn maps.** A few fixed floor plans with agent slots. Looks hand-made but fights HQ's size-to-team behaviour and adds map data to maintain.

## Departments (decided)

A department is picked from the agent's `role` text, case-insensitive, trimmed:

| Department | Roles |
| --- | --- |
| Engineering | developer, frontend, frontend developer, backend, backend developer |
| Design & Docs | designer, docs |
| Quality | qa, code reviewer, security |
| Ops | devops |

Any other role goes to Engineering. (Once #45 lands, a custom role whose kind is `reviewer` should go to Quality; that is a one-line follow-up, not part of this work.) The lead is never in a department: they sit in the lead office.

Order inside the building: Engineering, Quality, Design & Docs, Ops. Departments with no agents are not drawn. Desks inside a room are ordered as the team list orders them.

The mapping lives in a new `src/office/layout/departments.ts`, so no shared path is touched.

## The layout (decided)

```
~~~~~~~~~~~~~~~~~~~~~~~~~~~~ grass ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~ ┌─ main building ─────────────────────────┐    ┌ Server ──┐    ~
~ │ Lead office           │ Review room     │    │ ▮ ▮ ▮    │    ~
~ │ plan wall, sign,      │ PR board        │    └────▲─────┘    ~
~ │ lead desk             │                 │         ║ belt up  ~
~ ├────────[+]────────────┴──────────[gate]═╪═════════╝          ~
~ │ ════ PR belt ═══════════════════════════│                    ~
~ D   walking strip (drop points)           S──── path ──┐       ~
~ ├──door──────┬──door──────┬──door─────────┤      ┌ Café ┐      ~
~ │ Engineering│ Quality    │ Design & Docs │      └──────┘      ~
~ │ [▣][▣][▣]  │ [▣][▣]     │ [▣]           │   🌳 bench 🌳      ~
~ └────────────┴────────────┴───────────────┘                    ~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
D = front door (left wall)   S = side door to the grounds
[+] = crossing plate over the belt into the lead office and review room
```

- **Top row:** the lead office (plan wall, office sign, SHIP poster, bookshelf, lead desk and the stand-up corner, as in today's lead corner) and, at the right end, the review room (PR board easel). Without review enabled there is no review room, and the lead office takes the full width.
- **Corridor:** a band across the building under the top row. The PR belt runs along its top edge, against the top row's wall, and a walking strip runs under it. Drop points are on the walking strip, in line with each desk column, as today. The gate sits on the belt at the right end of the corridor, in front of the review room and to the right of every drop point. *(Builder check, my call: parcels only move forward, so the gate has to be past every desk.)* The project-name floor logo moves onto the walking strip.
- **Crossing the belt:** robots reach the lead office and review room over a walkable crossing plate (a small step-over bridge drawn on the belt) at each top-row door. Nobody else crosses the belt. *(Builder check, my call.)*
- **Department rooms:** below the corridor, side by side, each with a door onto the walking strip and its name sign on its back wall. A room is as wide as its desks need: cubicles keep today's size (7×7 tiles, pitch 8). Department rooms never reach right of the gate. When they're too wide for one row, they wrap to a second row below, and rooms in that row reach the corridor through a short side passage.
- **Grounds:** the front door stays on the left wall at the walking strip, opening onto the path that exists today. A side door on the right wall, also at the walking strip (below the belt's exit), opens onto a path down to the café. The lawn, flowers and trees that `static.ts` draws today stay, with a few benches added near the café.
- **Café (lower right, outside):** today's pantry furniture (counter, coffee machine, fridge, water cooler, couch, table, arcade) moved into a small building. Idle robots walk there for coffee (`lounge.coffee`) and to the wander spots, which now include spots on the grounds. The window and clock that `live.ts` places from `lounge.x0` move with it.
- **Server building (upper right, outside):** only when deploy is on and there are environments, as today. It holds the racks and sits higher than the belt row, because the belt only climbs. The belt leaves through the right wall at its own row and climbs to the racks; the path from the side door goes down, away from it, so the two never cross. *(Builder check, my call: this swaps the café and server from the first sketch, so `parcels.ts` doesn't change.)* Desk-to-rack cables run in a trench under the grass. Without environments, there is no server building, and the mailbox ("MAIN") stays at the belt's end inside the building, as today.

## What stays the same (decided)

- `OfficeLayout` keeps every field the rest of the code reads (`desks`, `lead`, `plan`, `lounge.coffee`, `belt`, `gate`, `prBoard`, `racks`, `mailbox`, `cables`, `door`, `wander`, `hits`, `grid`, `worldW/H`, `ox/oy`). Fields that only described the old single room (`mainW`, `lounge.x0/w`, `serverRoom`) can change or go, as long as everything that reads them is updated.
- Click targets and the drawers they open don't change: agent → its drawer, plan wall → Boards, gate and PR board → Pull requests, rack → that environment.
- `layoutKey` adds each agent's role, so changing a role in Settings moves the agent to their new department.

## Files

| File | Change |
| --- | --- |
| `src/office/layout/departments.ts` | New: role → department mapping |
| `src/office/layout/layout.ts` | Rooms, packer, grounds, walk grid, belt, hits |
| `src/office/draw/static.ts` | Floors, walls, doors and decor drawn per room; café and server buildings; benches |
| `src/office/draw/furniture.ts` | A bench and a room name sign, if they don't fit inline |
| `src/office/engine/palette.ts` | Only if a new colour is needed; prefer existing ones |
| `src/office/draw/live.ts` | Window and clock positions, which read `lounge.x0` today |
| Anything else reading `mainW`, `lounge` or `serverRoom` | Updated to the new fields |
| `src/data/mock/presets.ts` | Demo team covers at least three departments (the 7-agent preset already does: Developer ×3, QA, Designer, Docs). Add a DevOps agent to one preset so Ops shows. |
| `README.md` screenshot, `docs/how-it-works.md` | New office screenshot and a line saying agents sit in departments by role |

## How we'll know it works

- `pnpm dev`: each demo preset shows the main building, department rooms with name signs, the café and (where environments exist) the server building on the grass.
- Robots walk to their desks, to the café and the grounds, and carry PRs to the belt, without walking through walls. Parcels run the belt, stop at the gate and reach the racks or mailbox.
- Every row of project.md §6 still holds, and the core flow (§2) still passes.
- Changing an agent's role in Settings → Team moves them to the right room. Adding or removing agents resizes rooms, and an emptied department disappears.
- Teams of 1, 5 and 12 workers all lay out cleanly. In a 1440×900 browser window, each demo preset's default view (`camera.home()`) zooms out at most one zoom step further than it does today. *(Builder check, my call: this caps how much grass and spacing the grounds can add.)*
- Classic and Night both colour every new piece.
- `pnpm build` passes and CI is green.

## Left to the builder

- The packer's exact rules (room widths, wrap point, corridor height, passage placement) within the shape above.
- Exact positions of furniture inside each room, and of benches and trees on the grounds.
- Whether the layout code splits into several files under `src/office/layout/`.
- Name sign wording and size (for example "ENGINEERING", or "ENG" when the room is narrow).
