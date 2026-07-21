import type { Graphics } from "pixi.js";
import { parseCellKey, sectorForPoint } from "../../../game/math";
import { CORE_X, CORE_Y, type EngineState, type RoundPhase } from "../../../game/types";
import { strokePoly, strokeSegment } from "../draw";
import type { ArenaLayout } from "../layout";
import { pxX, pxY } from "../layout";
import { PALETTE } from "../palette";

function highestPressureSector(state: EngineState): number {
  const counts = new Array<number>(8).fill(0);
  for (const key of state.corruption) {
    const point = parseCellKey(key);
    counts[sectorForPoint(point)] += 1;
  }
  let best = 0;
  for (let index = 1; index < counts.length; index += 1) {
    if (counts[index]! > counts[best]!) best = index;
  }
  return best;
}

function sectorAngle(sector: number): number {
  return (sector / 8) * Math.PI * 2 - Math.PI / 2;
}

export function drawCore(
  graphics: Graphics,
  layout: ArenaLayout,
  state: EngineState,
  phase: RoundPhase,
  frozen: boolean,
): void {
  const health = state.health;
  const tension = 1 - health / 100;
  const phaseTension = phase === "collapse" ? 0.22 : phase === "surge" ? 0.1 : 0;
  const motionRate = frozen ? 0 : phase === "surge" ? 0.2 : phase === "collapse" ? 0.26 : 0.14;
  const pulse = frozen ? 1 : 1 + Math.sin(state.tick * motionRate) * (0.06 - tension * 0.03 + phaseTension * 0.04);
  const sector = highestPressureSector(state);
  const lean = sectorAngle(sector);
  const leanAmt = (phase === "collapse" ? 0.22 : 0.12) * layout.cell * tension;
  const x = pxX(layout, CORE_X) + Math.cos(lean) * leanAmt;
  const y = pxY(layout, CORE_Y) + Math.sin(lean) * leanAmt;
  const glow = layout.cell * (2.85 - tension * 0.95 - phaseTension * 0.4) * pulse;
  const mark = layout.cell * (0.5 - tension * 0.08) * pulse;
  const coreTint = tension > 0.55 || phase === "collapse" ? PALETTE.danger : tension > 0.3 ? PALETTE.rescue : PALETTE.core;
  const signalTint = tension > 0.55 || phase === "collapse" ? PALETTE.dangerSoft : PALETTE.signal;

  // Influence field — core must win the hierarchy fight vs the grid.
  graphics.beginPath();
  graphics.circle(x, y, glow * 1.65).fill({ color: signalTint, alpha: 0.11 + health / 3200 });
  graphics.beginPath();
  graphics.circle(x, y, glow * 1.2).fill({ color: coreTint, alpha: 0.1 + tension * 0.07 + phaseTension * 0.05 });
  graphics.beginPath();
  graphics.circle(x, y, glow * 0.62).fill({ color: signalTint, alpha: 0.18 + tension * 0.06 });

  // Layered diamond body
  const outer = [
    x, y - mark * 1.7,
    x + mark * 1.7, y,
    x, y + mark * 1.7,
    x - mark * 1.7, y,
  ];
  const mid = [
    x, y - mark * 1.08,
    x + mark * 1.08, y,
    x, y + mark * 1.08,
    x - mark * 1.08, y,
  ];
  const inner = [
    x, y - mark * 0.48,
    x + mark * 0.48, y,
    x, y + mark * 0.48,
    x - mark * 0.48, y,
  ];
  strokePoly(graphics, outer, true, { color: signalTint, width: 1.85, alpha: 0.7 + phaseTension });
  strokePoly(graphics, mid, true, {
    color: PALETTE.core,
    width: 2.1,
    alpha: 0.95,
  }, { color: coreTint, alpha: 0.18 });
  graphics.beginPath();
  graphics.poly(inner).fill({ color: PALETTE.core, alpha: 1 });
  // Crosshair mark
  strokeSegment(graphics, x - mark * 0.28, y, x + mark * 0.28, y, {
    color: PALETTE.void,
    width: 1.2,
    alpha: 0.55,
  });
  strokeSegment(graphics, x, y - mark * 0.28, x, y + mark * 0.28, {
    color: PALETTE.void,
    width: 1.2,
    alpha: 0.55,
  });

  if (tension > 0.35 || phase === "collapse") {
    const crack = mark * (0.9 + tension);
    strokeSegment(
      graphics,
      x - crack * 0.2,
      y - crack,
      x + crack * 0.35,
      y + crack * 0.15,
      { color: PALETTE.danger, width: 1.2, alpha: 0.35 + tension * 0.4 },
    );
    strokeSegment(
      graphics,
      x + crack * 0.55,
      y - crack * 0.35,
      x - crack * 0.15,
      y + crack * 0.55,
      { color: PALETTE.danger, width: 1.2, alpha: 0.35 + tension * 0.4 },
    );
  }

  if (state.pulse.available && !state.pulse.usedAtTick) {
    graphics.beginPath();
    graphics.circle(x, y, glow * 0.72).stroke({
      color: PALETTE.signal,
      width: 1.1,
      alpha: 0.22 + (phase === "collapse" ? 0.18 : 0),
    });
  }
}
