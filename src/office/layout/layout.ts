// Turns the team + workflow config into an office campus: separate buildings on a lawn, along a
// street that carries the PR belt. Everything is on one tile grid (site tiles).
//
//   ┌ Cafeteria ┐  ┌ Gym ┐  ┌ Game room ┐          amenity row (doors face down)
//   ┌ HQ ┐ ║ ┌ Review ┐  ┌ Server ┐                street row (server above the belt)
//   ══[+]═[+]══[+]══[gate]══╝                        the street: belt, then a walkway
//   ┌ Engineering ┐  ┌ Quality ┐                     departments, two rows
//   ┌ Design & Docs ┐  ┌ Ops ┐
//
// Robots cross the belt only on plates: HQ's door, the review door, and the alley beside HQ.

import type { AgentConfig, Environment, HqConfig } from "../../data/types";
import { deskCarpets } from "../engine/palette";
import { WalkGrid, type Tile } from "../engine/path";
import { groupByDepartment } from "./departments";

export const TS = 16;
export const MARGIN = 3;

const LEAD_MIN = 21; // HQ width incl. walls (its furniture reaches x = 19)
const REVIEW_W = 12;
const AMENITY_W = 11;
const AMENITY_H = 13;
const HQ_H = 13;
const GAP = 2; // lawn between buildings
const T = AMENITY_H + GAP; // first row of the street row (HQ, review, server)
const BELT_ROW = T + HQ_H; // the belt runs right under the street-row buildings
const WALK_ROW = BELT_ROW + 1; // drop points
const DEPT_TOP = BELT_ROW + 3; // first department row's top wall
const CUB = 7;
const PITCH = 8;
const RACKS_PER_ROW = 8;

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

export type RoomKind = "lead" | "review" | "corridor" | "department" | "cafe" | "gym" | "game" | "server";

/** A room in site tiles, walls included. Neighbouring rooms share a wall. */
export interface Room {
  kind: RoomKind;
  id: string; // DepartmentId for departments, otherwise the kind
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
  building: { x0: number; y0: number; w: number; h: number }; // HQ: the lead office draws relative to it
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
  door: Tile; // the walkway's left end, where robots arrive
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

/** Wander tiles inside each amenity, amenity-local (x, y). */
const AMENITY_SPOTS: Record<"cafe" | "gym" | "game", Tile[]> = {
  cafe: [[4, 9], [6, 9], [7, 6]],
  gym: [[1, 7], [5, 7], [4, 10], [7, 9]],
  game: [[2, 9], [6, 10], [8, 9], [5, 6]],
};

export function generateLayout(config: HqConfig, envs: Environment[]): OfficeLayout {
  const lead: AgentConfig | undefined = config.team.find((a) => a.isLead);
  const workers = config.team.filter((a) => !a.isLead);
  const review = config.workflow.review.enabled;
  const hasServer = config.workflow.deploy.enabled && envs.length > 0;

  // ---------------------------------------------------------- department rows (two, about half the width each)
  const planned: Planned[] = groupByDepartment(workers).map(({ dept, members }) => {
    const cols = deskColumns(members.length);
    return { id: dept.id, label: dept.label, members, cols, rows: Math.ceil(members.length / cols), w: 2 + cols * PITCH };
  });
  const total = planned.reduce((n, q) => n + q.w + GAP, 0);
  const split: Planned[][] = [[], []];
  let acc = 0;
  for (const q of planned) {
    (acc < total / 2 || !split[0].length ? split[0] : split[1]).push(q);
    acc += q.w + GAP;
  }
  const deptRows = split.filter((r) => r.length);
  const rowH = (r: Planned[]) => Math.max(...r.map((q) => q.rows)) * PITCH + 2;
  const deptRight = Math.max(0, ...deptRows.map((r) => r.reduce((n, q) => n + q.w + GAP, 0))); // first free column
  const deptBottom = deptRows.reduce((y, r, i) => y + (i ? GAP : 0) + rowH(r), DEPT_TOP);

  // ---------------------------------------------------------- server rows decide how far down everything sits
  const rackCount = hasServer ? envs.length : 0;
  const rackRows = Math.ceil(rackCount / RACKS_PER_ROW);
  const srH = 2 + rackRows * 7;
  const by0 = hasServer ? Math.max(0, srH - HQ_H) : 0; // a tall server building pushes the campus down
  const Y = (t: number) => by0 + t;

  // ---------------------------------------------------------- x positions
  const amenityX = { cafe: 0, gym: AMENITY_W + GAP, game: 2 * (AMENITY_W + GAP) };
  const alleyX = LEAD_MIN; // lawn column right of HQ, from the amenities to the street
  const reviewX = Math.max(LEAD_MIN + GAP, deptRight); // the gate in front of it is past every drop point
  const gx = reviewX + 3;
  const srX = review ? reviewX + REVIEW_W + GAP : Math.max(LEAD_MIN + GAP, deptRight);
  const srW = hasServer ? 4 + Math.min(rackCount, RACKS_PER_ROW) * 2 : 0;
  const sy0 = Y(BELT_ROW) - srH; // bottom wall right above the belt
  const W = Math.max(srX + srW, deptRight, amenityX.game + AMENITY_W + GAP) + GAP;
  const H = Y(Math.max(deptBottom, DEPT_TOP)) + GAP;

  const ox = MARGIN * TS;
  const oy = MARGIN * TS;
  const px = (tx: number) => ox + tx * TS;
  const py = (ty: number) => oy + ty * TS;

  const grid = new WalkGrid(W, H);
  const rooms: Room[] = [];
  const open = (x0: number, y0: number, x1: number, y1: number) => grid.set(x0, y0, x1, y1, true);
  const block = (x0: number, y0: number, x1: number, y1: number) => grid.set(x0, y0, x1, y1, false);
  open(0, 0, W - 1, H - 1); // lawn

  /** A building: solid outline, walkable floor from `floorTop`, doors open. */
  const building = (r: Room, floorTop: number) => {
    rooms.push(r);
    block(r.x0, r.y0, r.x0 + r.w - 1, r.y0 + r.h - 1);
    open(r.x0 + 1, floorTop, r.x0 + r.w - 2, r.y0 + r.h - 2);
    for (const [x, y] of r.doors) open(x, y, x, y);
  };

  // ---------------------------------------------------------- amenity row
  const amenity = (kind: "cafe" | "gym" | "game", label: string) => {
    const x0 = amenityX[kind];
    building({ kind, id: kind, x0, y0: Y(0), w: AMENITY_W, h: AMENITY_H, label, doors: [[x0 + 5, Y(AMENITY_H - 1)]] }, Y(4));
    return (x: number, y: number): Tile => [x0 + x, Y(y)];
  };
  const C0 = amenity("cafe", "CAFETERIA");
  block(...C0(1, 4), ...C0(4, 4)); // counter + fridge
  block(...C0(3, 8), ...C0(6, 8)); // couch
  block(...C0(4, 10), ...C0(5, 10)); // table
  block(...C0(9, 4), ...C0(9, 4)); // water cooler
  block(...C0(9, 7), ...C0(9, 8)); // arcade
  const G0 = amenity("gym", "GYM");
  block(...G0(1, 4), ...G0(2, 5)); // treadmills
  block(...G0(4, 4), ...G0(5, 5));
  block(...G0(8, 4), ...G0(9, 6)); // weight rack
  block(...G0(2, 8), ...G0(3, 8)); // bench press
  const P0 = amenity("game", "GAME ROOM");
  block(...P0(2, 5), ...P0(5, 6)); // pool table
  block(...P0(1, 8), ...P0(3, 8)); // beanbags
  block(...P0(7, 4), ...P0(9, 4)); // arcade cabinets
  block(...P0(6, 8), ...P0(8, 9)); // ping-pong table
  const benches: Tile[] = [C0(1, AMENITY_H + 1), [amenityX.gym + 1, Y(AMENITY_H + 1)], [amenityX.game + 1, Y(AMENITY_H + 1)]];
  for (const [x, y] of benches) block(x, y, x + 1, y);

  // ---------------------------------------------------------- street row: HQ, review, server
  const Q = (t: number) => Y(T + t); // street-row local → site row
  const leadDoorX = 10;
  building({ kind: "lead", id: "lead", x0: 0, y0: Q(0), w: LEAD_MIN, h: HQ_H, label: null, doors: [[leadDoorX, Q(HQ_H - 1)]] }, Q(4));
  block(13, Q(5), 17, Q(6)); // lead desk
  block(18, Q(4), 19, Q(4)); // bookshelf
  block(11, Q(4), 11, Q(4)); // plant
  block(1, Q(4), 1, Q(4));
  for (const [x, y] of [[3, 8], [8, 8], [5, 10], [1, 11]] as Tile[]) block(x, Q(y), x, Q(y)); // stand-up corner

  const crossings: Tile[] = [[leadDoorX, Y(BELT_ROW)], [alleyX, Y(BELT_ROW)]];
  let prBoard: PxRect | null = null;
  if (review) {
    const door: Tile = [reviewX + 1, Q(HQ_H - 1)];
    building({ kind: "review", id: "review", x0: reviewX, y0: Q(0), w: REVIEW_W, h: HQ_H, label: "REVIEW", doors: [door] }, Q(4));
    prBoard = { x: px(reviewX + 4), y: py(Q(6)) + 4, w: 64, h: 40 };
    block(reviewX + 4, Q(6), reviewX + 7, Q(9));
    crossings.push([door[0], Y(BELT_ROW)]);
  }

  // ---------------------------------------------------------- the street
  rooms.push({ kind: "corridor", id: "street", x0: 0, y0: Y(BELT_ROW), w: W, h: 2, label: null, doors: [] });
  const beltY = py(Y(BELT_ROW)) + 8;

  // ---------------------------------------------------------- department buildings
  const desks: DeskSpot[] = [];
  let index = 0;
  let top = DEPT_TOP;
  deptRows.forEach((row, ri) => {
    if (ri) top += rowH(deptRows[ri - 1]) + GAP;
    const h = rowH(row);
    let rx = 0;
    for (const q of row) {
      const doors: Tile[] = [[rx + 1, Y(top)]];
      for (let c = 0; c < q.cols; c++) doors.push([rx + 3 + c * PITCH, Y(top)]); // one above each desk column
      building({ kind: "department", id: q.id, x0: rx, y0: Y(top), w: q.w, h, label: q.label, doors }, Y(top + 1));
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
          drop: [x0 + 3, Y(WALK_ROW)],
          rect: { x: px(x0), y: py(y0) - 4, w: CUB * TS, h: CUB * TS + 4 },
          carpet: deskCarpets[index % deskCarpets.length],
        });
        index++;
      });
      rx += q.w + GAP;
    }
  });
  // Team order, as the rest of the office expects.
  desks.sort((a, b) => workers.findIndex((w) => w.id === a.agentId) - workers.findIndex((w) => w.id === b.agentId));

  // ---------------------------------------------------------- belt, gate, server / mailbox
  let gate: PxRect | null = null;
  if (review) {
    gate = { x: px(gx), y: py(Y(BELT_ROW)) - 25, w: 68, h: 46 };
    block(gx, Y(BELT_ROW), gx + 4, Y(WALK_ROW));
  }
  const racks: Rack[] = [];
  let mailbox: PxRect | null = null;
  let beltX1: number;
  let beltTop: number | null = null;
  if (hasServer) {
    rooms.push({ kind: "server", id: "server", x0: srX, y0: sy0, w: srW, h: srH, label: "SERVER ROOM", doors: [] });
    block(srX, sy0, srX + srW - 1, sy0 + srH - 1);
    envs.forEach((env, i) => {
      const c = i % RACKS_PER_ROW;
      const r = Math.floor(i / RACKS_PER_ROW);
      racks.push({ name: env.name, agentId: env.agentId, x: px(srX + 2) + c * 32, y: py(sy0 + 1) + 8 + r * 112, w: 32, h: 92 });
    });
    beltX1 = px(srX + 1) + 8;
    beltTop = py(sy0) + 112 * rackRows + 2;
  } else {
    const mx = review ? reviewX + REVIEW_W : srX;
    beltX1 = px(mx) - 4;
    mailbox = { x: px(mx) - 6, y: py(Y(BELT_ROW)) - 14, w: 22, h: 30 };
    block(mx, Y(BELT_ROW), mx, Y(BELT_ROW));
  }
  block(1, Y(BELT_ROW), Math.floor((beltX1 - ox) / TS), Y(BELT_ROW)); // the belt itself
  for (const [x, y] of crossings) open(x, y, x, y);

  // ---------------------------------------------------------- cables (desk → own rack, under the belt)
  const cables: OfficeLayout["cables"] = [];
  desks.forEach((d, i) => {
    const rack = racks.find((r) => r.agentId === d.agentId);
    if (!rack) return;
    const sx = px(d.x0 + 3) + 4 + (i % 3) * 3;
    const laneY = beltY - 6 + (i % 4) * 3;
    const rx = rack.x + 10 + (i % 3) * 4;
    cables.push({ agentId: d.agentId, pts: [[sx, py(d.y0 + 2) + 12], [sx, laneY], [rx, laneY], [rx, rack.y + rack.h]] });
  });

  // ---------------------------------------------------------- hits
  const hits: Hit[] = [];
  const planBoard = { x: px(2) + 3, y: py(Q(0)) + 19, w: 140, h: 40 };
  const leadRect = { x: px(12), y: py(Q(4)), w: 6 * TS, h: 3 * TS };
  hits.push({ kind: "plan", id: "plan", rect: { x: planBoard.x - 3, y: planBoard.y - 8, w: planBoard.w + 6, h: planBoard.h + 14 } });
  if (lead) hits.push({ kind: "agent", id: lead.id, rect: leadRect });
  for (const d of desks) hits.push({ kind: "agent", id: d.agentId, rect: d.rect });
  if (gate) hits.push({ kind: "gate", id: "gate", rect: { x: gate.x, y: gate.y - 16, w: gate.w, h: gate.h + 16 } });
  if (prBoard) hits.push({ kind: "prs", id: "prs", rect: { x: prBoard.x, y: prBoard.y, w: prBoard.w, h: prBoard.h + 26 } });
  for (const r of racks) hits.push({ kind: "env", id: r.name, rect: r });

  const wander: Tile[] = [
    ...(["cafe", "gym", "game"] as const).flatMap((k) => AMENITY_SPOTS[k].map(([x, y]): Tile => [amenityX[k] + x, Y(y)])),
    [4, Q(9)], [7, Q(9)], [6, Q(11)], // stand-up corner
    ...benches.map(([x, y]): Tile => [x, y + 1]),
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
    building: { x0: 0, y0: Q(0), w: LEAD_MIN, h: HQ_H },
    rooms,
    lead: { agentId: lead?.id ?? null, seat: [15, Q(7)], rect: leadRect },
    plan: { board: planBoard, spot: [6, Q(5)] },
    lounge: { coffee: [C0(1, 5), C0(2, 5), C0(3, 5)] },
    desks,
    belt: { y: beltY, x0: px(2), x1: beltX1, topY: beltTop },
    gate,
    prBoard,
    racks,
    mailbox,
    cables,
    crossings,
    benches,
    door: [0, Y(WALK_ROW)],
    wander: wander.filter(([x, y]) => grid.ok(x, y)),
    hits,
  };
}

/** Wander tiles inside an amenity building (cafe, gym or game room), in site tiles. */
export function amenitySpots(l: OfficeLayout, kind: RoomKind): Tile[] {
  if (kind !== "cafe" && kind !== "gym" && kind !== "game") return [];
  const r = roomOf(l, kind);
  if (!r) return [];
  return AMENITY_SPOTS[kind].map(([x, y]): Tile => [r.x0 + x, r.y0 + y]);
}

/** The first room of a kind. The lead office, corridor and café always exist. */
export function roomOf(l: OfficeLayout, kind: RoomKind): Room | undefined {
  return l.rooms.find((r) => r.kind === kind);
}

/** Tile centre in world px. */
export function tileCentre(l: OfficeLayout, t: Tile): { x: number; y: number } {
  return { x: l.ox + t[0] * TS + 8, y: l.oy + t[1] * TS + 8 };
}
