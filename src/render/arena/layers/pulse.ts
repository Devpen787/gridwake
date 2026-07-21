import type { Graphics } from "pixi.js";
import { manhattan, parseCellKey, sectorCenter } from "../../../game/math";
import { worstSector } from "../../../game/engine";
import { CORE_X, CORE_Y, type EngineState } from "../../../game/types";
import type { ArenaLayout } from "../layout";
import { pxX, pxY } from "../layout";
import { PALETTE } from "../palette";

/**
 * Live aim indicator: where the Pulse will strike if fired right now.
 * Mirrors activatePulse's targeting (plan pulseGuidance target) read-only.
 */
export function drawPulseTarget(
  graphics: Graphics,
  layout: ArenaLayout,
  state: EngineState,
  animMs: number,
): void {
  if (!state.pulse.available || state.corruption.size === 0) return;
  const preference = state.plan?.pulseGuidance.target ?? "highest-pressure-sector";
  let target: { x: number; y: number };
  if (preference === "nearest-core-breach") {
    const core = { x: CORE_X, y: CORE_Y };
    let best: { x: number; y: number } | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const key of state.corruption) {
      const point = parseCellKey(key);
      const distance = manhattan(point, core);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = point;
      }
    }
    if (!best) return;
    target = best;
  } else {
    target = sectorCenter(worstSector(state.corruption));
  }

  const x = pxX(layout, target.x);
  const y = pxY(layout, target.y);
  const spin = animMs === 0 ? 0 : (animMs * 0.0011) % (Math.PI * 2);
  const throb = animMs === 0 ? 1 : 0.75 + 0.25 * Math.sin(animMs * 0.004);
  const radius = layout.cell * 1.35 * throb;
  const sw = layout.stroke;

  graphics.beginPath();
  graphics.circle(x, y, radius).stroke({ color: PALETTE.signal, width: 1.2 * sw, alpha: 0.4 * throb });
  graphics.beginPath();
  graphics.circle(x, y, layout.cell * 0.22).fill({ color: PALETTE.signal, alpha: 0.3 * throb });
  // Four rotating reticle ticks.
  for (let tick = 0; tick < 4; tick += 1) {
    const angle = spin + (tick * Math.PI) / 2;
    const inner = radius * 0.75;
    const outer = radius * 1.2;
    graphics.beginPath();
    graphics
      .moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
      .lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer)
      .stroke({ color: PALETTE.signal, width: 1.6 * sw, alpha: 0.7 * throb });
  }
}

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
