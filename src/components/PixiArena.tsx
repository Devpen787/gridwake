import { useEffect, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";
import { manhattan, parseCellKey } from "../game/math";
import { CORE_X, CORE_Y, GRID_COLUMNS, GRID_ROWS, type EngineState, type LightState, type Point } from "../game/types";

type PixiArenaProps = Readonly<{ state: EngineState }>;

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

function drawAtmosphere(graphics: Graphics, layout: Layout) {
  const cx = pxX(layout, CORE_X);
  const cy = pxY(layout, CORE_Y);
  graphics.circle(cx, cy, layout.cell * 12).fill({ color: 0x07141c, alpha: 0.7 });
  graphics.circle(cx, cy, layout.cell * 11).fill({ color: 0x0a1a24, alpha: 0.55 });
  graphics.circle(cx, cy, layout.cell * 6).fill({ color: 0x102838, alpha: 0.35 });
  graphics.rect(layout.originX, layout.originY, layout.width, layout.height).stroke({
    color: 0x40e8ff,
    width: 1.2,
    alpha: 0.22,
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
    const fromX = pxX(layout, light.x);
    const fromY = pxY(layout, light.y);
    const toX = pxX(layout, light.target.x);
    const toY = pxY(layout, light.target.y);
    graphics.moveTo(fromX, fromY).lineTo(toX, toY).stroke({
      color: light.color,
      width: light.mode === "manual" ? 1.4 : 1.15,
      alpha: light.mode === "manual" ? 0.55 : 0.42,
    });
    graphics.circle(toX, toY, Math.max(2.5, layout.cell * 0.16)).stroke({
      color: light.color,
      width: 1.1,
      alpha: 0.5 + light.urgency / 280,
    });
  }
}

function drawCorruption(graphics: Graphics, layout: Layout, state: EngineState) {
  for (const key of state.corruption) {
    const point = parseCellKey(key);
    const x = layout.originX + point.x * layout.cell;
    const y = layout.originY + point.y * layout.cell;
    const edgeBias = Math.min(
      point.x,
      point.y,
      GRID_COLUMNS - 1 - point.x,
      GRID_ROWS - 1 - point.y,
    );
    const onRim = edgeBias <= 1;
    const nearRim = edgeBias <= 2;
    const nearCore = manhattan(point, CORE_POINT) <= 5;
    const hash = (point.x * 17 + point.y * 31 + state.seed) & 7;
    const inset = Math.max(0.8, layout.cell * (onRim ? 0.02 : nearRim ? 0.06 : 0.12));
    const fillAlpha = onRim ? 0.96 : nearRim ? 0.84 : nearCore ? 0.7 : 0.55;
    const strokeAlpha = onRim ? 0.95 : nearRim ? 0.78 : nearCore ? 0.7 : 0.42;

    if (nearCore) {
      graphics.circle(pxX(layout, point.x), pxY(layout, point.y), layout.cell * 0.62).fill({
        color: 0xff4d6d,
        alpha: 0.14,
      });
    }

    if (onRim) {
      const jag = layout.cell * (0.08 + (hash % 4) * 0.04);
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
        color: 0xff4d6d,
        width: 1.35,
        alpha: strokeAlpha,
      });
      graphics
        .moveTo(x + layout.cell * 0.1, y + layout.cell * (0.2 + (hash % 3) * 0.08))
        .lineTo(x + layout.cell * 0.45, y + layout.cell * 0.55)
        .lineTo(x + layout.cell * 0.9, y + layout.cell * (0.25 + (hash % 2) * 0.15))
        .stroke({ color: 0xff6b86, width: 1.1, alpha: 0.7 });
      if (hash % 3 === 0) {
        graphics
          .poly([
            x + layout.cell * 0.15,
            y - layout.cell * 0.08,
            x + layout.cell * 0.35,
            y + layout.cell * 0.12,
            x + layout.cell * 0.05,
            y + layout.cell * 0.18,
          ])
          .fill({ color: 0xff4d6d, alpha: 0.55 });
      }
      continue;
    }

    graphics
      .rect(x + inset, y + inset, layout.cell - inset * 2, layout.cell - inset * 2)
      .fill({ color: 0x2a0a14, alpha: fillAlpha })
      .stroke({ color: 0xff4d6d, width: nearRim ? 1.2 : 1, alpha: strokeAlpha });
    const fracture = (hash & 3) / 4;
    graphics
      .moveTo(x + layout.cell * 0.18, y + layout.cell * (0.25 + fracture * 0.25))
      .lineTo(x + layout.cell * 0.52, y + layout.cell * 0.5)
      .lineTo(x + layout.cell * 0.82, y + layout.cell * (0.36 + fracture * 0.2))
      .stroke({ color: 0xff6b86, width: 0.9, alpha: nearRim ? 0.55 : 0.35 });
  }
}

function drawTrail(graphics: Graphics, layout: Layout, light: LightState) {
  if (light.trail.length < 2) return;
  const width = Math.max(1.8, layout.cell * 0.12);
  for (let index = 1; index < light.trail.length; index += 1) {
    const from = light.trail[index - 1];
    const to = light.trail[index];
    const t = index / light.trail.length;
    const alpha = 0.1 + t * 0.78;
    graphics
      .moveTo(pxX(layout, from.x), pxY(layout, from.y))
      .lineTo(pxX(layout, to.x), pxY(layout, to.y))
      .stroke({ color: light.color, width: width * (0.55 + t * 0.55), alpha });
    const bent = from.x !== to.x && from.y !== to.y;
    const corner =
      index > 1 &&
      (light.trail[index - 2].x === from.x) !== (from.x === to.x);
    if (bent || corner) {
      graphics.circle(pxX(layout, to.x), pxY(layout, to.y), width * (corner ? 0.85 : 0.55)).fill({
        color: light.color,
        alpha: alpha * (corner ? 0.95 : 0.85),
      });
    }
  }
  const tip = light.trail[light.trail.length - 1];
  graphics.circle(pxX(layout, tip.x), pxY(layout, tip.y), width * 0.7).fill({
    color: light.color,
    alpha: 0.55,
  });
}

function drawLight(
  graphics: Graphics,
  layout: Layout,
  light: LightState,
  interpolation: number,
  possessedLightId: string | null,
  claimProgress: number,
) {
  const x = light.previousX + (light.x - light.previousX) * interpolation;
  const y = light.previousY + (light.y - light.previousY) * interpolation;
  const centerX = pxX(layout, x);
  const centerY = pxY(layout, y);
  const radius = Math.max(4.5, layout.cell * 0.28);
  const possessed = light.id === possessedLightId;
  const active = light.mode === "intercept" || possessed;
  graphics.circle(centerX, centerY, radius * (possessed ? 3.9 : active ? 2.8 : 2.4)).fill({
    color: light.color,
    alpha: possessed ? 0.2 : active ? 0.1 : 0.07,
  });
  graphics.circle(centerX, centerY, radius * 1.35).fill({ color: light.color, alpha: 0.08 });
  if (possessed) {
    const claimBoost = claimProgress > 0 ? (1 - claimProgress) * 0.55 : 0;
    graphics.circle(centerX, centerY, radius * (1.85 + claimBoost * 1.4)).stroke({
      color: 0xf4f7ff,
      width: 1.6 + claimBoost * 2,
      alpha: 0.82 + claimBoost,
    });
    if (claimProgress > 0 && claimProgress < 1) {
      graphics.circle(centerX, centerY, radius * (2.4 + (1 - claimProgress) * 2.2)).stroke({
        color: 0xffffff,
        width: 1.2,
        alpha: (1 - claimProgress) * 0.65,
      });
    }
  }
  if (light.shape === "circle") {
    graphics.circle(centerX, centerY, radius).stroke({ color: light.color, width: 2.2, alpha: 1 });
    graphics.circle(centerX, centerY, radius * 0.38).fill({ color: light.color, alpha: 0.95 });
    return;
  }
  if (light.shape === "triangle") {
    const poly = [
      centerX,
      centerY - radius,
      centerX + radius,
      centerY + radius * 0.75,
      centerX - radius,
      centerY + radius * 0.75,
    ];
    graphics.poly(poly).fill({ color: light.color, alpha: 0.12 }).stroke({ color: light.color, width: 2.2, alpha: 1 });
    return;
  }
  const diamond = [
    centerX,
    centerY - radius,
    centerX + radius,
    centerY,
    centerX,
    centerY + radius,
    centerX - radius,
    centerY,
  ];
  graphics.poly(diamond).fill({ color: light.color, alpha: 0.12 }).stroke({ color: light.color, width: 2.2, alpha: 1 });
}

function drawCore(graphics: Graphics, layout: Layout, health: number, tick: number) {
  const x = pxX(layout, CORE_X);
  const y = pxY(layout, CORE_Y);
  const tension = 1 - health / 100;
  const pulse = 1 + Math.sin(tick * 0.14) * (0.06 - tension * 0.03);
  const glow = layout.cell * (2.4 - tension * 0.9) * pulse;
  const mark = layout.cell * (0.42 - tension * 0.06) * pulse;
  const coreTint = tension > 0.55 ? 0xff4d6d : tension > 0.3 ? 0xffd166 : 0xf4f7ff;
  const signalTint = tension > 0.55 ? 0xff6b86 : 0x40e8ff;

  graphics.circle(x, y, glow * 1.35).fill({ color: coreTint, alpha: 0.03 + health / 7_000 });
  graphics.circle(x, y, glow).fill({ color: signalTint, alpha: 0.055 + tension * 0.04 });
  graphics.circle(x, y, glow * 0.45).fill({ color: coreTint, alpha: 0.08 + tension * 0.04 });
  if (tension > 0.4) {
    graphics.circle(x, y, glow * 1.6).stroke({
      color: 0xff4d6d,
      width: 1.2,
      alpha: (tension - 0.4) * 0.55,
    });
  }
  graphics
    .poly([x, y - mark, x + mark, y, x, y + mark, x - mark, y])
    .stroke({ color: coreTint, width: 1.6, alpha: 0.9 });
  graphics
    .poly([
      x,
      y - mark * 0.42,
      x + mark * 0.42,
      y,
      x,
      y + mark * 0.42,
      x - mark * 0.42,
      y,
    ])
    .stroke({ color: signalTint, width: 1, alpha: 0.75 });
  graphics.circle(x, y, Math.max(1.8, layout.cell * 0.11)).fill({
    color: tension > 0.55 ? 0xffb0bc : 0xffffff,
    alpha: 1,
  });
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
  }
}

function drawPulse(graphics: Graphics, layout: Layout, state: EngineState) {
  if (state.pulse.usedAtTick === null) return;
  const age = state.tick - state.pulse.usedAtTick;
  if (age < 0 || age > 12) return;
  const progress = age / 12;
  const radius = layout.cell * (0.8 + progress * 8.2);
  const alpha = 1 - progress;
  const x = pxX(layout, state.pulse.x);
  const y = pxY(layout, state.pulse.y);
  graphics.circle(x, y, radius).fill({ color: 0x40e8ff, alpha: alpha * 0.06 });
  graphics.circle(x, y, radius).stroke({ color: 0x40e8ff, width: 2.6, alpha });
  graphics.circle(x, y, radius * 0.82).stroke({ color: 0xf4f7ff, width: 1.1, alpha: alpha * 0.55 });
  graphics.circle(x, y, radius * 0.35).fill({ color: 0xf4f7ff, alpha: alpha * 0.08 });
}

function drawImpacts(graphics: Graphics, layout: Layout, state: EngineState) {
  for (const impact of state.impacts) {
    const age = state.tick - impact.bornAtTick;
    if (age < 0 || age > 10) continue;
    const progress = age / 10;
    const alpha = 1 - progress;
    const color = impact.kind === "damage" ? 0xff4d6d : impact.kind === "pulse" ? 0xf4f7ff : 0x40e8ff;
    const x = pxX(layout, impact.x);
    const y = pxY(layout, impact.y);
    const radius = layout.cell * (0.32 + progress * (impact.kind === "damage" ? 1.9 : 1.7));
    const cellX = layout.originX + impact.x * layout.cell;
    const cellY = layout.originY + impact.y * layout.cell;
    if (progress < 0.45) {
      graphics.rect(cellX + 1, cellY + 1, layout.cell - 2, layout.cell - 2).fill({
        color,
        alpha: alpha * (impact.kind === "damage" ? 0.22 : 0.14),
      });
    }
    graphics.circle(x, y, radius).fill({ color, alpha: alpha * 0.12 });
    graphics.circle(x, y, radius).stroke({ color, width: impact.kind === "damage" ? 2.8 : 2, alpha });
    graphics
      .moveTo(x - radius, y)
      .lineTo(x + radius, y)
      .moveTo(x, y - radius)
      .lineTo(x, y + radius)
      .stroke({ color, width: 1.1, alpha: alpha * 0.85 });
    if (impact.kind !== "damage") {
      graphics
        .moveTo(x - radius * 0.65, y - radius * 0.65)
        .lineTo(x + radius * 0.65, y + radius * 0.65)
        .moveTo(x + radius * 0.65, y - radius * 0.65)
        .lineTo(x - radius * 0.65, y + radius * 0.65)
        .stroke({ color, width: 0.8, alpha: alpha * 0.45 });
    }
  }
}

function renderAtmosphere(graphics: Graphics, width: number, height: number) {
  graphics.clear();
  drawAtmosphere(graphics, layoutFor(width, height));
}

function renderWorld(
  graphics: Graphics,
  state: EngineState,
  width: number,
  height: number,
  allowWarp: boolean,
) {
  graphics.clear();
  const layout = layoutFor(width, height);
  const warp = pulseWarpFor(state, layout, allowWarp);
  drawGrid(graphics, layout, warp);
  drawTacticalField(graphics, layout, state);
  drawCorruption(graphics, layout, state);
  state.lights.forEach((light) => drawTrail(graphics, layout, light));
  drawRepairs(graphics, layout, state);
}

function renderActors(
  graphics: Graphics,
  state: EngineState,
  width: number,
  height: number,
  interpolation: number,
  claimProgress: number,
) {
  graphics.clear();
  const layout = layoutFor(width, height);
  drawCore(graphics, layout, state.health, state.tick);
  state.lights.forEach((light) =>
    drawLight(graphics, layout, light, interpolation, state.possessedLightId, claimProgress),
  );
  drawImpacts(graphics, layout, state);
  drawPulse(graphics, layout, state);
}

export function PixiArena({ state }: PixiArenaProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(state);
  const updatedAtRef = useRef(performance.now());
  const possessedRef = useRef<string | null>(state.possessedLightId);
  const claimAtRef = useRef(0);

  useEffect(() => {
    const moved = state.lights.some((light, index) => {
      const previous = stateRef.current.lights[index];
      return !previous || previous.x !== light.x || previous.y !== light.y;
    });
    if (state.possessedLightId !== possessedRef.current) {
      possessedRef.current = state.possessedLightId;
      if (state.possessedLightId !== null) claimAtRef.current = performance.now();
    }
    stateRef.current = state;
    if (moved) updatedAtRef.current = performance.now();
  }, [state]);

  useEffect(() => {
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
      nextApp.ticker.add(() => {
        const width = nextApp.screen.width;
        const height = nextApp.screen.height;
        const current = stateRef.current;
        const allowWarp = !reducedMotion.matches;
        const warpActive = allowWarp && current.pulse.usedAtTick !== null
          && current.tick - current.pulse.usedAtTick >= 0
          && current.tick - current.pulse.usedAtTick <= 12;
        const resized = width !== renderedWidth || height !== renderedHeight;
        if (resized) {
          renderAtmosphere(atmosphereLayer, width, height);
          renderedWidth = width;
          renderedHeight = height;
        }
        if (resized || renderedTick !== current.tick || warpActive || lastWarpActive) {
          renderWorld(worldLayer, current, width, height, allowWarp);
          renderedTick = current.tick;
          lastWarpActive = warpActive;
        }
        const interpolation = reducedMotion.matches
          ? 1
          : Math.min(1, (performance.now() - updatedAtRef.current) / 150);
        const claimElapsed = performance.now() - claimAtRef.current;
        const claimProgress =
          reducedMotion.matches || claimAtRef.current === 0 || claimElapsed >= POSSESS_CLAIM_MS
            ? 0
            : claimElapsed / POSSESS_CLAIM_MS;
        renderActors(actorLayer, current, width, height, interpolation, claimProgress);
      });
    }

    void mount();
    return () => {
      cancelled = true;
      app?.destroy(true);
    };
  }, []);

  return <div className="pixi-arena" ref={hostRef} />;
}
