import type { Graphics } from "pixi.js";
import { manhattan } from "../../../game/math";
import type { EngineState, LightState } from "../../../game/types";
import { arenaClipRect, clipLineSegment } from "../clipping";
import { strokeSegment } from "../draw";
import type { ArenaLayout } from "../layout";
import { pxX, pxY } from "../layout";
import { PALETTE, TRAIL_RENDER_CAP } from "../palette";

function trailCap(role: LightState["role"]): number {
  // Mender history is short so amber never paints the whole board.
  if (role === "mender") return Math.min(14, TRAIL_RENDER_CAP);
  if (role === "scout") return Math.min(18, TRAIL_RENDER_CAP);
  return TRAIL_RENDER_CAP;
}

function trailAlpha(role: LightState["role"], t: number): number {
  // Newest 15–25% brightest; oldest faint.
  const brightZone = role === "scout" ? 0.28 : role === "mender" ? 0.3 : 0.2;
  if (t >= 1 - brightZone) {
    return role === "scout" ? 0.7 : role === "guardian" ? 0.68 : 0.48;
  }
  if (t >= 0.5) {
    return role === "mender"
      ? 0.08 + (t - 0.5) * 0.28
      : role === "scout"
        ? 0.12 + (t - 0.5) * 0.32
        : 0.16 + (t - 0.5) * 0.36;
  }
  return role === "mender" ? 0.02 + t * 0.08 : role === "scout" ? 0.03 + t * 0.1 : 0.06 + t * 0.14;
}

export function drawTrails(
  graphics: Graphics,
  layout: ArenaLayout,
  state: EngineState,
): void {
  const clip = arenaClipRect(layout.originX, layout.originY, layout.width, layout.height);
  for (const light of state.lights) {
    if (light.trail.length < 2) continue;
    const cap = trailCap(light.role);
    const trail = light.trail.length > cap ? light.trail.slice(-cap) : light.trail;
    const width = Math.max(
      1.5,
      layout.cell * (light.role === "scout" ? 0.07 : light.role === "guardian" ? 0.12 : 0.08),
    );
    for (let index = 1; index < trail.length; index += 1) {
      const from = trail[index - 1]!;
      const to = trail[index]!;
      const t = index / (trail.length - 1);
      if (light.role === "scout" && index % 2 === 0) continue;
      const clipped = clipLineSegment({
        x1: pxX(layout, from.x),
        y1: pxY(layout, from.y),
        x2: pxX(layout, to.x),
        y2: pxY(layout, to.y),
      }, clip);
      if (!clipped) continue;
      const color = light.role === "mender"
        ? PALETTE.rescue
        : light.role === "guardian"
          ? PALETTE.system
          : light.color;
      const alpha = trailAlpha(light.role, t);
      let boost = 1;
      if (light.role === "mender") {
        const nearAlly = state.lights.some((other) => (
          other.id !== light.id && manhattan(to, other) <= 2
        ));
        const nearRepair = state.repairs.some((repair) => manhattan(to, repair) <= 1);
        if (nearAlly || nearRepair) boost = 1.4;
        else if (t < 0.6) boost = 0.4;
      }
      strokeSegment(graphics, clipped.x1, clipped.y1, clipped.x2, clipped.y2, {
        color,
        width: width * (0.45 + t * 0.55),
        alpha: Math.min(light.role === "mender" ? 0.55 : 0.72, alpha * boost),
      });
    }

    if (trail.length >= 2) {
      const from = trail[trail.length - 2]!;
      const to = trail[trail.length - 1]!;
      const clipped = clipLineSegment({
        x1: pxX(layout, from.x),
        y1: pxY(layout, from.y),
        x2: pxX(layout, to.x),
        y2: pxY(layout, to.y),
      }, clip);
      if (clipped) {
        strokeSegment(graphics, clipped.x1, clipped.y1, clipped.x2, clipped.y2, {
          color: light.role === "mender" ? PALETTE.rescue : light.color,
          width: width * 1.2,
          alpha: light.role === "scout" ? 0.58 : light.role === "mender" ? 0.4 : 0.45,
        });
      }
    }
  }
}
