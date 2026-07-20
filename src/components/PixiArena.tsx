import { useEffect, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";
import { phaseForTick } from "../game/engine";
import { hashText, manhattan, parseCellKey } from "../game/math";
import {
  CORE_X,
  CORE_Y,
  GRID_COLUMNS,
  GRID_ROWS,
  type EngineState,
  type LightState,
  type Point,
  type RoundPhase,
} from "../game/types";
import {
  type CameraImpulse,
  type CellVisual,
  cameraOffset,
  collapseProgress,
  coreDistance,
  crustProgress,
  frontierAggression,
  isRimCell,
  nearestRimNeighbor,
  pressureTowardCore,
  syncCorruptionVisuals,
  veinHash,
} from "./arena-fx";

type PixiArenaProps = Readonly<{
  state: EngineState;
  frozen?: boolean;
}>;

type Layout = Readonly<{ cell: number; originX: number; originY: number; width: number; height: number }>;

type PulseWarp = Readonly<{ x: number; y: number; radius: number; strength: number }>;

const CORE_POINT: Point = { x: CORE_X, y: CORE_Y };
const POSSESS_CLAIM_MS = 280;

function layoutFor(width: number, height: number): Layout {
  const usableWidth = Math.max(320, width - 96);
  const usableHeight = Math.max(260, height - 128);
  const cell = Math.max(10, Math.min(usableWidth / GRID_COLUMNS, usableHeight / GRID_ROWS));
  const gridWidth = cell * GRID_COLUMNS;
  const gridHeight = cell * GRID_ROWS;
  return {
    cell,
    width: gridWidth,
    height: gridHeight,
    originX: (width - gridWidth) / 2,
    originY: (height - gridHeight) / 2,
  };
}

function pxX(layout: Layout, x: number): number {
  return layout.originX + x * layout.cell + layout.cell / 2;
}

function pxY(layout: Layout, y: number): number {
  return layout.originY + y * layout.cell + layout.cell / 2;
}

function pulseWarpFor(state: EngineState, layout: Layout, allowWarp: boolean): PulseWarp | null {
  if (!allowWarp || state.pulse.usedAtTick === null) return null;
  const age = state.tick - state.pulse.usedAtTick;
  if (age < 0 || age > 12) return null;
  const progress = age / 12;
  const radius = layout.cell * (0.8 + progress * 8.2);
  const strength = (1 - progress) * layout.cell * 0.55;
  return {
    x: pxX(layout, state.pulse.x),
    y: pxY(layout, state.pulse.y),
    radius,
    strength,
  };
}

function displacePoint(x: number, y: number, warp: PulseWarp | null): Readonly<{ x: number; y: number }> {
  if (!warp || warp.strength <= 0) return { x, y };
  const dx = x - warp.x;
  const dy = y - warp.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1 || distance > warp.radius * 1.15) return { x, y };
  const falloff = 1 - distance / (warp.radius * 1.15);
  const push = warp.strength * falloff * falloff;
  return {
    x: x + (dx / distance) * push,
    y: y + (dy / distance) * push,
  };
}

function drawAtmosphere(graphics: Graphics, layout: Layout, phase: RoundPhase, frozen: boolean) {
  const cx = pxX(layout, CORE_X);
  const cy = pxY(layout, CORE_Y);
  const vignetteBoost = phase === "collapse" ? 1.18 : phase === "surge" ? 1.06 : 1;
  graphics.circle(cx, cy, layout.cell * 12 * vignetteBoost).fill({
    color: 0x07141c,
    alpha: frozen ? 0.88 : phase === "collapse" ? 0.82 : 0.7,
  });
  graphics.circle(cx, cy, layout.cell * 11).fill({
    color: 0x0a1a24,
    alpha: frozen ? 0.72 : phase === "collapse" ? 0.68 : 0.55,
  });
  graphics.circle(cx, cy, layout.cell * (phase === "collapse" ? 5.2 : 6)).fill({
    color: 0x102838,
    alpha: phase === "collapse" ? 0.48 : 0.35,
  });
  if (frozen) {
    graphics.rect(layout.originX - 40, layout.originY - 40, layout.width + 80, layout.height + 80).fill({
      color: 0x03060a,
      alpha: 0.42,
    });
  }
  const borderAlpha = phase === "surge" ? 0.34 : phase === "collapse" ? 0.42 : 0.22;
  graphics.rect(layout.originX, layout.originY, layout.width, layout.height).stroke({
    color: phase === "collapse" ? 0xff4d6d : 0x40e8ff,
    width: phase === "probe" ? 1.2 : 1.45,
    alpha: frozen ? borderAlpha * 0.55 : borderAlpha,
  });
}

function drawGrid(graphics: Graphics, layout: Layout, warp: PulseWarp | null) {
  for (let x = 0; x <= GRID_COLUMNS; x += 1) {
    const major = x === 0 || x === GRID_COLUMNS || x % 5 === 0;
    const segments = warp ? Math.max(8, GRID_ROWS) : 1;
    for (let segment = 0; segment < segments; segment += 1) {
      const y0 = (segment / segments) * GRID_ROWS;
      const y1 = ((segment + 1) / segments) * GRID_ROWS;
      const from = displacePoint(layout.originX + x * layout.cell, layout.originY + y0 * layout.cell, warp);
      const to = displacePoint(layout.originX + x * layout.cell, layout.originY + y1 * layout.cell, warp);
      graphics.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({
        color: 0x2a4d63,
        width: major ? 1.15 : 0.7,
        alpha: major ? 0.55 : 0.22,
      });
    }
  }
  for (let y = 0; y <= GRID_ROWS; y += 1) {
    const major = y === 0 || y === GRID_ROWS || y % 3 === 0;
    const segments = warp ? Math.max(8, GRID_COLUMNS) : 1;
    for (let segment = 0; segment < segments; segment += 1) {
      const x0 = (segment / segments) * GRID_COLUMNS;
      const x1 = ((segment + 1) / segments) * GRID_COLUMNS;
      const from = displacePoint(layout.originX + x0 * layout.cell, layout.originY + y * layout.cell, warp);
      const to = displacePoint(layout.originX + x1 * layout.cell, layout.originY + y * layout.cell, warp);
      graphics.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({
        color: 0x2a4d63,
        width: major ? 1.15 : 0.7,
        alpha: major ? 0.55 : 0.22,
      });
    }
  }
}

function drawTacticalField(graphics: Graphics, layout: Layout, state: EngineState) {
  for (const light of state.lights) {
    if (light.mode !== "intercept" && light.mode !== "manual") continue;
    const x = pxX(layout, light.x);
    const y = pxY(layout, light.y);
    graphics.circle(x, y, layout.cell * (light.mode === "manual" ? 2.4 : 1.8)).stroke({
      color: light.color,
      width: 1,
      alpha: light.mode === "manual" ? 0.55 : 0.42,
    });
    graphics.circle(x, y, layout.cell * 0.9).stroke({
      color: light.color,
      width: 0.8,
      alpha: 0.5 + light.urgency / 280,
    });
  }
}

function drawCorruption(
  graphics: Graphics,
  layout: Layout,
  state: EngineState,
  phase: RoundPhase,
  visuals: ReadonlyMap<string, CellVisual>,
  reducedMotion: boolean,
) {
  const aggression = frontierAggression(phase);
  const livingKeys = [...visuals.keys()].toSorted();

  for (const key of livingKeys) {
    const visual = visuals.get(key);
    if (!visual) continue;
    const point = parseCellKey(key);
    const grow = crustProgress(visual, state.tick, reducedMotion);
    const die = collapseProgress(visual, state.tick, reducedMotion);
    if (die >= 1) continue;
    const life = (1 - die) * (0.35 + grow * 0.65);
    const x = layout.originX + point.x * layout.cell;
    const y = layout.originY + point.y * layout.cell;
    const onRim = isRimCell(point, GRID_COLUMNS, GRID_ROWS);
    const nearCore = coreDistance(point) <= 5;
    const hash = (point.x * 17 + point.y * 31 + state.seed) & 7;
    const scale = reducedMotion ? 1 : 0.55 + grow * 0.45;
    const insetBase = Math.max(0.8, layout.cell * (onRim ? 0.02 : 0.1));
    const inset = insetBase + (1 - scale) * layout.cell * 0.2 + die * layout.cell * 0.28;
    const fillAlpha = Math.min(1, (onRim ? 0.96 : nearCore ? 0.62 : 0.52) * aggression * life);
    const strokeAlpha = Math.min(1, (onRim ? 0.95 : 0.55) * aggression * life);
    const pressure = pressureTowardCore(point);

    if (nearCore && !onRim) {
      graphics.circle(pxX(layout, point.x), pxY(layout, point.y), layout.cell * 0.5 * life).fill({
        color: 0xff4d6d,
        alpha: 0.1 * life,
      });
    }

    if (onRim) {
      const jag = layout.cell * (0.08 + (hash % 4) * 0.04) * (phase === "collapse" ? 1.25 : 1) * scale;
      const poly = [
        x + inset,
        y + inset + (hash & 1 ? jag : 0),
        x + layout.cell - inset - (hash & 2 ? jag * 0.6 : 0),
        y + inset,
        x + layout.cell - inset,
        y + layout.cell - inset - (hash & 4 ? jag : 0),
        x + inset + (hash & 1 ? jag * 0.5 : 0),
        y + layout.cell - inset,
      ];
      graphics.poly(poly).fill({ color: 0x2a0a14, alpha: fillAlpha }).stroke({
        color: phase === "probe" ? 0xff4d6d : 0xff6b86,
        width: phase === "collapse" ? 1.7 : 1.35,
        alpha: strokeAlpha,
      });
    } else {
      const shrinkX = die * pressure.x * layout.cell * 0.35;
      const shrinkY = die * pressure.y * layout.cell * 0.35;
      graphics
        .rect(
          x + inset + shrinkX,
          y + inset + shrinkY,
          layout.cell - inset * 2,
          layout.cell - inset * 2,
        )
        .fill({ color: 0x2a0a14, alpha: fillAlpha })
        .stroke({ color: 0xff4d6d, width: 1, alpha: strokeAlpha });
    }

    if (!reducedMotion && phase !== "probe" && die === 0 && grow > 0.4 && coreDistance(point) > 4) {
      const cx = pxX(layout, point.x);
      const cy = pxY(layout, point.y);
      graphics
        .moveTo(cx, cy)
        .lineTo(cx + pressure.x * layout.cell * 0.55 * aggression, cy + pressure.y * layout.cell * 0.55 * aggression)
        .stroke({ color: 0xff6b86, width: 1.1, alpha: 0.35 * life * aggression });
    }
  }

  // Broken rim veins — deterministic neighbor links.
  for (const key of livingKeys) {
    const visual = visuals.get(key);
    if (!visual || visual.dyingAtTick !== null) continue;
    const neighbor = nearestRimNeighbor(key, state.corruption, GRID_COLUMNS, GRID_ROWS);
    if (!neighbor || neighbor < key) continue;
    const a = parseCellKey(key);
    const b = parseCellKey(neighbor);
    const hash = veinHash(key, neighbor);
    if ((hash & 3) === 0) continue;
    const midBreak = ((hash >>> 4) & 63) / 63;
    const ax = pxX(layout, a.x);
    const ay = pxY(layout, a.y);
    const bx = pxX(layout, b.x);
    const by = pxY(layout, b.y);
    const mx = ax + (bx - ax) * midBreak;
    const my = ay + (by - ay) * midBreak;
    const offset = ((hash >>> 10) & 7) - 3;
    graphics
      .moveTo(ax, ay)
      .lineTo(mx + offset * 0.4, my - offset * 0.4)
      .moveTo(mx + offset, my + offset)
      .lineTo(bx, by)
      .stroke({
        color: 0xff6b86,
        width: phase === "collapse" ? 1.35 : 1,
        alpha: phase === "probe" ? 0.28 : 0.48,
      });
  }
}

function drawTrail(graphics: Graphics, layout: Layout, light: LightState) {
  if (light.trail.length < 2) return;
  const width = Math.max(1.8, layout.cell * (light.role === "scout" ? 0.09 : light.role === "guardian" ? 0.14 : 0.12));
  for (let index = 1; index < light.trail.length; index += 1) {
    const from = light.trail[index - 1];
    const to = light.trail[index];
    const t = index / light.trail.length;
    const alpha = 0.1 + t * 0.78;
    if (light.role === "scout") {
      const gap = index % 2 === 0;
      if (gap) continue;
    }
    graphics
      .moveTo(pxX(layout, from.x), pxY(layout, from.y))
      .lineTo(pxX(layout, to.x), pxY(layout, to.y))
      .stroke({
        color: light.role === "mender" ? 0xffd166 : light.color,
        width: width * (0.55 + t * 0.55),
        alpha: light.role === "mender" ? alpha * 0.85 : alpha,
      });
  }
  if (light.role === "mender" && light.trail.length >= 2) {
    const tip = light.trail[light.trail.length - 1];
    const toward = pressureTowardCore(tip);
    graphics
      .moveTo(pxX(layout, tip.x), pxY(layout, tip.y))
      .lineTo(
        pxX(layout, tip.x) + toward.x * layout.cell * 0.7,
        pxY(layout, tip.y) + toward.y * layout.cell * 0.7,
      )
      .stroke({ color: 0xffd166, width: 1.1, alpha: 0.45 });
  }
}

function drawLight(
  graphics: Graphics,
  layout: Layout,
  light: LightState,
  interpolation: number,
  possessedLightId: string | null,
  claimProgress: number,
  state: EngineState,
) {
  const eased = light.role === "guardian" ? Math.min(1, interpolation * 0.85 + 0.15) : interpolation;
  const x = light.previousX + (light.x - light.previousX) * eased;
  const y = light.previousY + (light.y - light.previousY) * eased;
  const centerX = pxX(layout, x);
  const centerY = pxY(layout, y);
  const radius = Math.max(4.5, layout.cell * (light.role === "guardian" ? 0.32 : 0.28));
  const possessed = light.id === possessedLightId;
  const active = light.mode === "intercept" || possessed;

  graphics.circle(centerX, centerY, radius * (possessed ? 3.9 : active ? 2.8 : 2.4)).fill({
    color: light.color,
    alpha: possessed ? 0.2 : active ? 0.1 : 0.07,
  });

  if (possessed) {
    const claimBoost = claimProgress > 0 ? (1 - claimProgress) * 0.55 : 0;
    graphics.circle(centerX, centerY, radius * (1.85 + claimBoost * 1.4)).stroke({
      color: 0xf4f7ff,
      width: 1.6 + claimBoost * 2,
      alpha: 0.82 + claimBoost,
    });
  }

  if (light.role === "guardian") {
    const lattice = layout.cell * (light.mode === "formation" || manhattan(light, CORE_POINT) <= 6 ? 2.2 : 1.4);
    graphics.circle(centerX, centerY, lattice).stroke({ color: 0xa78bfa, width: 1, alpha: 0.28 });
    graphics.circle(centerX, centerY, lattice * 0.72).stroke({ color: 0xf4f7ff, width: 0.8, alpha: 0.18 });
    if (active) {
      graphics.arc(centerX, centerY, radius * 2.1, -0.9, 0.9).stroke({ color: 0xf4f7ff, width: 1.4, alpha: 0.55 });
    }
    const outer = [
      centerX, centerY - radius * 1.15,
      centerX + radius * 1.15, centerY,
      centerX, centerY + radius * 1.15,
      centerX - radius * 1.15, centerY,
    ];
    const inner = [
      centerX, centerY - radius * 0.55,
      centerX + radius * 0.55, centerY,
      centerX, centerY + radius * 0.55,
      centerX - radius * 0.55, centerY,
    ];
    graphics.poly(outer).fill({ color: 0xa78bfa, alpha: 0.08 }).stroke({ color: light.color, width: 2.2, alpha: 1 });
    graphics.poly(inner).stroke({ color: 0xf4f7ff, width: 1.2, alpha: 0.75 });
    return;
  }

  if (light.role === "scout") {
    const dx = light.target.x - light.x;
    const dy = light.target.y - light.y;
    const angle = Math.atan2(dy, dx || 0.001);
    const tipX = centerX + Math.cos(angle) * radius;
    const tipY = centerY + Math.sin(angle) * radius;
    const leftX = centerX + Math.cos(angle + 2.4) * radius;
    const leftY = centerY + Math.sin(angle + 2.4) * radius;
    const rightX = centerX + Math.cos(angle - 2.4) * radius;
    const rightY = centerY + Math.sin(angle - 2.4) * radius;
    if (light.mode === "intercept") {
      graphics
        .moveTo(centerX, centerY)
        .lineTo(pxX(layout, light.target.x), pxY(layout, light.target.y))
        .stroke({ color: 0x40e8ff, width: 1.1, alpha: 0.55 });
    }
    if (light.x !== light.previousX || light.y !== light.previousY) {
      graphics
        .moveTo(centerX - Math.cos(angle) * radius * 1.8, centerY - Math.sin(angle) * radius * 1.8)
        .lineTo(centerX, centerY)
        .stroke({ color: 0x40e8ff, width: 1.6, alpha: 0.5 });
    }
    graphics.poly([tipX, tipY, leftX, leftY, rightX, rightY]).fill({ color: light.color, alpha: 0.14 }).stroke({
      color: light.color,
      width: 2.2,
      alpha: 1,
    });
    return;
  }

  // Mender
  graphics.circle(centerX, centerY, radius).stroke({ color: light.color, width: 2.2, alpha: 1 });
  graphics.circle(centerX, centerY, radius * 0.55).stroke({ color: 0xffd166, width: 1.2, alpha: 0.7 });
  graphics.circle(centerX, centerY, radius * 0.28).fill({ color: light.color, alpha: 0.95 });
  for (const other of state.lights) {
    if (other.id === light.id) continue;
    const dist = manhattan(light, other);
    if (dist > 5) continue;
    graphics
      .moveTo(centerX, centerY)
      .lineTo(pxX(layout, other.x), pxY(layout, other.y))
      .stroke({ color: 0xffd166, width: 1, alpha: 0.28 });
  }
}

function drawCore(graphics: Graphics, layout: Layout, health: number, tick: number, phase: RoundPhase, frozen: boolean) {
  const x = pxX(layout, CORE_X);
  const y = pxY(layout, CORE_Y);
  const tension = 1 - health / 100;
  const phaseTension = phase === "collapse" ? 0.18 : phase === "surge" ? 0.08 : 0;
  const motionRate = frozen ? 0 : phase === "surge" ? 0.2 : phase === "collapse" ? 0.26 : 0.14;
  const pulse = frozen ? 1 : 1 + Math.sin(tick * motionRate) * (0.06 - tension * 0.03 + phaseTension * 0.04);
  const glow = layout.cell * (2.4 - tension * 0.9 - phaseTension * 0.35) * pulse;
  const mark = layout.cell * (0.42 - tension * 0.06) * pulse;
  const coreTint = tension > 0.55 || phase === "collapse" ? 0xff4d6d : tension > 0.3 ? 0xffd166 : 0xf4f7ff;
  const signalTint = tension > 0.55 || phase === "collapse" ? 0xff6b86 : 0x40e8ff;

  graphics.circle(x, y, glow * 1.35).fill({ color: coreTint, alpha: 0.03 + health / 7_000 });
  graphics.circle(x, y, glow).fill({ color: signalTint, alpha: 0.055 + tension * 0.04 + phaseTension * 0.03 });
  graphics.circle(x, y, glow * 0.45).fill({ color: coreTint, alpha: 0.08 + tension * 0.04 + phaseTension * 0.04 });
  if (tension > 0.4 || phase === "collapse") {
    graphics.circle(x, y, glow * 1.6).stroke({
      color: 0xff4d6d,
      width: 1.2,
      alpha: Math.max((tension - 0.4) * 0.55, phase === "collapse" ? 0.28 : 0),
    });
  }
  graphics
    .poly([x, y - mark, x + mark, y, x, y + mark, x - mark, y])
    .stroke({ color: coreTint, width: 1.6, alpha: 0.9 });
  graphics
    .poly([x, y - mark * 0.42, x + mark * 0.42, y, x, y + mark * 0.42, x - mark * 0.42, y])
    .stroke({ color: signalTint, width: 1, alpha: 0.75 });
  graphics.circle(x, y, Math.max(1.8, layout.cell * 0.11)).fill({
    color: tension > 0.55 || phase === "collapse" ? 0xffb0bc : 0xffffff,
    alpha: 1,
  });

  if (health <= 40 || phase === "collapse") {
    const fractureCount = health <= 20 || phase === "collapse" ? 6 : 4;
    for (let index = 0; index < fractureCount; index += 1) {
      const hash = hashText(`core-fracture|${index}`);
      const angle = ((hash % 3_600) / 3_600) * Math.PI * 2;
      const inner = mark * 1.15;
      const outer = mark * (1.8 + ((hash >>> 10) & 63) / 100);
      graphics
        .moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
        .lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer)
        .stroke({
          color: 0xff4d6d,
          width: health <= 20 || phase === "collapse" ? 1.4 : 1,
          alpha: health <= 20 || phase === "collapse" ? 0.7 : 0.42,
        });
    }
  }
}

function drawRepairs(graphics: Graphics, layout: Layout, state: EngineState) {
  for (const repair of state.repairs) {
    const age = state.tick - repair.bornAtTick;
    const alpha = Math.max(0, 1 - age / 10);
    const x = layout.originX + repair.x * layout.cell;
    const y = layout.originY + repair.y * layout.cell;
    graphics
      .rect(x + 2, y + 2, layout.cell - 4, layout.cell - 4)
      .stroke({ color: 0xffd166, width: 2.2, alpha });
    for (let stitch = 0; stitch < 3; stitch += 1) {
      const offset = ((stitch + 1) * layout.cell) / 4;
      graphics
        .moveTo(x + offset - 2, y + 2)
        .lineTo(x + offset + 2, y + layout.cell - 2)
        .stroke({ color: 0xffd166, width: 1.1, alpha: alpha * 0.85 });
    }
    const cx = pxX(layout, repair.x);
    const cy = pxY(layout, repair.y);
    const toward = pressureTowardCore({ x: repair.x, y: repair.y });
    graphics
      .moveTo(cx, cy)
      .lineTo(cx + toward.x * layout.cell * 0.9, cy + toward.y * layout.cell * 0.9)
      .stroke({ color: 0xffd166, width: 1, alpha: alpha * 0.55 });
  }
}

function drawPulse(graphics: Graphics, layout: Layout, state: EngineState) {
  if (state.pulse.usedAtTick === null) return;
  const age = state.tick - state.pulse.usedAtTick;
  if (age < 0 || age > 12) return;
  const progress = age / 12;
  const earlyBoost = age <= 2 ? 1.18 : 1;
  const radius = layout.cell * (0.8 + progress * 8.2) * earlyBoost;
  const alpha = (1 - progress) * earlyBoost;
  const x = pxX(layout, state.pulse.x);
  const y = pxY(layout, state.pulse.y);
  graphics.circle(x, y, radius).fill({ color: 0x40e8ff, alpha: alpha * 0.06 });
  graphics.circle(x, y, radius).stroke({ color: 0x40e8ff, width: 2.6, alpha: Math.min(1, alpha) });
  graphics.circle(x, y, radius * 0.82).stroke({ color: 0xf4f7ff, width: 1.1, alpha: alpha * 0.55 });
  graphics.circle(x, y, radius * 0.35).fill({ color: 0xf4f7ff, alpha: alpha * 0.08 });
}

function drawImpacts(graphics: Graphics, layout: Layout, state: EngineState) {
  for (const impact of state.impacts) {
    const age = state.tick - impact.bornAtTick;
    if (age < 0 || age > 10) continue;
    const progress = age / 10;
    const alpha = 1 - progress;
    const color = impact.kind === "damage"
      ? 0xff4d6d
      : impact.kind === "pulse"
        ? 0xf4f7ff
        : impact.kind === "manual"
          ? 0xffd166
          : 0x40e8ff;
    const x = pxX(layout, impact.x);
    const y = pxY(layout, impact.y);
    const radius = layout.cell * (0.32 + progress * (impact.kind === "damage" ? 1.9 : impact.kind === "intercept" ? 1.35 : 1.7));
    const cellX = layout.originX + impact.x * layout.cell;
    const cellY = layout.originY + impact.y * layout.cell;
    if (progress < 0.45) {
      graphics.rect(cellX + 1, cellY + 1, layout.cell - 2, layout.cell - 2).fill({
        color,
        alpha: alpha * (impact.kind === "damage" ? 0.22 : 0.14),
      });
    }
    if (impact.kind === "intercept") {
      // Scout-sharp collapse diamond.
      graphics
        .poly([x, y - radius, x + radius * 0.7, y, x, y + radius, x - radius * 0.7, y])
        .stroke({ color: 0x40e8ff, width: 1.6, alpha });
    }
    graphics.circle(x, y, radius).fill({ color, alpha: alpha * 0.12 });
    graphics.circle(x, y, radius).stroke({ color, width: impact.kind === "damage" ? 2.8 : 2, alpha });
  }
}

function drawImpactSparks(
  graphics: Graphics,
  layout: Layout,
  state: EngineState,
  reducedMotion: boolean,
) {
  for (const impact of state.impacts) {
    const age = state.tick - impact.bornAtTick;
    if (age < 0 || age > 10) continue;
    const progress = age / 10;
    const alpha = Math.max(0, 1 - progress);
    const x = pxX(layout, impact.x);
    const y = pxY(layout, impact.y);
    const color = impact.kind === "damage"
      ? 0xff4d6d
      : impact.kind === "pulse"
        ? 0xf4f7ff
        : impact.kind === "manual"
          ? 0xffd166
          : 0x40e8ff;
    const fullCount = impact.kind === "damage" ? 10 : 7;
    const count = reducedMotion ? Math.min(4, fullCount) : fullCount;
    for (let index = 0; index < count; index += 1) {
      const hash = hashText([
        state.seed,
        "spark",
        impact.kind,
        impact.bornAtTick,
        impact.x,
        impact.y,
        index,
      ].join("|"));
      const angle = ((hash % 3_600) / 3_600) * Math.PI * 2;
      const lengthNoise = ((hash >>> 12) & 255) / 255;
      const inner = layout.cell * (0.18 + (reducedMotion ? 0.12 : progress * 0.22));
      const outer = inner + layout.cell * (
        reducedMotion
          ? 0.38 + lengthNoise * 0.2
          : 0.32 + progress * (0.8 + lengthNoise * 0.55)
      );
      graphics
        .moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
        .lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer)
        .stroke({
          color,
          width: impact.kind === "damage" ? 1.5 : 1,
          alpha: alpha * (0.42 + lengthNoise * 0.4),
        });
    }
  }
}

function drawWarningShimmer(graphics: Graphics, layout: Layout, state: EngineState) {
  if (state.lastEvent?.kind !== "warning") return;
  const age = state.tick - state.lastEvent.tick;
  if (age < 0 || age > 8) return;
  const alpha = Math.max(0, 1 - age / 8) * 0.35;
  graphics.rect(layout.originX, layout.originY, layout.width, layout.height).stroke({
    color: 0xff4d6d,
    width: 1.4,
    alpha,
  });
}

export function PixiArena({ state, frozen = false }: PixiArenaProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(state);
  const frozenRef = useRef(frozen);
  const updatedAtRef = useRef(performance.now());
  const possessedRef = useRef<string | null>(state.possessedLightId);
  const claimAtRef = useRef(0);
  const visualsRef = useRef(new Map<string, CellVisual>());
  const phaseRef = useRef(phaseForTick(state.tick));
  const healthRef = useRef(state.health);
  const pulseUsedRef = useRef(state.pulse.usedAtTick);
  const impulseRef = useRef<CameraImpulse | null>(null);

  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);

  useEffect(() => {
    const moved = state.lights.some((light, index) => {
      const previous = stateRef.current.lights[index];
      return !previous || previous.x !== light.x || previous.y !== light.y;
    });
    if (state.possessedLightId !== possessedRef.current) {
      possessedRef.current = state.possessedLightId;
      if (state.possessedLightId !== null) claimAtRef.current = performance.now();
    }
    const nextPhase = phaseForTick(state.tick);
    if (nextPhase !== phaseRef.current) {
      phaseRef.current = nextPhase;
      if (nextPhase !== "probe") {
        impulseRef.current = {
          kind: "phase",
          startedAtMs: performance.now(),
          dirX: nextPhase === "surge" ? 0.4 : -0.2,
          dirY: nextPhase === "collapse" ? 0.55 : -0.25,
        };
      }
    }
    if (state.health < healthRef.current) {
      impulseRef.current = {
        kind: "damage",
        startedAtMs: performance.now(),
        dirX: 0.15,
        dirY: 0.9,
      };
    }
    healthRef.current = state.health;
    if (state.pulse.usedAtTick !== null && state.pulse.usedAtTick !== pulseUsedRef.current) {
      impulseRef.current = {
        kind: "pulse",
        startedAtMs: performance.now(),
        dirX: 0,
        dirY: 0,
      };
    }
    pulseUsedRef.current = state.pulse.usedAtTick;
    syncCorruptionVisuals(visualsRef.current, state.corruption, state.tick);
    stateRef.current = state;
    if (moved) updatedAtRef.current = performance.now();
  }, [state]);

  useEffect(() => {
    syncCorruptionVisuals(visualsRef.current, state.corruption, state.tick);
    const host = hostRef.current;
    if (!host) return;
    const mountHost = host;
    let cancelled = false;
    let app: Application | null = null;

    async function mount() {
      const nextApp = new Application();
      await nextApp.init({
        resizeTo: mountHost,
        background: 0x03060a,
        backgroundAlpha: 1,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(2, window.devicePixelRatio || 1),
      });
      if (cancelled) {
        nextApp.destroy(true);
        return;
      }
      app = nextApp;
      nextApp.canvas.setAttribute("aria-hidden", "true");
      mountHost.appendChild(nextApp.canvas);
      const scene = new Container();
      const atmosphereLayer = new Graphics();
      const worldLayer = new Graphics();
      const actorLayer = new Graphics();
      scene.addChild(atmosphereLayer, worldLayer, actorLayer);
      nextApp.stage.addChild(scene);
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let renderedTick = -1;
      let renderedWidth = -1;
      let renderedHeight = -1;
      let lastWarpActive = false;
      let lastFrozen = frozenRef.current;

      nextApp.ticker.add(() => {
        const width = nextApp.screen.width;
        const height = nextApp.screen.height;
        const current = stateRef.current;
        const isFrozen = frozenRef.current;
        const phase = phaseForTick(current.tick);
        const allowWarp = !reducedMotion.matches && !isFrozen;
        const warpActive = allowWarp && current.pulse.usedAtTick !== null
          && current.tick - current.pulse.usedAtTick >= 0
          && current.tick - current.pulse.usedAtTick <= 12;
        const resized = width !== renderedWidth || height !== renderedHeight;
        const layout = layoutFor(width, height);

        if (resized || renderedTick !== current.tick || lastFrozen !== isFrozen) {
          atmosphereLayer.clear();
          drawAtmosphere(atmosphereLayer, layout, phase, isFrozen);
          renderedWidth = width;
          renderedHeight = height;
          lastFrozen = isFrozen;
        }
        if (resized || renderedTick !== current.tick || warpActive || lastWarpActive || lastFrozen !== isFrozen) {
          worldLayer.clear();
          const warp = pulseWarpFor(current, layout, allowWarp);
          drawGrid(worldLayer, layout, warp);
          drawTacticalField(worldLayer, layout, current);
          drawCorruption(
            worldLayer,
            layout,
            current,
            phase,
            visualsRef.current,
            reducedMotion.matches || isFrozen,
          );
          current.lights.forEach((light) => drawTrail(worldLayer, layout, light));
          drawRepairs(worldLayer, layout, current);
          renderedTick = current.tick;
          lastWarpActive = warpActive;
        }

        if (reducedMotion.matches || isFrozen) {
          scene.x = 0;
          scene.y = 0;
          scene.scale.set(1);
        } else {
          const cam = cameraOffset(impulseRef.current, performance.now());
          scene.x = cam.x;
          scene.y = cam.y;
          scene.scale.set(cam.scale);
        }

        const interpolation = reducedMotion.matches || isFrozen
          ? 1
          : Math.min(1, (performance.now() - updatedAtRef.current) / (phase === "surge" ? 120 : 150));
        const claimElapsed = performance.now() - claimAtRef.current;
        const claimProgress =
          reducedMotion.matches || isFrozen || claimAtRef.current === 0 || claimElapsed >= POSSESS_CLAIM_MS
            ? 0
            : claimElapsed / POSSESS_CLAIM_MS;

        actorLayer.clear();
        drawCore(actorLayer, layout, current.health, current.tick, phase, isFrozen);
        current.lights.forEach((light) =>
          drawLight(
            actorLayer,
            layout,
            light,
            interpolation,
            current.possessedLightId,
            claimProgress,
            current,
          ),
        );
        drawImpacts(actorLayer, layout, current);
        drawImpactSparks(actorLayer, layout, current, reducedMotion.matches || isFrozen);
        drawPulse(actorLayer, layout, current);
        drawWarningShimmer(actorLayer, layout, current);
      });
    }

    void mount();
    return () => {
      cancelled = true;
      app?.destroy(true);
    };
  }, [state.seed]);

  return <div className={`pixi-arena${frozen ? " pixi-arena--frozen" : ""}`} ref={hostRef} />;
}
