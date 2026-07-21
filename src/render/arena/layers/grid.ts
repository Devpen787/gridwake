import type { Graphics } from "pixi.js";
import { GRID_COLUMNS, GRID_ROWS } from "../../../game/types";
import { strokeSegment } from "../draw";
import type { ArenaLayout } from "../layout";
import { PALETTE } from "../palette";

export type PulseWarp = Readonly<{ x: number; y: number; radius: number; strength: number }>;

export function displacePoint(
  x: number,
  y: number,
  warp: PulseWarp | null,
): Readonly<{ x: number; y: number }> {
  if (!warp || warp.strength <= 0) return { x, y };
  const dx = x - warp.x;
  const dy = y - warp.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1 || distance > warp.radius * 1.15) return { x, y };
  const falloff = 1 - distance / (warp.radius * 1.15);
  const push = warp.strength * falloff * falloff;
  return {
    x: x + (dx / distance) * push,
    y: y + (dy / distance) * push,
  };
}

export function drawGrid(
  graphics: Graphics,
  layout: ArenaLayout,
  warp: PulseWarp | null,
  frozen = false,
): void {
  const majorBoost = frozen ? 1.25 : 1;
  for (let x = 0; x <= GRID_COLUMNS; x += 1) {
    const a = displacePoint(layout.originX + x * layout.cell, layout.originY, warp);
    const b = displacePoint(layout.originX + x * layout.cell, layout.originY + layout.height, warp);
    strokeSegment(graphics, a.x, a.y, b.x, b.y, {
      color: x % 5 === 0 ? PALETTE.gridActive : PALETTE.gridInactive,
      width: x % 5 === 0 ? 1 : 0.55,
      alpha: (x % 5 === 0 ? 0.55 : 0.28) * majorBoost,
    });
  }
  for (let y = 0; y <= GRID_ROWS; y += 1) {
    const a = displacePoint(layout.originX, layout.originY + y * layout.cell, warp);
    const b = displacePoint(layout.originX + layout.width, layout.originY + y * layout.cell, warp);
    strokeSegment(graphics, a.x, a.y, b.x, b.y, {
      color: y % 3 === 0 ? PALETTE.gridActive : PALETTE.gridInactive,
      width: y % 3 === 0 ? 1 : 0.55,
      alpha: (y % 3 === 0 ? 0.5 : 0.26) * majorBoost,
    });
  }
}
