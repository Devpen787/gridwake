import type { Graphics } from "pixi.js";
import { CORE_X, CORE_Y, GRID_COLUMNS, GRID_ROWS } from "../../../game/types";
import { strokeSegment } from "../draw";
import type { ArenaLayout } from "../layout";
import { pxX, pxY } from "../layout";
import { PALETTE } from "../palette";

export type PulseWarp = Readonly<{ x: number; y: number; radius: number; strength: number }>;

export type GridField = Readonly<{
  pulse: PulseWarp | null;
  /** Soft radial pull toward the core (px). Keeps orthographic readability. */
  bowlAmp: number;
  coreX: number;
  coreY: number;
  bowlRadius: number;
}>;

export function displacePoint(
  x: number,
  y: number,
  field: GridField | null,
): Readonly<{ x: number; y: number }> {
  if (!field) return { x, y };
  let px = x;
  let py = y;

  // Soft core bowl — gentle funnel, not a death-pinch.
  if (field.bowlAmp > 0 && field.bowlRadius > 1) {
    const dx = x - field.coreX;
    const dy = y - field.coreY;
    const distance = Math.hypot(dx, dy);
    if (distance > 0.5 && distance < field.bowlRadius) {
      const t = 1 - distance / field.bowlRadius;
      const pull = field.bowlAmp * t * t;
      px -= (dx / distance) * pull;
      py -= (dy / distance) * pull;
    }
  }

  const warp = field.pulse;
  if (!warp || warp.strength <= 0) return { x: px, y: py };
  const dx = px - warp.x;
  const dy = py - warp.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1 || distance > warp.radius * 1.15) return { x: px, y: py };
  const falloff = 1 - distance / (warp.radius * 1.15);
  const push = warp.strength * falloff * falloff;
  return {
    x: px + (dx / distance) * push,
    y: py + (dy / distance) * push,
  };
}

/** Build the shared field used by grid (and optionally trails). */
export function gridFieldFor(
  layout: ArenaLayout,
  pulse: PulseWarp | null,
  reducedMotion: boolean,
): GridField | null {
  if (reducedMotion) {
    return pulse
      ? {
          pulse,
          bowlAmp: 0,
          coreX: pxX(layout, CORE_X),
          coreY: pxY(layout, CORE_Y),
          bowlRadius: 1,
        }
      : null;
  }
  return {
    pulse,
    bowlAmp: layout.cell * 0.55,
    coreX: pxX(layout, CORE_X),
    coreY: pxY(layout, CORE_Y),
    bowlRadius: layout.cell * 10.5,
  };
}

export function drawGrid(
  graphics: Graphics,
  layout: ArenaLayout,
  field: GridField | null,
  frozen = false,
): void {
  const majorBoost = frozen ? 1.25 : 1;
  // Subdivide per cell so bowl/pulse can curve the lattice (north-star warp).
  for (let x = 0; x <= GRID_COLUMNS; x += 1) {
    const major = x % 5 === 0;
    for (let y = 0; y < GRID_ROWS; y += 1) {
      const a = displacePoint(
        layout.originX + x * layout.cell,
        layout.originY + y * layout.cell,
        field,
      );
      const b = displacePoint(
        layout.originX + x * layout.cell,
        layout.originY + (y + 1) * layout.cell,
        field,
      );
      strokeSegment(graphics, a.x, a.y, b.x, b.y, {
        color: major ? PALETTE.gridActive : PALETTE.gridInactive,
        width: (major ? 1.05 : 0.6) * layout.stroke,
        alpha: (major ? 0.58 : 0.3) * majorBoost,
      });
    }
  }
  for (let y = 0; y <= GRID_ROWS; y += 1) {
    const major = y % 3 === 0;
    for (let x = 0; x < GRID_COLUMNS; x += 1) {
      const a = displacePoint(
        layout.originX + x * layout.cell,
        layout.originY + y * layout.cell,
        field,
      );
      const b = displacePoint(
        layout.originX + (x + 1) * layout.cell,
        layout.originY + y * layout.cell,
        field,
      );
      strokeSegment(graphics, a.x, a.y, b.x, b.y, {
        color: major ? PALETTE.gridActive : PALETTE.gridInactive,
        width: (major ? 1.05 : 0.6) * layout.stroke,
        alpha: (major ? 0.52 : 0.28) * majorBoost,
      });
    }
  }
}
