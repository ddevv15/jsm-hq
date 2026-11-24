// How far the camera zooms to show the whole office. Pure, so headless tests can import it.

export const MAX_ZOOM = 6;

/** Smallest zoom: one device pixel per art pixel (0.5x on Retina, 1x otherwise). */
export function minZoom(dpr: number): number {
  return 1 / Math.max(1, Math.round(dpr));
}

/**
 * Largest zoom, in steps of 1/dpr, at which the world minus its lawn margin fits the free area.
 * Only the lawn margin may be cropped, never a building.
 */
export function fitZoom(free: { w: number; h: number }, world: { w: number; h: number }, margin: number, dpr: number): number {
  const step = minZoom(dpr);
  const raw = Math.min(free.w / Math.max(1, world.w - 2 * margin), free.h / Math.max(1, world.h - 2 * margin));
  const z = Math.floor(raw / step + 1e-9) * step;
  return Math.max(step, Math.min(MAX_ZOOM, z));
}
