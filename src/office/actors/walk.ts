// How fast robots walk, and how long a PR drop may take before the parcel goes on the belt anyway.
// Kept free of PixiJS so headless tests can import it.

export const WALK_SPEED = 52; // px per second

const MIN_DROP = 8; // seconds: what every drop had before the office got rooms
const DROP_SLACK = 2;

export function walkSeconds(tiles: number): number {
  return (tiles * 16) / WALK_SPEED;
}

/** When a robot carrying a PR gives up and the parcel jumps onto the belt: at least 8 s, more for long walks. */
export function dropDeadline(start: number, tiles: number): number {
  return start + Math.max(MIN_DROP, walkSeconds(tiles) + DROP_SLACK);
}
