import type { Graphics } from "pixi.js";
import { manhattan } from "../../../game/math";
import type { EngineState, LightState } from "../../../game/types";
import { arenaClipRect, clipLineSegment } from "../clipping";
import { strokeSegment } from "../draw";
import type { ArenaLayout } from "../layout";
import { pxX, pxY } from "../layout";
import { PALETTE, TRAIL_RENDER_CAP } from "../palette";

function trailAlpha(role: LightState["role"], t: number): number {
  // Newest 15–25% brightest; oldest faint.
  const brightZone = role === "scout" ? 0.22 : role === "mender" ? 0.2 : 0.18;
  if (t >= 1 - brightZone) return role === "scout" ? 0.72 : role === "guardian" ? 0.7 : 0.58;
  if (t >= 0.45) return role === "scout" ? 0.18 + (t - 0.45) * 0.35 : 0.22 + (t - 0.45) * 0.4;
  return role === "scout" ? 0.04 + t * 0.12 : role === "mender" ? 0.05 + t * 0.16 : 0.08 + t * 0.2;
}

export function drawTrails(
  graphics: Graphics,
  layout: ArenaLayout,
  state: EngineState,
): void {
  const clip = arenaClipRect(layout.originX, layout.originY, layout.width, layout.height);
  for (const light of state.lights) {
    if (light.trail.length < 2) continue;
    const trail = light.trail.length > TRAIL_RENDER_CAP
      ? light.trail.slice(-TRAIL_RENDER_CAP)
      : light.trail;
    const width = Math.max(
      1.6,
      layout.cell * (light.role === "scout" ? 0.08 : light.role === "guardian" ? 0.13 : 0.1),
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
      // Mender: brighten when near another light trail (shared network).
      let boost = 1;
      if (light.role === "mender") {
        const nearAlly = state.lights.some((other) => (
          other.id !== light.id && manhattan(to, other) <= 2
        ));
        const nearRepair = state.repairs.some((repair) => manhattan(to, repair) <= 1);
        if (nearAlly || nearRepair) boost = 1.35;
        else if (t < 0.55) boost = 0.55;
      }
      strokeSegment(graphics, clipped.x1, clipped.y1, clipped.x2, clipped.y2, {
        color,
        width: width * (0.5 + t * 0.55),
        alpha: Math.min(0.78, alpha * boost),
      });
    }

    // Short directional energy on the newest segment only (clipped).
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
          width: width * 1.15,
          alpha: light.role === "scout" ? 0.55 : 0.42,
        });
      }
    }
  }
}
