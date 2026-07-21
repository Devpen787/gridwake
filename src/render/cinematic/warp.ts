import { CORE_X, CORE_Y } from "../../game/types";

/** Shared spacetime warp used by the cinematic grid and entity sampling. */

export type WarpSample = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type WarpParams = Readonly<{
  bowlAmp: number;
  bowlPull: number;
  pulseAmp: number;
  pulsePull: number;
  rimAmp: number;
  pulseX: number;
  pulseY: number;
  pulseRadius: number;
  pulseStrength: number;
  reducedMotion: boolean;
}>;

const CORE = { x: CORE_X, y: CORE_Y };

function falloff(distance: number, radius: number): number {
  if (radius <= 0.001 || distance >= radius) return 0;
  const t = 1 - distance / radius;
  return t * t;
}

/** Soft spherical bowl around the core — depth without breaking readability. */
export function coreBowlZ(cellX: number, cellY: number, amp: number): number {
  const dx = cellX - CORE.x;
  const dy = cellY - CORE.y;
  const dist = Math.hypot(dx, dy);
  return -amp * falloff(dist, 12) * (0.55 + 0.45 * Math.cos((dist / 12) * Math.PI));
}

/** Inward radial pull so the bowl reads as a funnel even in flat projections. */
export function coreBowlPull(
  cellX: number,
  cellY: number,
  pull: number,
): { x: number; y: number } {
  const dx = cellX - CORE.x;
  const dy = cellY - CORE.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-4) return { x: 0, y: 0 };
  const t = falloff(dist, 11) * pull;
  // Gentle radial cue — enough to read a bowl, not enough to collapse the board.
  return { x: -dx * t * 0.16, y: -dy * t * 0.16 };
}

/** Travelling Pulse well — “light through spacetime” kick. */
export function pulseWellZ(
  cellX: number,
  cellY: number,
  pulseX: number,
  pulseY: number,
  radius: number,
  strength: number,
  amp: number,
): number {
  const dist = Math.hypot(cellX - pulseX, cellY - pulseY);
  const ring = Math.abs(dist - radius * 0.55);
  return -amp * strength * falloff(ring, Math.max(1.2, radius * 0.35));
}

export function pulseWellPull(
  cellX: number,
  cellY: number,
  pulseX: number,
  pulseY: number,
  radius: number,
  strength: number,
  pull: number,
): { x: number; y: number } {
  const dx = cellX - pulseX;
  const dy = cellY - pulseY;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-4) return { x: 0, y: 0 };
  const ring = Math.abs(dist - radius * 0.55);
  const t = falloff(ring, Math.max(1.2, radius * 0.4)) * strength * pull;
  return { x: -dx * t * 0.28, y: -dy * t * 0.28 };
}

/** Subtle rim lift so the boundary crust reads as a raised membrane. */
export function rimLiftZ(cellX: number, cellY: number, cols: number, rows: number, amp: number): number {
  const edge = Math.min(cellX, cols - 1 - cellX, cellY, rows - 1 - cellY);
  if (edge > 3.5) return 0;
  return amp * (1 - edge / 3.5) * (1 - edge / 3.5);
}

export function sampleWarp(
  cellX: number,
  cellY: number,
  cols: number,
  rows: number,
  params: WarpParams,
): WarpSample {
  if (params.reducedMotion) {
    return { x: cellX, y: cellY, z: 0 };
  }
  const bowl = coreBowlPull(cellX, cellY, params.bowlPull);
  const well = pulseWellPull(
    cellX,
    cellY,
    params.pulseX,
    params.pulseY,
    params.pulseRadius,
    params.pulseStrength,
    params.pulsePull,
  );
  const z =
    coreBowlZ(cellX, cellY, params.bowlAmp)
    + pulseWellZ(
      cellX,
      cellY,
      params.pulseX,
      params.pulseY,
      params.pulseRadius,
      params.pulseStrength,
      params.pulseAmp,
    )
    + rimLiftZ(cellX, cellY, cols, rows, params.rimAmp);
  return {
    x: cellX + bowl.x + well.x,
    y: cellY + bowl.y + well.y,
    z,
  };
}

export function defaultWarpParams(reducedMotion: boolean): WarpParams {
  return {
    bowlAmp: reducedMotion ? 0 : 2.35,
    bowlPull: reducedMotion ? 0 : 0.95,
    pulseAmp: reducedMotion ? 0 : 3.8,
    pulsePull: reducedMotion ? 0 : 1.35,
    rimAmp: reducedMotion ? 0 : 0.75,
    pulseX: CORE.x,
    pulseY: CORE.y,
    pulseRadius: 0,
    pulseStrength: 0,
    reducedMotion,
  };
}
