import type { Graphics } from "pixi.js";
import { parseCellKey } from "../../../game/math";
import {
  GRID_COLUMNS,
  GRID_ROWS,
  type EngineState,
  type RoundPhase,
} from "../../../game/types";
import {
  type CellVisual,
  collapseProgress,
  coreDistance,
  crustProgress,
  frontierAggression,
  isRimCell,
  pressureTowardCore,
  veinHash,
} from "../../../components/arena-fx";
import { arenaClipRect, clipLineSegment } from "../clipping";
import { strokeSegment } from "../draw";
import type { ArenaLayout } from "../layout";
import { pxX, pxY } from "../layout";
import { PALETTE } from "../palette";

function cardinalNeighbors(x: number, y: number): ReadonlyArray<Readonly<{ x: number; y: number; key: string }>> {
  return [
    { x: x + 1, y, key: `${x + 1}:${y}` },
    { x: x - 1, y, key: `${x - 1}:${y}` },
    { x, y: y + 1, key: `${x}:${y + 1}` },
    { x, y: y - 1, key: `${x}:${y - 1}` },
  ];
}

function hasNeighbor(
  living: ReadonlySet<string>,
  x: number,
  y: number,
  dx: number,
  dy: number,
): boolean {
  return living.has(`${x + dx}:${y + dy}`);
}

export function drawCorruption(
  graphics: Graphics,
  layout: ArenaLayout,
  state: EngineState,
  phase: RoundPhase,
  visuals: ReadonlyMap<string, CellVisual>,
  reducedMotion: boolean,
  animMs = 0,
): void {
  const aggression = frontierAggression(phase);
  const livingKeys = [...visuals.keys()].toSorted();
  const living = new Set(
    livingKeys.filter((key) => {
      const visual = visuals.get(key);
      return visual && collapseProgress(visual, state.tick, reducedMotion) < 1;
    }),
  );
  const clip = arenaClipRect(layout.originX, layout.originY, layout.width, layout.height);

  // 1) Body — flush connected mass (no inset gaps between adjacent cells).
  for (const key of livingKeys) {
    const visual = visuals.get(key);
    if (!visual) continue;
    const die = collapseProgress(visual, state.tick, reducedMotion);
    if (die >= 1) continue;
    const grow = crustProgress(visual, state.tick, reducedMotion);
    const life = (1 - die) * (0.4 + grow * 0.6);
    const point = parseCellKey(key);
    const x = layout.originX + point.x * layout.cell;
    const y = layout.originY + point.y * layout.cell;
    const onRim = isRimCell(point, GRID_COLUMNS, GRID_ROWS);
    const nearCore = coreDistance(point) <= 5;
    const n = hasNeighbor(living, point.x, point.y, 0, -1);
    const e = hasNeighbor(living, point.x, point.y, 1, 0);
    const s = hasNeighbor(living, point.x, point.y, 0, 1);
    const w = hasNeighbor(living, point.x, point.y, -1, 0);
    const isolated = !n && !e && !s && !w;
    // Adjacent cells share edges with zero inset so the mass reads as one organism.
    const inset = isolated
      ? Math.max(1.4, layout.cell * 0.14)
      : 0;
    const left = x + (w ? 0 : inset);
    const top = y + (n ? 0 : inset);
    const right = x + layout.cell - (e ? 0 : inset);
    const bottom = y + layout.cell - (s ? 0 : inset);
    const pressure = pressureTowardCore(point);
    const shrinkX = die * pressure.x * layout.cell * 0.28;
    const shrinkY = die * pressure.y * layout.cell * 0.28;
    // Asynchronous per-cell shimmer keeps the mass alive without line noise.
    const shimmer = animMs === 0
      ? 1
      : 0.9 + 0.1 * Math.sin(animMs * 0.0016 + (veinHash(key, "breath") & 63) * 0.35);
    const bodyAlpha = Math.min(0.94, (onRim ? 0.9 : nearCore ? 0.74 : 0.8) * aggression * life * shimmer);
    graphics
      .rect(left + shrinkX, top + shrinkY, Math.max(1, right - left), Math.max(1, bottom - top))
      .fill({ color: PALETTE.corruptionBody, alpha: bodyAlpha });
    // Warm ember center so cells read as molten mass, not flat plates.
    graphics
      .rect(
        x + layout.cell * 0.22,
        y + layout.cell * 0.22,
        layout.cell * 0.56,
        layout.cell * 0.56,
      )
      .fill({ color: PALETTE.corruptionEmber, alpha: (nearCore ? 0.3 : 0.2) * life * aggression * shimmer });
    // Soft interior wash so sparse cells still feel dense.
    if (!isolated) {
      graphics
        .rect(
          x + layout.cell * 0.12,
          y + layout.cell * 0.12,
          layout.cell * 0.76,
          layout.cell * 0.76,
        )
        .fill({ color: 0x1a050a, alpha: 0.35 * life * aggression });
    }
  }

  // 2) Veins — adjacent living links (cardinal + useful diagonals).
  for (const key of livingKeys) {
    const visual = visuals.get(key);
    if (!visual || visual.dyingAtTick !== null) continue;
    if (!living.has(key)) continue;
    const a = parseCellKey(key);
    const candidates = [
      ...cardinalNeighbors(a.x, a.y),
      { x: a.x + 1, y: a.y + 1, key: `${a.x + 1}:${a.y + 1}` },
      { x: a.x - 1, y: a.y + 1, key: `${a.x - 1}:${a.y + 1}` },
    ].filter((candidate) => living.has(candidate.key) && candidate.key > key);
    for (const candidate of candidates) {
      const hash = veinHash(key, candidate.key);
      // Sparse veins: most links stay implicit so the mass reads as tissue,
      // not scratched wireframe.
      if ((hash & 7) < 5) continue;
      const ax = pxX(layout, a.x);
      const ay = pxY(layout, a.y);
      const bx = pxX(layout, candidate.x);
      const by = pxY(layout, candidate.y);
      const clipped = clipLineSegment({ x1: ax, y1: ay, x2: bx, y2: by }, clip);
      if (!clipped) continue;
      const mid = ((hash >>> 4) & 63) / 63;
      const mx = clipped.x1 + (clipped.x2 - clipped.x1) * mid;
      const my = clipped.y1 + (clipped.y2 - clipped.y1) * mid;
      const offset = ((hash >>> 10) & 5) - 2;
      strokeSegment(
        graphics,
        clipped.x1,
        clipped.y1,
        mx + offset * 0.35,
        my - offset * 0.35,
        {
          color: PALETTE.corruptionVein,
          width: phase === "collapse" ? 1.55 : 1.2,
          alpha: phase === "probe" ? 0.38 : 0.58,
        },
      );
      strokeSegment(
        graphics,
        mx + offset * 0.6,
        my + offset * 0.6,
        clipped.x2,
        clipped.y2,
        {
          color: PALETTE.corruptionVein,
          width: phase === "collapse" ? 1.55 : 1.2,
          alpha: phase === "probe" ? 0.38 : 0.58,
        },
      );
    }
  }

  // 3) Frontier — exposed edges facing the core.
  for (const key of livingKeys) {
    const visual = visuals.get(key);
    if (!visual) continue;
    const die = collapseProgress(visual, state.tick, reducedMotion);
    if (die >= 1) continue;
    const grow = crustProgress(visual, state.tick, reducedMotion);
    const life = (1 - die) * (0.45 + grow * 0.55);
    const point = parseCellKey(key);
    const x = layout.originX + point.x * layout.cell;
    const y = layout.originY + point.y * layout.cell;
    const pressure = pressureTowardCore(point);
    const edges: Array<Readonly<{ x1: number; y1: number; x2: number; y2: number; towardCore: boolean }>> = [];
    if (!hasNeighbor(living, point.x, point.y, 0, -1)) {
      edges.push({ x1: x, y1: y, x2: x + layout.cell, y2: y, towardCore: pressure.y < 0 });
    }
    if (!hasNeighbor(living, point.x, point.y, 1, 0)) {
      edges.push({
        x1: x + layout.cell, y1: y, x2: x + layout.cell, y2: y + layout.cell,
        towardCore: pressure.x > 0,
      });
    }
    if (!hasNeighbor(living, point.x, point.y, 0, 1)) {
      edges.push({
        x1: x, y1: y + layout.cell, x2: x + layout.cell, y2: y + layout.cell,
        towardCore: pressure.y > 0,
      });
    }
    if (!hasNeighbor(living, point.x, point.y, -1, 0)) {
      edges.push({ x1: x, y1: y, x2: x, y2: y + layout.cell, towardCore: pressure.x < 0 });
    }
    const frontierPulse = animMs === 0
      ? 1
      : 0.82 + 0.18 * Math.sin(animMs * 0.0028 + (veinHash(key, "edge") & 31) * 0.4);
    for (const edge of edges) {
      const clipped = clipLineSegment(edge, clip);
      if (!clipped) continue;
      const alpha = Math.min(1, (edge.towardCore ? 0.95 : 0.4) * aggression * life * frontierPulse);
      if (edge.towardCore) {
        // Soft under-glow beneath the hot frontier line.
        strokeSegment(graphics, clipped.x1, clipped.y1, clipped.x2, clipped.y2, {
          color: PALETTE.corruptionFrontier,
          width: phase === "collapse" ? 6.5 : 5,
          alpha: 0.16 * aggression * life * frontierPulse,
        });
      }
      strokeSegment(graphics, clipped.x1, clipped.y1, clipped.x2, clipped.y2, {
        color: edge.towardCore ? PALETTE.corruptionFrontier : PALETTE.dangerSoft,
        width: edge.towardCore
          ? (phase === "collapse" ? 2.4 : phase === "surge" ? 2.0 : 1.65)
          : 1.05,
        alpha,
      });
    }
  }

  // Longer clipped pressure bridges from active frontier toward core.
  if (!reducedMotion && phase !== "probe") {
    const bridges = livingKeys
      .filter((key) => {
        const visual = visuals.get(key);
        if (!visual || visual.dyingAtTick !== null) return false;
        const point = parseCellKey(key);
        return isRimCell(point, GRID_COLUMNS, GRID_ROWS) && coreDistance(point) > 4;
      })
      .slice(0, 12);
    for (const key of bridges) {
      const point = parseCellKey(key);
      const pressure = pressureTowardCore(point);
      const cx = pxX(layout, point.x);
      const cy = pxY(layout, point.y);
      const reach = layout.cell * (2.4 + aggression * 1.6);
      const clipped = clipLineSegment({
        x1: cx,
        y1: cy,
        x2: cx + pressure.x * reach,
        y2: cy + pressure.y * reach,
      }, clip);
      if (!clipped) continue;
      strokeSegment(graphics, clipped.x1, clipped.y1, clipped.x2, clipped.y2, {
        color: PALETTE.dangerSoft,
        width: 1.15,
        alpha: 0.38 * aggression,
      });
    }
  }
}
