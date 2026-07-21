import type { Graphics } from "pixi.js";
import { manhattan } from "../../../game/math";
import {
  CORE_X,
  CORE_Y,
  type EngineState,
  type LightState,
  type Point,
} from "../../../game/types";
import { arenaClipRect, clipLineSegment } from "../clipping";
import { strokePoly, strokeSegment } from "../draw";
import type { ArenaLayout } from "../layout";
import { pxX, pxY } from "../layout";
import { PALETTE, ROLE_RADIUS_FACTOR, ROLE_RADIUS_MIN } from "../palette";

const CORE_POINT: Point = { x: CORE_X, y: CORE_Y };

export function roleRadius(layout: ArenaLayout, role: LightState["role"]): number {
  const factor = role === "guardian" ? ROLE_RADIUS_FACTOR + 0.04 : ROLE_RADIUS_FACTOR;
  return Math.max(ROLE_RADIUS_MIN, layout.cell * factor);
}

export function drawRoles(
  graphics: Graphics,
  layout: ArenaLayout,
  state: EngineState,
  interpolation: number,
  claimProgress: number,
): void {
  const clip = arenaClipRect(layout.originX, layout.originY, layout.width, layout.height);
  for (const light of state.lights) {
    const eased = light.role === "guardian" ? Math.min(1, interpolation * 0.85 + 0.15) : interpolation;
    const x = light.previousX + (light.x - light.previousX) * eased;
    const y = light.previousY + (light.y - light.previousY) * eased;
    const centerX = pxX(layout, x);
    const centerY = pxY(layout, y);
    const radius = roleRadius(layout, light.role);
    const possessed = light.id === state.possessedLightId;
    const active = light.mode === "intercept" || possessed;

    graphics.beginPath();
    graphics.circle(centerX, centerY, radius * (possessed ? 3.6 : active ? 2.8 : 2.35)).fill({
      color: light.color,
      alpha: possessed ? 0.26 : active ? 0.15 : 0.1,
    });

    if (possessed) {
      const claimBoost = claimProgress > 0 ? (1 - claimProgress) * 0.55 : 0;
      graphics.beginPath();
      graphics.circle(centerX, centerY, radius * (1.9 + claimBoost * 1.3)).stroke({
        color: PALETTE.core,
        width: 1.8 + claimBoost * 2,
        alpha: 0.85 + claimBoost,
      });
    }

    if (light.role === "guardian") {
      const lattice = layout.cell * (light.mode === "formation" || manhattan(light, CORE_POINT) <= 6 ? 2.4 : 1.55);
      graphics.beginPath();
      graphics.circle(centerX, centerY, lattice).stroke({ color: PALETTE.system, width: 1.15, alpha: 0.34 });
      graphics.beginPath();
      graphics.circle(centerX, centerY, lattice * 0.72).stroke({ color: PALETTE.core, width: 0.9, alpha: 0.22 });
      // Shield arc as discrete poly — never use Graphics.arc(), which continues
      // from the previous path cursor and draws a full-screen diagonal from (0,0).
      const shieldRadius = radius * 2.15;
      const shieldStart = -1.0;
      const shieldEnd = 1.0;
      const shieldPoints: number[] = [];
      for (let step = 0; step <= 10; step += 1) {
        const angle = shieldStart + ((shieldEnd - shieldStart) * step) / 10;
        shieldPoints.push(
          centerX + Math.cos(angle) * shieldRadius,
          centerY + Math.sin(angle) * shieldRadius,
        );
      }
      strokePoly(graphics, shieldPoints, false, {
        color: PALETTE.core,
        width: 1.6,
        alpha: active ? 0.65 : 0.4,
      });
      const outer = [
        centerX, centerY - radius * 1.2,
        centerX + radius * 1.2, centerY,
        centerX, centerY + radius * 1.2,
        centerX - radius * 1.2, centerY,
      ];
      const inner = [
        centerX, centerY - radius * 0.55,
        centerX + radius * 0.55, centerY,
        centerX, centerY + radius * 0.55,
        centerX - radius * 0.55, centerY,
      ];
      strokePoly(graphics, outer, true, {
        color: light.color,
        width: 2.4,
        alpha: 1,
      }, { color: PALETTE.system, alpha: 0.12 });
      strokePoly(graphics, inner, true, {
        color: PALETTE.core,
        width: 1.35,
        alpha: 0.82,
      });
      continue;
    }

    if (light.role === "scout") {
      const dx = light.target.x - light.x;
      const dy = light.target.y - light.y;
      const angle = Math.atan2(dy, dx || 0.001);
      const tipX = centerX + Math.cos(angle) * radius * 1.15;
      const tipY = centerY + Math.sin(angle) * radius * 1.15;
      const leftX = centerX + Math.cos(angle + 2.35) * radius;
      const leftY = centerY + Math.sin(angle + 2.35) * radius;
      const rightX = centerX + Math.cos(angle - 2.35) * radius;
      const rightY = centerY + Math.sin(angle - 2.35) * radius;
      if (light.mode === "intercept") {
        const clipped = clipLineSegment({
          x1: centerX,
          y1: centerY,
          x2: pxX(layout, light.target.x),
          y2: pxY(layout, light.target.y),
        }, clip);
        if (clipped) {
          strokeSegment(graphics, clipped.x1, clipped.y1, clipped.x2, clipped.y2, {
            color: PALETTE.signal,
            width: 1.25,
            alpha: 0.58,
          });
        }
        graphics.beginPath();
        graphics.circle(pxX(layout, light.target.x), pxY(layout, light.target.y), layout.cell * 0.35).stroke({
          color: PALETTE.signal,
          width: 1.1,
          alpha: 0.55,
        });
      }
      strokePoly(graphics, [tipX, tipY, leftX, leftY, rightX, rightY], true, {
        color: light.color,
        width: 2.4,
        alpha: 1,
      }, { color: light.color, alpha: 0.18 });
      continue;
    }

    // Mender
    graphics.beginPath();
    graphics.circle(centerX, centerY, radius).stroke({ color: light.color, width: 2.4, alpha: 1 });
    graphics.beginPath();
    graphics.circle(centerX, centerY, radius * 0.58).stroke({ color: PALETTE.rescue, width: 1.35, alpha: 0.78 });
    graphics.beginPath();
    graphics.circle(centerX, centerY, radius * 0.28).fill({ color: light.color, alpha: 0.95 });
    for (const other of state.lights) {
      if (other.id === light.id) continue;
      if (manhattan(light, other) > 5) continue;
      const clipped = clipLineSegment({
        x1: centerX,
        y1: centerY,
        x2: pxX(layout, other.x),
        y2: pxY(layout, other.y),
      }, clip);
      if (!clipped) continue;
      strokeSegment(graphics, clipped.x1, clipped.y1, clipped.x2, clipped.y2, {
        color: PALETTE.rescue,
        width: 1.05,
        alpha: 0.32,
      });
    }
  }
}
