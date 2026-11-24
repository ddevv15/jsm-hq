// Furniture and decor drawn once into the static layer.

import { text, textW } from "../engine/font";
import { C } from "../engine/palette";
import { box, disc, ellipse, type Pen } from "../engine/pen";

export function plant(p: Pen, cx: number, baseY: number, big = true) {
  const r = big ? 7 : 5;
  p.rect(cx - 4, baseY - 7, 9, 7, C.ink);
  p.rect(cx - 3, baseY - 6, 7, 5, C.pot);
  p.rect(cx - 3, baseY - 6, 7, 1, "#d4704f");
  p.rect(cx + 2, baseY - 5, 1, 4, C.potD);
  disc(p, cx, baseY - 7 - r, r + 1, C.ink);
  disc(p, cx, baseY - 7 - r, r, C.leafD);
  disc(p, cx - 1, baseY - 8 - r, r - 2, C.leaf);
  p.rect(cx - 3, baseY - 10 - r, 2, 2, C.leafL);
  p.rect(cx + 2, baseY - 6 - r, 1, 2, C.leafL);
}

export function tree(p: Pen, x: number, y: number, r: number) {
  ellipse(p, x + 3, y + r - 1, r, 4, C.shadow, 0.25);
  p.rect(x - 2, y + r - 9, 5, 9, C.ink);
  p.rect(x - 1, y + r - 9, 3, 8, "#7a4a2a");
  disc(p, x, y, r + 1, C.ink);
  disc(p, x, y, r, C.leafD);
  disc(p, x - 2, y - 2, r - 3, C.leaf);
  disc(p, x - 5, y - 5, 3, C.leafL);
  p.rect(x + 4, y + 2, 2, 2, C.leafL);
}

export function beanbag(p: Pen, cx: number, cy: number, col: string, dark: string) {
  ellipse(p, cx + 1, cy + 5, 7, 2, C.shadow, 0.25);
  ellipse(p, cx, cy, 7, 6, C.ink);
  ellipse(p, cx, cy, 6, 5, col);
  ellipse(p, cx - 2, cy - 2, 2, 1, "#ffffff", 0.33);
  p.rect(cx - 4, cy + 2, 8, 2, dark);
}

export function monitorFrame(p: Pen, mx: number, my: number) {
  box(p, mx, my, 22, 15, C.bezel);
  p.rect(mx + 2, my + 2, 18, 11, C.screen);
  p.rect(mx + 9, my + 15, 4, 3, C.metalD);
  p.rect(mx + 6, my + 18, 10, 1, C.metalDD);
}

export function plate(p: Pen, label: string, cx: number, y: number) {
  const w = textW(label);
  box(p, Math.round(cx - w / 2) - 3, y, w + 6, 8, C.white);
  text(p, label, Math.round(cx - w / 2), y + 1, C.ink);
}

/** Desk with a monitor, keyboard and mug. `dx, dy` = top-left of the desk area. */
export function workDesk(p: Pen, dx: number, dy: number, prop: number) {
  p.rect(dx + 1, dy + 26, 46, 4, C.shadow, 0.25);
  box(p, dx, dy + 4, 48, 18, C.desk);
  p.rect(dx + 1, dy + 5, 46, 1, C.woodL);
  box(p, dx, dy + 20, 48, 7, C.deskD);
  p.rect(dx + 2, dy + 26, 3, 4, C.deskDD);
  p.rect(dx + 43, dy + 26, 3, 4, C.deskDD);
  box(p, dx + 15, dy + 14, 18, 4, C.metal);
  for (let x = dx + 17; x < dx + 31; x += 3) p.rect(x, dy + 15, 2, 1, C.metalD);
  box(p, dx + 37, dy + 9, 5, 6, C.white);
  p.rect(dx + 42, dy + 11, 1, 2, C.ink);
  if (prop % 3 === 0) {
    // rubber duck
    p.rect(dx + 5, dy + 9, 5, 4, C.yellow);
    p.rect(dx + 8, dy + 8, 3, 2, C.yellow);
    p.rect(dx + 11, dy + 9, 2, 1, C.orange);
    p.rect(dx + 9, dy + 8, 1, 1, C.ink);
  } else if (prop % 3 === 1) {
    // small plant
    box(p, dx + 4, dy + 11, 7, 5, C.pot);
    p.rect(dx + 6, dy + 5, 3, 6, C.leaf);
    p.rect(dx + 5, dy + 7, 1, 2, C.leaf);
    p.rect(dx + 9, dy + 6, 1, 2, C.leaf);
    p.rect(dx + 7, dy + 4, 1, 1, C.pink);
  } else {
    // book stack
    p.rect(dx + 4, dy + 12, 8, 2, C.red);
    p.rect(dx + 5, dy + 10, 7, 2, C.blue);
    p.rect(dx + 4, dy + 8, 7, 2, C.green);
  }
  monitorFrame(p, dx + 13, dy - 6);
}

/** Cubicle partitions: two sides and a top with a door gap at tile 1. */
export function partitions(p: Pen, X: number, Y: number, tiles: number) {
  for (const col of [0, tiles - 1]) {
    const cx = X + col * 16 + 8;
    p.rect(cx - 3, Y, 6, tiles * 16 + 4, C.ink);
    p.rect(cx - 2, Y + 1, 4, tiles * 16 - 4, C.part);
    p.rect(cx - 2, Y + 1, 2, tiles * 16 - 4, C.partCap);
    p.rect(cx - 2, Y + tiles * 16 - 3, 4, 6, C.partD);
  }
  for (let t = 0; t < tiles; t++) {
    if (t === 1) continue;
    const x = X + t * 16;
    p.rect(x, Y - 1, 16, 1, C.ink);
    p.rect(x, Y, 16, 3, C.partCap);
    p.rect(x, Y + 3, 16, 10, C.part);
    p.rect(x, Y + 13, 16, 2, C.partD);
    p.rect(x, Y + 15, 16, 1, C.ink);
    p.rect(x + 15, Y + 3, 1, 10, C.partD);
  }
  const gx = X + 16;
  p.rect(gx - 1, Y - 1, 2, 17, C.ink);
  p.rect(gx + 15, Y - 1, 2, 17, C.ink);
}

export function rackBody(p: Pen, x: number, y: number, h: number, label: string) {
  p.rect(x + 1, y + h - 1, 30, 3, "#000000", 0.3);
  box(p, x + 1, y, 30, h, "#2a2833");
  p.rect(x + 2, y + 1, 1, h - 2, "#3d3a48");
  p.rect(x + 28, y + 1, 2, h - 2, "#1f1d26");
  for (let i = 0; i < 8; i++) {
    const yy = y + 12 + i * 10;
    p.rect(x + 4, yy, 23, 8, "#36333f");
    p.rect(x + 4, yy + 8, 23, 1, "#1f1d26");
    p.rect(x + 6, yy + 3, 8, 1, "#4c4858");
  }
  const nm = label.toUpperCase().slice(0, 6);
  box(p, x + 16 - textW(nm) / 2 - 3, y + 3, textW(nm) + 6, 8, C.white);
  text(p, nm, x + 16 - textW(nm) / 2, y + 4, C.ink);
}

export function easel(p: Pen, x: number, y: number, w: number, h: number, title: string, seed: () => number) {
  p.rect(x + 4, y + h - 2, 3, 30, C.deskDD);
  p.rect(x + w - 7, y + h - 2, 3, 30, C.deskDD);
  p.rect(x + 6, y + h + 26, w - 12, 2, C.shadow, 0.25);
  box(p, x, y, w, h, C.corkD);
  p.rect(x + 2, y + 2, w - 4, h - 4, C.cork);
  for (let i = 0; i < 40; i++) p.rect(x + 3 + Math.floor(seed() * (w - 6)), y + 9 + Math.floor(seed() * (h - 12)), 1, 1, C.corkD);
  p.rect(x + 2, y + 2, w - 4, 7, C.white);
  text(p, title, x + w / 2 - textW(title) / 2, y + 3, C.ink);
}

/** Park bench, two tiles wide. `x, y` = top-left of its left tile. */
export function bench(p: Pen, x: number, y: number) {
  ellipse(p, x + 16, y + 14, 14, 2, C.shadow, 0.25);
  box(p, x + 2, y + 3, 28, 4, C.desk); // backrest
  box(p, x + 2, y + 8, 28, 4, C.desk); // seat
  p.rect(x + 3, y + 8, 26, 1, C.woodL);
  p.rect(x + 4, y + 12, 2, 3, C.ink);
  p.rect(x + 26, y + 12, 2, 3, C.ink);
}

/** Department name on a wall, white on a dark plate. `cx` = centre, `y` = top. */
export function roomSign(p: Pen, label: string, cx: number, y: number) {
  const w = textW(label);
  box(p, Math.round(cx - w / 2) - 3, y, w + 6, 9, C.ink);
  text(p, label, Math.round(cx - w / 2), y + 2, C.white);
}

/** Steel plate robots step over the belt on. `x, y` = top-left of the belt tile. */
export function crossingPlate(p: Pen, x: number, y: number) {
  box(p, x, y - 2, 16, 20, C.metal, C.metalDD);
  for (let yy = y + 2; yy < y + 16; yy += 4) p.rect(x + 3, yy, 10, 1, C.metalD);
}

/** Treadmill seen from above, 2×2 tiles. `x, y` = top-left. */
export function treadmill(p: Pen, x: number, y: number) {
  ellipse(p, x + 16, y + 30, 14, 2, C.shadow, 0.25);
  box(p, x + 3, y + 6, 26, 24, C.metalDD);
  p.rect(x + 7, y + 10, 18, 18, C.ink);
  for (let yy = y + 12; yy < y + 27; yy += 3) p.rect(x + 8, yy, 16, 1, C.metalDD);
  box(p, x + 7, y, 18, 8, C.metal); // console
  p.rect(x + 10, y + 2, 12, 3, C.screen);
}

/** Dumbbell rack, 2×3 tiles. */
export function weightRack(p: Pen, x: number, y: number) {
  box(p, x + 2, y + 2, 28, 44, C.metalD);
  for (let k = 0; k < 6; k++) {
    const cx = x + 9 + (k % 2) * 14;
    const cy = y + 10 + Math.floor(k / 2) * 13;
    p.rect(cx - 5, cy - 1, 10, 2, C.metalL);
    disc(p, cx - 5, cy, 3, C.ink);
    disc(p, cx + 5, cy, 3, C.ink);
  }
}

/** Bench press: a bench with a bar across it, 2×1 tiles. */
export function benchPress(p: Pen, x: number, y: number) {
  box(p, x + 4, y + 4, 24, 8, C.couchD);
  p.rect(x - 2, y + 1, 36, 2, C.metalDD);
  disc(p, x - 2, y + 2, 3, C.ink);
  disc(p, x + 34, y + 2, 3, C.ink);
}

/** Pool table, 4×2 tiles. */
export function poolTable(p: Pen, x: number, y: number) {
  ellipse(p, x + 32, y + 33, 30, 3, C.shadow, 0.25);
  box(p, x, y, 64, 32, C.deskD);
  p.rect(x + 4, y + 4, 56, 24, C.rugG);
  p.rect(x + 4, y + 4, 56, 1, C.rugGD);
  for (const [hx, hy] of [[5, 5], [32, 4], [59, 5], [5, 27], [32, 28], [59, 27]]) disc(p, x + hx, y + hy, 2, C.ink);
  disc(p, x + 20, y + 16, 2, C.white);
  for (const [bx, by, col] of [[40, 12, C.red], [44, 16, C.yellow], [40, 20, C.blue], [36, 16, C.ink]] as [number, number, string][]) disc(p, x + bx, y + by, 2, col);
  p.rect(x + 8, y + 22, 18, 1, C.woodL); // cue
}

/** Ping-pong table, 3×2 tiles. */
export function pingPong(p: Pen, x: number, y: number) {
  ellipse(p, x + 24, y + 30, 22, 3, C.shadow, 0.25);
  box(p, x, y + 2, 48, 26, C.navy);
  p.rect(x + 23, y + 3, 2, 24, C.white); // net
  p.rect(x + 2, y + 14, 44, 1, C.white);
  disc(p, x + 6, y + 6, 2, C.red); // paddles
  disc(p, x + 42, y + 22, 2, C.red);
}

/** Arcade cabinet, 1×1 tile, screen facing down. */
export function arcadeCabinet(p: Pen, x: number, y: number, col: string) {
  box(p, x + 1, y - 10, 14, 26, col);
  p.rect(x + 3, y - 8, 10, 4, C.yellow);
  box(p, x + 3, y - 3, 10, 8, C.ink);
  p.rect(x + 4, y - 2, 8, 6, C.screen);
  p.rect(x + 5, y + 8, 2, 2, C.red);
  p.rect(x + 9, y + 8, 2, 2, C.blue);
}
