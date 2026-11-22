// Turns the team + workflow config into an office: a main building of rooms, set in grounds
// with a café and a server building outside. Everything is on one tile grid (site tiles).
//
//   ┌ main building ─────────────────────────┐    ┌ server ┐   (only with environments;
//   │ Lead office            │ Review room   │    │ racks  │    always above the belt)
//   ├──[+]───────────────────┴───[+]──[gate]═╪════╝
//   │ ═══ PR belt ═══════════════════════════│
//   D   walking strip (drop points)          S── path ──┐
//   ├─door───────┬─door───────┬────┐ lobby  │      ┌ café ┐
//   │ Engineering│ Quality    │ …  │        │      └──────┘
//   └────────────┴────────────┴────┴────────┘    benches
//
// Department rows wrap when too wide; a passage under each row leads to the lobby.

import type { AgentConfig, Environment, HqConfig } from "../../data/types";
import { deskCarpets } from "../engine/palette";
import { WalkGrid, type Tile } from "../engine/path";
import { groupByDepartment } from "./departments";

export const TS = 16;
export const MARGIN = 3;

const LEAD_MIN = 21; // lead office width incl. walls (its furniture reaches x = 19)
const REVIEW_W = 12;
const BELT_ROW = 13; // building rows: 0–3 walls, 4–11 top row, 12 wall, 13 belt, 14–15 strip
const STRIP_ROW = 14;
const DEPT_TOP = 16; // first department row's top wall
const CUB = 7;
const PITCH = 8;
const ROW_MAX = 44; // a department row wraps past this width
const LOBBY_MIN = 3;
const LOBBY_MIN_REVIEW = 9; // room for the gate past every drop point
const RACKS_PER_ROW = 8;
const CAFE_W = 11;
const CAFE_H = 13;
const GROUNDS_GAP = 2;

export interface PxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DeskSpot {
  agentId: string;
  index: number;
  x0: number; // cubicle origin, site tiles
  y0: number;
  seat: Tile;
  drop: Tile;
  rect: PxRect; // world px
  carpet: [string, string];
}

export interface Rack extends PxRect {
  name: string;
  agentId: string | null;
}

export type HitKind = "agent" | "plan" | "prs" | "gate" | "env";

export interface Hit {
  kind: HitKind;
  id: string;
  rect: PxRect;
}

export type RoomKind = "lead" | "review" | "corridor" | "department" | "cafe" | "server";

/** A room in site tiles, walls included. Neighbouring rooms share a wall. */
export interface Room {
  kind: RoomKind;
  id: string; // DepartmentId for departments, otherwise the kind (or "lobby" / "passage-N")
  x0: number;
  y0: number;
  w: number;
  h: number;
  label: string | null;
  doors: Tile[];
}

export interface OfficeLayout {
  key: string;
  W: number; // site size in tiles (building + grounds)
  H: number;
  ox: number; // site origin in world px
  oy: number;
  worldW: number;
  worldH: number;
  grid: WalkGrid; // site tile coords
  building: { x0: number; y0: number; w: number; h: number };
  rooms: Room[];
  lead: { agentId: string | null; seat: Tile; rect: PxRect };
  plan: { board: PxRect; spot: Tile };
  lounge: { coffee: Tile[] };
  desks: DeskSpot[];
  belt: { y: number; x0: number; x1: number; topY: number | null }; // px; topY = vertical run end
  gate: PxRect | null;
  prBoard: PxRect | null;
  racks: Rack[];
  mailbox: PxRect | null;
  cables: { agentId: string; pts: [number, number][] }[];
  crossings: Tile[]; // belt tiles robots may walk over
  benches: Tile[]; // left tile of each 2-tile bench
  door: Tile; // inside the front door
  sideDoor: Tile;
  wander: Tile[];
  hits: Hit[];
}

export function layoutKey(config: HqConfig, envs: Environment[]): string {
  const wf = config.workflow;
  return JSON.stringify([
    config.team.map((a) => [a.id, a.name, a.color, a.isLead, a.role]),
    wf.review.enabled,
    wf.review.tool,
    wf.deploy.enabled,
    envs.map((e) => e.name),
    config.project.officeName ?? "",
  ]);
}

export function deskColumns(n: number): number {
  if (n <= 4) return Math.max(1, n);
  return Math.min(5, Math.ceil(n / 2));
}

interface Planned {
  id: string;
  label: string;
  members: AgentConfig[];
  cols: number;
  rows: number;
  w: number;
}

export function generateLayout(config: HqConfig, envs: Environment[]): OfficeLayout {
  const lead: AgentConfig | undefined = config.team.find((a) => a.isLead);
  const workers = config.team.filter((a) => !a.isLead);
  const review = config.workflow.review.enabled;
  const hasServer = config.workflow.deploy.enabled && envs.length > 0;

  // ---------------------------------------------------------- department rows
  const planned: Planned[] = groupByDepartment(workers).map(({ dept, members }) => {
    const cols = deskColumns(members.length);
    return { id: dept.id, label: dept.label, members, cols, rows: Math.ceil(members.length / cols), w: 2 + cols * PITCH };
  });
  const rows: Planned[][] = [];
  for (const p of planned) {
    const row = rows[rows.length - 1];
    const width = row ? 1 + row.reduce((s, q) => s + q.w - 1, 0) + p.w - 1 : p.w;
    if (row && width <= ROW_MAX) row.push(p);
    else rows.push([p]);
  }
  const rowWidth = (row: Planned[]) => 1 + row.reduce((s, q) => s + q.w - 1, 0);
  const R = rows.length ? Math.max(...rows.map(rowWidth)) : 1; // department area width; lobby starts here

  // ---------------------------------------------------------- building size
  const BW = Math.max(R + 1 + (review ? LOBBY_MIN_REVIEW : LOBBY_MIN), review ? LEAD_MIN + REVIEW_W - 1 : LEAD_MIN + 9);
  let deptBottom = DEPT_TOP; // bottom wall of the last row
  const rowTops: number[] = [];
  rows.forEach((row, i) => {
    const top = i === 0 ? DEPT_TOP : deptBottom + 2; // a passage row between rows
    rowTops.push(top);
    deptBottom = top + Math.max(...row.map((q) => q.rows)) * PITCH + 1;
  });
  const BH = deptBottom + 1;

  // ---------------------------------------------------------- server rows decide how far down the building sits
  const rackCount = hasServer ? envs.length : 0;
  const rackRows = Math.ceil(rackCount / RACKS_PER_ROW);
  const by0 = hasServer ? Math.max(0, 7 * rackRows - 11) : 0;
  const Y = (t: number) => by0 + t; // building row → site row

  const sx0 = BW + GROUNDS_GAP; // outbuildings' left wall
  const srW = hasServer ? 4 + Math.min(rackCount, RACKS_PER_ROW) * 2 : 0;
  const srH = 2 + rackRows * 7;
  const sy0 = Y(BELT_ROW - 1) - srH + 1; // bottom wall right above the belt row
  const cy0 = Y(STRIP_ROW); // café top wall
  const W = sx0 + Math.max(CAFE_W, srW) + GROUNDS_GAP;
  const H = Math.max(Y(BH), cy0 + CAFE_H + 3);

  const ox = MARGIN * TS;
  const oy = MARGIN * TS;
  const px = (tx: number) => ox + tx * TS;
  const py = (ty: number) => oy + ty * TS;

  const grid = new WalkGrid(W, H);
  const rooms: Room[] = [];
  const open = (x0: number, y0: number, x1: number, y1: number) => grid.set(x0, y0, x1, y1, true);
  const block = (x0: number, y0: number, x1: number, y1: number) => grid.set(x0, y0, x1, y1, false);

  // Grounds: everything outside the building is lawn you can walk on.
  open(0, 0, W - 1, H - 1);
  block(0, Y(0), BW - 1, Y(BH - 1));

  // ---------------------------------------------------------- top row: lead office + review room
  const rvx0 = review ? BW - REVIEW_W : BW - 1; // wall between lead office and review room
  const leadDoorX = 10;
  const reviewDoorX = rvx0 + 2;
  rooms.push({ kind: "lead", id: "lead", x0: 0, y0: Y(0), w: rvx0 + 1, h: 13, label: null, doors: [[leadDoorX, Y(12)]] });
  open(1, Y(4), rvx0 - 1, Y(11));
  block(13, Y(5), 17, Y(6)); // lead desk
  block(18, Y(4), 19, Y(4)); // bookshelf
  block(11, Y(4), 11, Y(4)); // plant
  block(1, Y(4), 1, Y(4));
  for (const [x, y] of [[3, 8], [8, 8], [5, 10], [1, 11]] as Tile[]) block(x, Y(y), x, Y(y)); // stand-up corner
  let prBoard: PxRect | null = null;
  if (review) {
    rooms.push({ kind: "review", id: "review", x0: rvx0, y0: Y(0), w: REVIEW_W, h: 13, label: null, doors: [[reviewDoorX, Y(12)]] });
    open(rvx0 + 1, Y(4), BW - 2, Y(11));
    prBoard = { x: px(rvx0 + 4), y: py(Y(6)) + 4, w: 64, h: 40 };
    block(rvx0 + 4, Y(6), rvx0 + 7, Y(9));
  }

  // ---------------------------------------------------------- corridor: belt row + walking strip
  rooms.push({ kind: "corridor", id: "corridor", x0: 0, y0: Y(12), w: BW, h: 5, label: null, doors: [[0, Y(15)], [BW - 1, Y(15)]] });
  open(1, Y(STRIP_ROW), BW - 2, Y(15));
  const crossings: Tile[] = [[leadDoorX, Y(BELT_ROW)]];
  if (review) crossings.push([reviewDoorX, Y(BELT_ROW)]);
  for (const [x, y] of crossings) open(x, y - 1, x, y); // door in the wall + plate over the belt
  open(0, Y(15), 0, Y(15)); // front door
  open(BW - 1, Y(15), BW - 1, Y(15)); // side door

  // ---------------------------------------------------------- department rooms
  const desks: DeskSpot[] = [];
  let index = 0;
  rows.forEach((row, ri) => {
    const top = rowTops[ri];
    const h = Math.max(...row.map((q) => q.rows)) * PITCH + 2;
    let rx = 0;
    row.forEach((q, qi) => {
      const w = qi === row.length - 1 ? R - rx : q.w; // the last room stretches to the lobby
      // A door at the left, plus one above each desk column so robots walk straight out to the belt.
      const doors: Tile[] = [[rx + 1, Y(top)]];
      for (let c = 0; c < q.cols; c++) doors.push([rx + 3 + c * PITCH, Y(top)]);
      rooms.push({ kind: "department", id: q.id, x0: rx, y0: Y(top), w, h, label: q.label, doors });
      open(rx + 1, Y(top + 1), rx + w - 2, Y(top + h - 2));
      for (const [x, y] of doors) open(x, y, x, y);
      q.members.forEach((a, k) => {
        const x0 = rx + 2 + (k % q.cols) * PITCH;
        const y0 = Y(top + 2 + Math.floor(k / q.cols) * PITCH);
        block(x0, y0, x0 + CUB - 1, y0);
        open(x0 + 1, y0, x0 + 1, y0); // cubicle door gap
        block(x0, y0, x0, y0 + CUB - 1);
        block(x0 + CUB - 1, y0, x0 + CUB - 1, y0 + CUB - 1);
        block(x0 + 2, y0 + 1, x0 + 4, y0 + 2); // desk
        desks.push({
          agentId: a.id,
          index,
          x0,
          y0,
          seat: [x0 + 3, y0 + 3],
          drop: [x0 + 3, Y(STRIP_ROW)],
          rect: { x: px(x0), y: py(y0) - 4, w: CUB * TS, h: CUB * TS + 4 },
          carpet: deskCarpets[index % deskCarpets.length],
        });
        index++;
      });
      rx += w - 1;
    });
    if (ri > 0) {
      // passage above this row, from the left wall to the lobby
      rooms.push({ kind: "corridor", id: `passage-${ri}`, x0: 0, y0: Y(top - 2), w: R + 1, h: 3, label: null, doors: [[R, Y(top - 1)]] });
      open(1, Y(top - 1), R, Y(top - 1));
    }
  });
  // Keep workers' desks in team order, as the rest of the office expects.
  desks.sort((a, b) => workers.findIndex((w) => w.id === a.agentId) - workers.findIndex((w) => w.id === b.agentId));

  // ---------------------------------------------------------- lobby: right of the departments, down from the corridor
  if (BH - 2 >= DEPT_TOP) {
    rooms.push({ kind: "corridor", id: "lobby", x0: R - 1, y0: Y(15), w: BW - R + 1, h: BH - 15, label: null, doors: [] });
    open(R, Y(DEPT_TOP), BW - 2, Y(BH - 2));
  }

  // ---------------------------------------------------------- belt, gate, mailbox, server building
  const beltY = py(Y(BELT_ROW)) + 8;
  let gate: PxRect | null = null;
  if (review) {
    const gx = BW - 8;
    gate = { x: px(gx), y: py(Y(BELT_ROW)) - 25, w: 68, h: 46 };
    block(gx, Y(BELT_ROW), gx + 4, Y(STRIP_ROW));
  }
  const racks: Rack[] = [];
  let mailbox: PxRect | null = null;
  let beltX1: number;
  let beltTop: number | null = null;
  if (hasServer) {
    rooms.push({ kind: "server", id: "server", x0: sx0, y0: sy0, w: srW, h: srH, label: "SERVER ROOM", doors: [] });
    block(sx0, sy0, sx0 + srW - 1, sy0 + srH - 1);
    envs.forEach((env, i) => {
      const c = i % RACKS_PER_ROW;
      const r = Math.floor(i / RACKS_PER_ROW);
      racks.push({ name: env.name, agentId: env.agentId, x: px(sx0 + 2) + c * 32, y: py(sy0 + 1) + 8 + r * 112, w: 32, h: 92 });
    });
    beltX1 = px(sx0 + 1) + 8;
    beltTop = py(sy0) + 112 * rackRows + 2;
    block(BW, Y(BELT_ROW), sx0 + 1, Y(BELT_ROW)); // belt across the lawn
  } else {
    beltX1 = px(BW - 2) - 4;
    mailbox = { x: px(BW - 2) - 6, y: py(Y(BELT_ROW)) - 14, w: 22, h: 30 };
    block(BW - 2, Y(BELT_ROW), BW - 2, Y(BELT_ROW));
  }

  // ---------------------------------------------------------- café (lower right, outside)
  const cafe: Room = { kind: "cafe", id: "cafe", x0: sx0, y0: cy0, w: CAFE_W, h: CAFE_H, label: null, doors: [[sx0, cy0 + 7]] };
  rooms.push(cafe);
  block(sx0, cy0, sx0 + CAFE_W - 1, cy0 + CAFE_H - 1);
  open(sx0 + 1, cy0 + 4, sx0 + CAFE_W - 2, cy0 + 11);
  open(sx0, cy0 + 7, sx0, cy0 + 7); // door
  const C0 = (x: number, y: number): Tile => [sx0 + x, cy0 + y]; // café-local → site
  block(...C0(1, 4), ...C0(4, 4)); // counter + fridge
  block(...C0(3, 8), ...C0(6, 8)); // couch
  block(...C0(4, 10), ...C0(5, 10)); // table
  block(...C0(9, 4), ...C0(9, 4)); // water cooler
  block(...C0(9, 7), ...C0(9, 8)); // arcade
  const benches: Tile[] = [C0(2, CAFE_H + 1), C0(7, CAFE_H + 1)];
  for (const [x, y] of benches) block(x, y, x + 1, y);

  // ---------------------------------------------------------- cables (desk → own rack, under the belt)
  const cables: OfficeLayout["cables"] = [];
  desks.forEach((d, i) => {
    const rack = racks.find((r) => r.agentId === d.agentId);
    if (!rack) return;
    const sx = px(d.x0 + 3) + 4 + (i % 3) * 3;
    const laneY = beltY - 6 + (i % 4) * 3; // hidden under the belt, which climbs to the racks
    const rx = rack.x + 10 + (i % 3) * 4;
    cables.push({ agentId: d.agentId, pts: [[sx, py(d.y0 + 2) + 12], [sx, laneY], [rx, laneY], [rx, rack.y + rack.h]] });
  });

  // ---------------------------------------------------------- hits
  const hits: Hit[] = [];
  const planBoard = { x: px(2) + 3, y: py(Y(0)) + 19, w: 140, h: 40 };
  const leadRect = { x: px(12), y: py(Y(4)), w: 6 * TS, h: 3 * TS };
  hits.push({ kind: "plan", id: "plan", rect: { x: planBoard.x - 3, y: planBoard.y - 8, w: planBoard.w + 6, h: planBoard.h + 14 } });
  if (lead) hits.push({ kind: "agent", id: lead.id, rect: leadRect });
  for (const d of desks) hits.push({ kind: "agent", id: d.agentId, rect: d.rect });
  if (gate) hits.push({ kind: "gate", id: "gate", rect: { x: gate.x, y: gate.y - 16, w: gate.w, h: gate.h + 16 } });
  if (prBoard) hits.push({ kind: "prs", id: "prs", rect: { x: prBoard.x, y: prBoard.y, w: prBoard.w, h: prBoard.h + 26 } });
  for (const r of racks) hits.push({ kind: "env", id: r.name, rect: r });

  const coffee: Tile[] = [C0(1, 5), C0(2, 5), C0(3, 5)];
  const wander: Tile[] = [
    C0(4, 9), C0(6, 9), C0(7, 6), // café
    [4, Y(9)], [7, Y(9)], [6, Y(11)], // stand-up corner
    [benches[0][0], benches[0][1] + 1], [benches[1][0] + 1, benches[1][1] + 1], // by the benches
    [BW + 1, Y(STRIP_ROW) + 3], // outside the side door
  ];

  return {
    key: layoutKey(config, envs),
    W,
    H,
    ox,
    oy,
    worldW: (W + MARGIN * 2) * TS,
    worldH: (H + MARGIN * 2) * TS,
    grid,
    building: { x0: 0, y0: Y(0), w: BW, h: BH },
    rooms,
    lead: { agentId: lead?.id ?? null, seat: [15, Y(7)], rect: leadRect },
    plan: { board: planBoard, spot: [6, Y(5)] },
    lounge: { coffee },
    desks,
    belt: { y: beltY, x0: px(2), x1: beltX1, topY: beltTop },
    gate,
    prBoard,
    racks,
    mailbox,
    cables,
    crossings,
    benches,
    door: [1, Y(15)],
    sideDoor: [BW - 1, Y(15)],
    wander: wander.filter(([x, y]) => grid.ok(x, y)),
    hits,
  };
}

/** The first room of a kind. The lead office, corridor and café always exist. */
export function roomOf(l: OfficeLayout, kind: RoomKind): Room | undefined {
  return l.rooms.find((r) => r.kind === kind);
}

/** Tile centre in world px. */
export function tileCentre(l: OfficeLayout, t: Tile): { x: number; y: number } {
  return { x: l.ox + t[0] * TS + 8, y: l.oy + t[1] * TS + 8 };
}
