import type { Graphics } from "pixi.js";
import { parseCellKey, sectorCenter, sectorForPoint } from "../../../game/math";
import type { EngineState } from "../../../game/types";
import { CORE_X, CORE_Y } from "../../../game/types";
import { arenaClipRect, clipLineSegment } from "../clipping";
import { strokeSegment } from "../draw";
import type { ArenaLayout } from "../layout";
import { pxX, pxY } from "../layout";
import { PALETTE } from "../palette";

function pressureBySector(corruption: ReadonlySet<string>): number[] {
  const counts = new Array<number>(8).fill(0);
  for (const key of corruption) {
    counts[sectorForPoint(parseCellKey(key))] += 1;
  }
  return counts;
}

export function drawTactics(
  graphics: Graphics,
  layout: ArenaLayout,
  state: EngineState,
): void {
  const clip = arenaClipRect(layout.originX, layout.originY, layout.width, layout.height);
  const pressures = pressureBySector(state.corruption);
  let dominant = 0;
  for (let index = 1; index < pressures.length; index += 1) {
    if (pressures[index]! > pressures[dominant]!) dominant = index;
  }

  // Sector influence lane toward core from highest-pressure sector.
  if (pressures[dominant]! > 0) {
    const center = sectorCenter(dominant);
    const clipped = clipLineSegment({
      x1: pxX(layout, center.x),
      y1: pxY(layout, center.y),
      x2: pxX(layout, CORE_X),
      y2: pxY(layout, CORE_Y),
    }, clip);
    if (clipped) {
      strokeSegment(graphics, clipped.x1, clipped.y1, clipped.x2, clipped.y2, {
        color: PALETTE.dangerSoft,
        width: 1.45 * layout.stroke,
        alpha: 0.3,
      });
    }
  }

  // Guardian defended region from engagement radius — soft band, not a wire.
  const radius = Math.max(2, state.policy.engagementRadius);
  graphics.beginPath();
  graphics.circle(pxX(layout, CORE_X), pxY(layout, CORE_Y), radius * layout.cell).stroke({
    color: PALETTE.system,
    width: 3.2 * layout.stroke,
    alpha: state.policy.formation === "ring" ? 0.14 : 0.09,
  });

  // Manual possession field only — intercept rings stack noise on the halos.
  for (const light of state.lights) {
    if (light.mode !== "manual") continue;
    const x = pxX(layout, light.x);
    const y = pxY(layout, light.y);
    graphics.beginPath();
    graphics.circle(x, y, layout.cell * 2.3).stroke({
      color: light.color,
      width: 1.05 * layout.stroke,
      alpha: 0.55,
    });
  }

  // Plan-aware: Scout highest-pressure emphasis reticle on dominant sector.
  const scoutDirective = state.plan?.directives.find((directive) => (
    (directive.actor === "scout" || directive.actor === "squad")
    && directive.action === "intercept"
    && directive.target === "highest-pressure-sector"
  ));
  if (scoutDirective && pressures[dominant]! > 0) {
    const center = sectorCenter(dominant);
    graphics.beginPath();
    graphics.circle(pxX(layout, center.x), pxY(layout, center.y), layout.cell * 1.1).stroke({
      color: PALETTE.signal,
      width: 1.3 * layout.stroke,
      alpha: 0.4,
    });
  }
}
