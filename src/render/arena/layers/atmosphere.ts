import type { Graphics } from "pixi.js";
import { CORE_X, CORE_Y, type RoundPhase } from "../../../game/types";
import type { ArenaLayout } from "../layout";
import { pxX, pxY } from "../layout";
import { PALETTE } from "../palette";

export function drawAtmosphere(
  graphics: Graphics,
  layout: ArenaLayout,
  phase: RoundPhase,
  frozen: boolean,
): void {
  const cx = pxX(layout, CORE_X);
  const cy = pxY(layout, CORE_Y);
  const vignetteBoost = phase === "collapse" ? 1.12 : phase === "surge" ? 1.04 : 1;
  // Keep vignette inside ~arena extent (no huge off-grid wash).
  const maxR = Math.hypot(layout.width, layout.height) * 0.62 * vignetteBoost;
  graphics.beginPath();
  graphics.circle(cx, cy, maxR).fill({
    color: 0x07141c,
    alpha: frozen ? 0.42 : phase === "collapse" ? 0.78 : 0.64,
  });
  graphics.beginPath();
  graphics.circle(cx, cy, maxR * 0.72).fill({
    color: 0x0a1a24,
    alpha: frozen ? 0.28 : phase === "collapse" ? 0.62 : 0.48,
  });
  graphics.beginPath();
  graphics.circle(cx, cy, layout.cell * (phase === "collapse" ? 5.4 : 6.2)).fill({
    color: 0x102838,
    alpha: frozen ? 0.18 : phase === "collapse" ? 0.5 : 0.34,
  });
  if (frozen) {
    graphics.beginPath();
    graphics.rect(layout.originX, layout.originY, layout.width, layout.height).fill({
      color: PALETTE.void,
      alpha: 0.12,
    });
  }
  const borderAlpha = phase === "surge" ? 0.36 : phase === "collapse" ? 0.45 : 0.24;
  graphics.beginPath();
  graphics.rect(layout.originX, layout.originY, layout.width, layout.height).stroke({
    color: phase === "collapse" ? PALETTE.danger : PALETTE.signal,
    width: phase === "probe" ? 1.25 : 1.5,
    alpha: frozen ? borderAlpha * 0.55 : borderAlpha,
  });
}
