import type { Graphics } from "pixi.js";
import type { EngineState } from "../../../game/types";
import type { ArenaLayout } from "../layout";
import { pxX, pxY } from "../layout";
import { PALETTE } from "../palette";

export function drawPulse(
  graphics: Graphics,
  layout: ArenaLayout,
  state: EngineState,
): void {
  if (state.pulse.usedAtTick === null) return;
  const age = state.tick - state.pulse.usedAtTick;
  if (age < 0 || age > 12) return;
  const progress = age / 12;
  const earlyBoost = age <= 2 ? 1.18 : 1;
  const radius = layout.cell * (0.8 + progress * 8.2) * earlyBoost;
  const alpha = (1 - progress) * earlyBoost;
  const x = pxX(layout, state.pulse.x);
  const y = pxY(layout, state.pulse.y);
  graphics.beginPath();
  graphics.circle(x, y, radius).fill({ color: PALETTE.signal, alpha: alpha * 0.06 });
  graphics.beginPath();
  graphics.circle(x, y, radius).stroke({ color: PALETTE.signal, width: 2.6, alpha: Math.min(1, alpha) });
  graphics.beginPath();
  graphics.circle(x, y, radius * 0.82).stroke({ color: PALETTE.core, width: 1.1, alpha: alpha * 0.55 });
  graphics.beginPath();
  graphics.circle(x, y, radius * 0.35).fill({ color: PALETTE.core, alpha: alpha * 0.08 });
}

export function drawWarningShimmer(
  graphics: Graphics,
  layout: ArenaLayout,
  state: EngineState,
): void {
  if (state.lastEvent?.kind !== "warning") return;
  const age = state.tick - state.lastEvent.tick;
  if (age < 0 || age > 8) return;
  const alpha = Math.max(0, 1 - age / 8) * 0.35;
  graphics.beginPath();
  graphics.rect(layout.originX, layout.originY, layout.width, layout.height).stroke({
    color: PALETTE.danger,
    width: 1.4,
    alpha,
  });
}
