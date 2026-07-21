import type { Graphics } from "pixi.js";
import type { EngineState } from "../../../game/types";
import { arenaClipRect, clipLineSegment } from "../clipping";
import { strokePoly, strokeSegment } from "../draw";
import type { ArenaLayout } from "../layout";
import { pxX, pxY } from "../layout";
import { PALETTE } from "../palette";

export function drawImpacts(
  graphics: Graphics,
  layout: ArenaLayout,
  state: EngineState,
  reducedMotion: boolean,
): { particleCount: number } {
  const clip = arenaClipRect(layout.originX, layout.originY, layout.width, layout.height);
  let particleCount = 0;

  for (const repair of state.repairs) {
    const age = state.tick - repair.bornAtTick;
    const alpha = Math.max(0, 1 - age / 10);
    const x = layout.originX + repair.x * layout.cell;
    const y = layout.originY + repair.y * layout.cell;
    graphics.beginPath();
    graphics
      .rect(x + 2, y + 2, layout.cell - 4, layout.cell - 4)
      .stroke({ color: PALETTE.rescue, width: 2.2, alpha });
    for (let stitch = 0; stitch < 3; stitch += 1) {
      const offset = ((stitch + 1) * layout.cell) / 4;
      const clipped = clipLineSegment({
        x1: x + offset - 2,
        y1: y + 2,
        x2: x + offset + 2,
        y2: y + layout.cell - 2,
      }, clip);
      if (!clipped) continue;
      strokeSegment(graphics, clipped.x1, clipped.y1, clipped.x2, clipped.y2, {
        color: PALETTE.rescue,
        width: 1.1,
        alpha: alpha * 0.85,
      });
    }
  }

  for (const impact of state.impacts) {
    const age = state.tick - impact.bornAtTick;
    if (age < 0 || age > 10) continue;
    const progress = age / 10;
    const alpha = 1 - progress;
    const color = impact.kind === "damage"
      ? PALETTE.danger
      : impact.kind === "pulse"
        ? PALETTE.core
        : impact.kind === "manual"
          ? PALETTE.rescue
          : PALETTE.signal;
    const x = pxX(layout, impact.x);
    const y = pxY(layout, impact.y);
    const radius = layout.cell * (0.32 + progress * (impact.kind === "damage" ? 1.9 : impact.kind === "intercept" ? 1.35 : 1.7));
    const cellX = layout.originX + impact.x * layout.cell;
    const cellY = layout.originY + impact.y * layout.cell;
    if (progress < 0.45) {
      graphics.beginPath();
      graphics.rect(cellX + 1, cellY + 1, layout.cell - 2, layout.cell - 2).fill({
        color,
        alpha: alpha * (impact.kind === "damage" ? 0.22 : 0.14),
      });
    }
    if (impact.kind === "intercept") {
      strokePoly(graphics, [x, y - radius, x + radius * 0.7, y, x, y + radius, x - radius * 0.7, y], true, {
        color: PALETTE.signal,
        width: 1.6,
        alpha,
      });
    }
    if (impact.kind === "manual") {
      strokeSegment(graphics, x - radius * 0.7, y, x + radius * 0.7, y, {
        color: PALETTE.core,
        width: 1.8,
        alpha,
      });
      strokeSegment(graphics, x, y - radius * 0.7, x, y + radius * 0.7, {
        color: PALETTE.core,
        width: 1.8,
        alpha,
      });
    }
    graphics.beginPath();
    graphics.circle(x, y, radius).fill({ color, alpha: alpha * 0.12 });
    graphics.beginPath();
    graphics.circle(x, y, radius).stroke({ color, width: impact.kind === "damage" ? 2.8 : 2, alpha });

    if (reducedMotion) continue;
    const sparkCount = Math.min(impact.kind === "damage" ? 8 : 5, 8);
    for (let index = 0; index < sparkCount; index += 1) {
      const angle = (index / sparkCount) * Math.PI * 2 + progress;
      const dist = radius * (0.8 + (index % 3) * 0.15);
      const clipped = clipLineSegment({
        x1: x,
        y1: y,
        x2: x + Math.cos(angle) * dist,
        y2: y + Math.sin(angle) * dist,
      }, clip);
      if (!clipped) continue;
      particleCount += 1;
      strokeSegment(graphics, clipped.x1, clipped.y1, clipped.x2, clipped.y2, {
        color,
        width: 1.1,
        alpha: alpha * 0.7,
      });
    }
  }

  return { particleCount };
}
