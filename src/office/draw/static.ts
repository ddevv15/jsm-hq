// The static layer: lawn, paths, buildings, rooms and furniture, drawn once per layout.
// The main building is drawn room by room; the café and server room are buildings on the lawn.

import { officeSign } from "../../data/names";
import type { HqConfig } from "../../data/types";
import { mulberry32 } from "../../lib/random";
import { text, textW } from "../engine/font";
import { C } from "../engine/palette";
import { box, CanvasPen, disc, ellipse, makeCanvas } from "../engine/pen";
import type { Tile } from "../engine/path";
import { roomOf, type OfficeLayout, type Room } from "../layout/layout";
import { beanbag, bench, easel, partitions, plant, plate, rackBody, roomSign, tree, workDesk } from "./furniture";

export function buildStatic(l: OfficeLayout, config: HqConfig): HTMLCanvasElement {
  const canvas = makeCanvas(l.worldW, l.worldH);
  const g = canvas.getContext("2d") as CanvasRenderingContext2D;
  const p = new CanvasPen(g);
  const R = mulberry32(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(R() * arr.length)];
  const B = l.building;
  const bx = B.x0 * 16; // building, site px
  const by = B.y0 * 16;
  const bw = B.w * 16;
  const bh = B.h * 16;
  const cafe = roomOf(l, "cafe");
  const server = roomOf(l, "server");

  /** Wooden plank floor over a rect (site px). */
  const planks = (x: number, y: number, w: number, h: number) => {
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    p.rect(x, y, w, h, C.wood);
    for (let j = 0; j * 8 < h; j++) {
      const yy = y + j * 8;
      const off = (j % 3) * 16;
      p.rect(x, yy, w, 1, C.woodD);
      for (let xx = x - off; xx < x + w; xx += 48) {
        p.rect(xx + 1, yy + 1, 47, 7, pick([C.wood, "#c4895a", "#cf9563", C.wood]));
        p.rect(xx, yy, 1, 8, C.woodLine);
        if (R() < 0.12) p.rect(xx + 10 + Math.floor(R() * 28), yy + 3, 2, 1, C.woodLine);
      }
    }
    g.restore();
  };
  /** A 16 px wall run seen from above (site px). */
  const wallRun = (x: number, y: number, w: number, h: number) => {
    p.rect(x, y, w, h, C.wallTop);
    if (w >= h) p.rect(x, y + h - 1, w, 1, C.wallTopL);
    else p.rect(x + w - 1, y, 1, h, C.wallTopL);
  };
  /** Back wall with the painted band, `w` px wide, starting at the room's top-left. */
  const backWall = (x: number, y: number, w: number, srv = false) => {
    p.rect(x, y, w, 16, C.wallTop);
    p.rect(x, y + 15, w, 1, C.wallTopL);
    if (srv) {
      p.rect(x, y + 16, w, 44, C.wallSrv);
      for (let xx = x; xx < x + w; xx += 8) p.rect(xx, y + 16, 1, 44, C.wallSrvD);
    } else {
      p.rect(x, y + 16, w, 48, C.wall);
      for (let yy = y + 18; yy < y + 44; yy += 4) for (let xx = x + (yy % 8 ? 2 : 0); xx < x + w; xx += 4) p.rect(xx, yy, 1, 1, C.wallL);
      p.rect(x, y + 44, w, 1, "#7aa597");
      p.rect(x, y + 45, w, 15, C.wallD);
      for (let xx = x + 8; xx < x + w; xx += 16) p.rect(xx, y + 47, 1, 11, "#365a50");
    }
    p.rect(x, y + 60, w, 4, C.base);
    p.rect(x, y + 60, w, 1, "#8a6450");
    p.rect(x, y + 16, w, 2, "#000000", 0.2);
  };
  /** A door gap in a wall: floor plus a frame. `vertical` = the wall runs up and down. */
  const doorGap = ([tx, ty]: Tile, vertical: boolean) => {
    const x = tx * 16;
    const y = ty * 16;
    p.rect(x, y, 16, 16, C.wood);
    if (vertical) {
      p.rect(x, y - 3, 16, 3, C.deskDD);
      p.rect(x, y + 16, 16, 3, C.deskDD);
    } else {
      p.rect(x - 3, y, 3, 16, C.deskDD);
      p.rect(x + 16, y, 3, 16, C.deskDD);
    }
  };
  /** Side and bottom walls of a room, plus the top wall unless it's on the building's back wall. */
  const roomWalls = (r: Room) => {
    const x = r.x0 * 16;
    const y = r.y0 * 16;
    const w = r.w * 16;
    const h = r.h * 16;
    const onBack = r.y0 === B.y0;
    const top = onBack ? y + 16 : y;
    if (!onBack) wallRun(x, y, w, 16);
    wallRun(x, top, 16, y + h - top);
    wallRun(x + w - 16, top, 16, y + h - top);
    wallRun(x, y + h - 16, w, 16);
  };

  // ------------------------------------------------ lawn, front path, trees
  p.rect(0, 0, l.worldW, l.worldH, C.grass);
  for (let i = 0; i < (l.worldW * l.worldH) / 260; i++) {
    const x = Math.floor(R() * l.worldW);
    const y = Math.floor(R() * l.worldH);
    const c = R() < 0.55 ? C.grassD : C.grassL;
    p.rect(x, y, 1, 2, c);
    p.rect(x + 1, y + 1, 1, 1, c);
  }
  for (let i = 0; i < 70; i++) p.rect(Math.floor(R() * l.worldW), Math.floor(R() * l.worldH), 1, 1, pick([C.pink, C.yellow, C.white]));
  const doorY = l.oy + l.door[1] * 16;
  p.rect(0, doorY, l.ox, 16, C.path);
  for (let i = 0; i < 20; i++) p.rect(Math.floor(R() * (l.ox - 2)), doorY + Math.floor(R() * 15), 2, 1, C.pathD);
  for (const r of [{ x: bx, y: by, w: bw, h: bh }, ...[cafe, server].filter((s): s is Room => !!s).map((s) => ({ x: s.x0 * 16, y: s.y0 * 16, w: s.w * 16, h: s.h * 16 }))]) {
    p.rect(l.ox + r.x + r.w, l.oy + r.y + 6, 5, r.h, C.shadow, 0.25);
    p.rect(l.ox + r.x + 6, l.oy + r.y + r.h, r.w, 4, C.shadow, 0.25);
  }
  for (let x = 20; x < l.worldW - 10; x += 70 + Math.floor(R() * 50)) {
    tree(p, x, 18 + Math.floor(R() * 6), 12 + Math.floor(R() * 3));
    tree(p, x + 20, l.worldH - 22 + Math.floor(R() * 6), 12 + Math.floor(R() * 3));
  }
  for (let y = 60; y < l.worldH - 40; y += 80 + Math.floor(R() * 40)) {
    if (Math.abs(y - doorY) > 30) tree(p, 18 + Math.floor(R() * 6), y, 13);
    tree(p, l.worldW - 22 + Math.floor(R() * 6), y + 20, 13);
  }

  g.save();
  g.translate(l.ox, l.oy);

  // ------------------------------------------------ floors
  planks(bx + 16, by + 64, bw - 32, bh - 80);
  const logo = config.project.name.toUpperCase().slice(0, 12);
  const corridor = roomOf(l, "corridor");
  if (corridor) text(p, logo, Math.round(bw / 2 - textW(logo, 2) / 2), (corridor.y0 + 3) * 16 + 3, C.woodD, 2);

  // lead carpet + stand-up rug (lead office coordinates, shifted to the building)
  g.save();
  g.translate(bx, by);
  p.rect(176, 64, 144, 96, C.carpetJ);
  p.rect(179, 67, 138, 90, C.carpetJD);
  p.rect(181, 69, 134, 86, C.carpetJ);
  for (let y = 72; y < 154; y += 6) for (let x = 184 + (y % 12 ? 3 : 0); x < 314; x += 6) p.rect(x, y, 1, 1, C.carpetJD);
  ellipse(p, 88, 150, 42, 28, C.rugGD);
  ellipse(p, 88, 150, 39, 25, C.rugG);
  ellipse(p, 88, 150, 30, 18, C.rugGD);
  ellipse(p, 88, 150, 28, 16, C.rugG);
  g.restore();

  // desk carpets
  for (const d of l.desks) {
    const x = (d.x0 + 1) * 16;
    const y = (d.y0 + 1) * 16;
    p.rect(x, y, 80, 96, d.carpet[0]);
    for (let yy = y + 2; yy < y + 94; yy += 4) for (let xx = x + (yy % 8 ? 2 : 0); xx < x + 80; xx += 4) p.rect(xx, yy, 1, 1, d.carpet[1]);
  }

  // server room floor (before the cables, which end on it)
  if (server) {
    const sx = (server.x0 + 1) * 16;
    const sy = (server.y0 + 1) * 16;
    const sw = (server.w - 2) * 16;
    const sh = (server.h - 2) * 16;
    p.rect(sx, sy, sw, sh, C.grate);
    for (let y = sy; y < sy + sh; y += 8) p.rect(sx, y, sw, 1, C.grateD);
    for (let x = sx; x < sx + sw; x += 8) p.rect(x, sy, 1, sh, C.grateD);
  }

  // cable channels: desk → corridor → under the lawn → rack
  for (const cb of l.cables) {
    const color = config.team.find((a) => a.id === cb.agentId)?.color ?? C.blue;
    for (let i = 0; i < cb.pts.length - 1; i++) {
      const [x0, y0] = cb.pts[i];
      const [x1, y1] = cb.pts[i + 1];
      const ax = Math.min(x0, x1) - l.ox;
      const ay = Math.min(y0, y1) - l.oy;
      p.rect(ax - 1, ay - 1, Math.abs(x1 - x0) + 3, Math.abs(y1 - y0) + 3, "#2a2230");
      p.rect(ax, ay, Math.abs(x1 - x0) + 1, Math.abs(y1 - y0) + 1, color, 0.55);
    }
  }

  // ------------------------------------------------ walls: building shell, then rooms
  backWall(bx, by, bw);
  wallRun(bx, by, 16, bh);
  wallRun(bx + bw - 16, by, 16, bh);
  wallRun(bx, by + bh - 16, bw, 16);
  for (const r of l.rooms) if (r.kind === "lead" || r.kind === "review" || r.kind === "department") roomWalls(r);
  for (const r of l.rooms) {
    if (r.kind === "cafe" || r.kind === "server" || (r.kind === "corridor" && r.id !== "corridor")) continue;
    for (const d of r.doors) doorGap(d, d[0] === r.x0 || d[0] === r.x0 + r.w - 1);
  }
  for (const r of l.rooms) if (r.kind === "department" && r.label) roomSign(p, r.label.toUpperCase(), (r.x0 + r.w / 2) * 16, r.y0 * 16 + 3);

  // ------------------------------------------------ server building
  if (server) {
    const x = server.x0 * 16;
    const y = server.y0 * 16;
    const w = server.w * 16;
    const h = server.h * 16;
    wallRun(x, y, w, 16);
    wallRun(x, y, 16, h);
    wallRun(x + w - 16, y, 16, h);
    wallRun(x, y + h - 16, w, 16);
    const label = server.label ?? "SERVER ROOM";
    roomSign(p, label, x + w / 2, y + 3);
  }

  // ------------------------------------------------ back-wall decor (lead office)
  const PB = { x: l.plan.board.x - l.ox, y: l.plan.board.y - l.oy, w: l.plan.board.w };
  box(p, PB.x - 3, PB.y - 2, PB.w + 6, 46, C.deskD);
  p.rect(PB.x, PB.y, PB.w, 40, "#f7f3ea");
  p.rect(PB.x, PB.y + 38, PB.w, 2, "#d8d0c0");
  p.rect(PB.x + 6, PB.y + 41, PB.w - 12, 2, C.metalD);
  p.rect(PB.x + 20, PB.y + 40, 6, 1, C.red);
  p.rect(PB.x + 28, PB.y + 40, 6, 1, C.blue);
  const heads: [string, string][] = [["TODO", C.lav], ["DOING", C.blue], ["REVIEW", C.orange], ["DONE", C.green]];
  heads.forEach(([hd, col], k) => {
    const cx = PB.x + k * 35;
    if (k) p.rect(cx, PB.y + 2, 1, 35, "#ddd5c4");
    text(p, hd, cx + (35 - textW(hd)) / 2 + 1, PB.y + 2, C.ink);
    p.rect(cx + 3, PB.y + 8, 30, 1, col);
  });

  // ------------------------------------------------ lead office (today's lead corner, at the building's origin)
  g.save();
  g.translate(bx, by);
  box(p, 208, 22, 80, 24, C.desk);
  p.rect(209, 23, 78, 1, C.woodL);
  // Office name: big letters when it fits the 80px sign, small ones when it's longer.
  const sign = officeSign(config.project.officeName);
  const ss = textW(sign, 2) <= 76 ? 2 : 1;
  text(p, sign, 249 - textW(sign, ss) / 2, ss === 2 ? 30 : 33, C.ink, ss);
  text(p, sign, 248 - textW(sign, ss) / 2, ss === 2 ? 29 : 32, C.white, ss);
  box(p, 180, 22, 22, 26, C.navy);
  p.rect(189, 27, 4, 9, C.white);
  p.rect(190, 26, 2, 1, C.red);
  p.rect(190, 37, 2, 2, C.orange);
  text(p, "SHIP", 184, 41, C.yellow);
  box(p, 288, 30, 32, 44, C.deskD);
  p.rect(290, 32, 28, 40, "#6e4630");
  for (let s = 0; s < 3; s++) {
    const sy = 34 + s * 13;
    p.rect(290, sy + 10, 28, 2, C.deskD);
    for (let x = 291; x < 316; ) {
      const w = 2 + Math.floor(R() * 3);
      const h = 7 + Math.floor(R() * 3);
      p.rect(x, sy + 10 - h, w, h, pick([C.red, C.blue, C.green, C.yellow, C.pink, C.peach, C.lav]));
      x += w + (R() < 0.2 ? 2 : 0);
    }
  }
  plant(p, 184, 78);
  if (l.lead.agentId) {
    p.rect(210, 102, 76, 3, C.shadow, 0.25);
    box(p, 208, 82, 80, 18, C.desk);
    p.rect(209, 83, 78, 1, C.woodL);
    box(p, 208, 98, 80, 7, C.deskD);
    box(p, 222, 70, 22, 15, C.bezel);
    box(p, 248, 70, 22, 15, C.bezel);
    box(p, 230, 92, 30, 4, C.metal);
    box(p, 212, 86, 6, 6, C.white);
    p.rect(213, 87, 4, 2, "#7a4a2a");
    const lead = config.team.find((a) => a.id === l.lead.agentId);
    if (lead) plate(p, lead.name.toUpperCase().slice(0, 8), 249, 99);
  }
  // stand-up corner
  plant(p, 24, 76);
  beanbag(p, 56, 136, "#e05a47", "#b8443a");
  beanbag(p, 136, 136, "#3fa7a0", "#2f817c");
  beanbag(p, 88, 168, "#f2b33d", "#c88d22");
  box(p, 18, 172, 13, 12, C.metal);
  p.rect(20, 174, 9, 2, C.ink);
  p.rect(21, 170, 7, 3, C.white);
  g.restore();

  // ------------------------------------------------ café (today's lounge, in its own building)
  if (cafe) {
    g.save();
    g.translate(cafe.x0 * 16, cafe.y0 * 16);
    const cw = cafe.w * 16;
    const ch = cafe.h * 16;
    const L = 16; // first floor column
    const right = cw - 32; // last floor column
    planks(16, 64, cw - 32, ch - 80);
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx * 8 < cw - 32; tx++) p.rect(L + tx * 8, 64 + ty * 8, 8, 8, (tx + ty) % 2 ? C.tileD : C.tileL);
    p.rect(L + 16, 112, 96, 80, C.rugPD);
    p.rect(L + 18, 114, 92, 76, C.rugP);
    for (let x = L + 20; x < L + 110; x += 4) p.rect(x, 116, 2, 72, "#836399");
    backWall(0, 0, cw);
    wallRun(0, 16, 16, ch - 16);
    wallRun(cw - 16, 16, 16, ch - 16);
    wallRun(0, ch - 16, cw, 16);
    roomSign(p, "CAFE", cw / 2, 3);
    disc(p, L - 8, 36, 8, C.ink);
    disc(p, L - 8, 36, 7, C.white);
    box(p, L + 63, 19, 66, 34, C.white);
    p.rect(L + 62, 53, 68, 3, C.deskD);
    box(p, L, 54, 48, 10, C.metal);
    box(p, L, 63, 48, 14, C.desk);
    box(p, L + 18, 36, 12, 20, "#3a3640");
    p.rect(L + 19, 37, 10, 3, C.white);
    p.rect(L + 21, 44, 6, 6, "#1f1d26");
    box(p, L + 34, 57, 12, 5, C.metalD);
    box(p, L + 49, 26, 14, 50, "#e9e9ef");
    p.rect(L + 50, 44, 12, 1, C.metalD);
    p.rect(L + 52, 52, 3, 3, C.red);
    box(p, right + 1, 48, 12, 26, C.white);
    box(p, right + 2, 36, 10, 13, "#7fd0f2");
    p.rect(L + 32, 140, 66, 3, C.shadow, 0.25);
    box(p, L + 30, 120, 68, 10, C.couchD);
    box(p, L + 32, 128, 64, 12, C.couch);
    box(p, L + 28, 122, 6, 18, C.couchD);
    box(p, L + 94, 122, 6, 18, C.couchD);
    p.rect(L + 34, 129, 60, 1, "#5aa0ae");
    box(p, L + 50, 162, 28, 9, C.desk);
    box(p, L + 57, 160, 5, 5, C.white);
    box(p, right + 1, 100, 14, 34, "#5b3a8e");
    p.rect(right + 2, 101, 12, 5, C.yellow);
    text(p, "GO", right + 4, 101, C.ink);
    box(p, right + 3, 107, 10, 9, C.ink);
    box(p, right + 2, 118, 12, 4, "#7a55b0");
    plant(p, right + 8, ch - 20, false);
    g.restore();
    for (const d of cafe.doors) doorGap(d, true);
  }
  for (const [x, y] of l.benches) bench(p, x * 16, y * 16);

  // ------------------------------------------------ desks
  for (const d of l.desks) {
    const X = d.x0 * 16;
    const Y = d.y0 * 16;
    workDesk(p, (d.x0 + 2) * 16, Y + 16, d.index);
    partitions(p, X, Y, 7);
    const name = config.team.find((a) => a.id === d.agentId)?.name.toUpperCase().slice(0, 10) ?? "";
    plate(p, name, X + 64, Y + 4);
  }

  // ------------------------------------------------ PR board, racks, mailbox
  if (l.prBoard) easel(p, l.prBoard.x - l.ox, l.prBoard.y - l.oy, l.prBoard.w, l.prBoard.h, "PULL REQS", R);
  for (const r of l.racks) rackBody(p, r.x - l.ox, r.y - l.oy, r.h, r.name);
  if (l.mailbox) {
    const m = { x: l.mailbox.x - l.ox, y: l.mailbox.y - l.oy };
    box(p, m.x, m.y, 22, 30, "#5f6b80");
    p.rect(m.x + 3, m.y + 10, 16, 6, "#1f1d26");
    text(p, "MAIN", m.x + 4, m.y + 3, C.white);
  }
  g.restore();
  return canvas;
}
