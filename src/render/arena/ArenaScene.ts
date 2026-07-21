import { Container, Graphics } from "pixi.js";
import {
  type CameraImpulse,
  type CellVisual,
  syncCorruptionVisuals,
} from "../../components/arena-fx";
import { phaseForTick } from "../../game/engine";
import type { EngineState } from "../../game/types";
import { cameraOffset } from "./camera";
import { resetGraphics } from "./draw";
import { layoutFor, pxX, pxY, type ArenaLayout } from "./layout";
import { drawAtmosphere } from "./layers/atmosphere";
import { drawCore } from "./layers/core";
import { drawCorruption } from "./layers/corruption";
import { drawGrid, gridFieldFor, type PulseWarp } from "./layers/grid";
import { drawImpacts } from "./layers/impacts";
import { drawPulse, drawPulseTarget, drawWarningShimmer } from "./layers/pulse";
import { drawRoles } from "./layers/roles";
import { drawTactics } from "./layers/tactics";
import { drawTrails } from "./layers/trails";

export type ArenaPerfStats = Readonly<{
  fps: number;
  transientCount: number;
  particleCount: number;
  width: number;
  height: number;
  dpr: number;
}>;

const POSSESS_CLAIM_MS = 280;

/** Exponential damping rate (per second) for continuous light glide. */
const GLIDE_RATE = 13;
/** Faster chase for the possessed light so WASD feels immediate, not floaty. */
const GLIDE_RATE_MANUAL = 26;

export class ArenaScene {
  readonly root = new Container();
  private readonly atmosphereLayer = new Graphics();
  private readonly worldLayer = new Graphics();
  private readonly actorLayer = new Graphics();
  private readonly visuals = new Map<string, CellVisual>();
  private readonly glidePositions = new Map<string, { x: number; y: number }>();
  private lastFrameMs = 0;
  private impulse: CameraImpulse | null = null;
  private lastPhase = phaseForTick(0);
  private lastHealth = 100;
  private lastPulseUsed: number | null = null;
  private possessedId: string | null = null;
  private claimAtMs = 0;
  private frameTimes: number[] = [];
  private lastPerf: ArenaPerfStats = {
    fps: 0,
    transientCount: 0,
    particleCount: 0,
    width: 0,
    height: 0,
    dpr: 1,
  };

  constructor() {
    this.root.addChild(this.atmosphereLayer, this.worldLayer, this.actorLayer);
  }

  syncState(state: EngineState, nowMs = performance.now()): void {
    if (state.possessedLightId !== this.possessedId) {
      this.possessedId = state.possessedLightId;
      if (state.possessedLightId !== null) this.claimAtMs = nowMs;
    }
    const nextPhase = phaseForTick(state.tick);
    if (nextPhase !== this.lastPhase) {
      this.lastPhase = nextPhase;
      if (nextPhase !== "probe") {
        this.impulse = {
          kind: "phase",
          startedAtMs: nowMs,
          dirX: nextPhase === "surge" ? 0.4 : -0.2,
          dirY: nextPhase === "collapse" ? 0.55 : -0.25,
        };
      }
    }
    if (state.health < this.lastHealth) {
      this.impulse = {
        kind: "damage",
        startedAtMs: nowMs,
        dirX: 0.15,
        dirY: 0.9,
      };
    }
    this.lastHealth = state.health;
    if (state.pulse.usedAtTick !== null && state.pulse.usedAtTick !== this.lastPulseUsed) {
      this.impulse = { kind: "pulse", startedAtMs: nowMs, dirX: 0, dirY: 0 };
    }
    this.lastPulseUsed = state.pulse.usedAtTick;
    syncCorruptionVisuals(this.visuals, state.corruption, state.tick);
  }

  render(args: Readonly<{
    state: EngineState;
    viewWidth: number;
    viewHeight: number;
    frozen: boolean;
    reducedMotion: boolean;
    dpr: number;
    nowMs: number;
  }>): ArenaPerfStats {
    const { state, viewWidth, viewHeight, frozen, reducedMotion, dpr, nowMs } = args;
    const layout = layoutFor(viewWidth, viewHeight);
    const phase = phaseForTick(state.tick);

    // Continuous exponential glide: every light's render position chases its
    // engine cell each frame, so motion never stalls between 200ms steps.
    const dt = this.lastFrameMs === 0 ? 16 : Math.min(100, nowMs - this.lastFrameMs);
    this.lastFrameMs = nowMs;
    const blend = reducedMotion || frozen ? 1 : 1 - Math.exp(-(dt / 1000) * GLIDE_RATE);
    const possessedBlend = reducedMotion || frozen ? 1 : 1 - Math.exp(-(dt / 1000) * GLIDE_RATE_MANUAL);
    for (const light of state.lights) {
      const current = this.glidePositions.get(light.id);
      if (!current) {
        this.glidePositions.set(light.id, { x: light.x, y: light.y });
        continue;
      }
      const chase = light.id === state.possessedLightId ? possessedBlend : blend;
      current.x += (light.x - current.x) * chase;
      current.y += (light.y - current.y) * chase;
    }
    const animMs = reducedMotion || frozen ? 0 : nowMs;

    resetGraphics(this.atmosphereLayer);
    drawAtmosphere(this.atmosphereLayer, layout, phase, frozen);

    const allowWarp = !reducedMotion && !frozen;
    const pulse = pulseWarpFor(state, layout, allowWarp);
    const field = gridFieldFor(layout, pulse, reducedMotion || frozen);
    resetGraphics(this.worldLayer);
    // Arena border acts as the hard visual frame; all rays/trails/veins also
    // pass through clipLineSegment so nothing escapes the grid AABB.
    drawGrid(this.worldLayer, layout, field, frozen);
    drawTactics(this.worldLayer, layout, state);
    drawCorruption(
      this.worldLayer,
      layout,
      state,
      phase,
      this.visuals,
      reducedMotion || frozen,
      animMs,
    );
    drawTrails(this.worldLayer, layout, state, this.glidePositions);

    if (reducedMotion || frozen) {
      this.root.x = 0;
      this.root.y = 0;
      this.root.scale.set(1);
    } else {
      const cam = cameraOffset(this.impulse, nowMs);
      this.root.x = cam.x;
      this.root.y = cam.y;
      this.root.scale.set(cam.scale);
    }

    const claimElapsed = nowMs - this.claimAtMs;
    const claimProgress =
      reducedMotion || frozen || this.claimAtMs === 0 || claimElapsed >= POSSESS_CLAIM_MS
        ? 0
        : claimElapsed / POSSESS_CLAIM_MS;

    resetGraphics(this.actorLayer);
    drawCore(this.actorLayer, layout, state, phase, frozen, animMs);
    drawRoles(this.actorLayer, layout, state, this.glidePositions, claimProgress, animMs);
    const impactStats = drawImpacts(this.actorLayer, layout, state, reducedMotion || frozen);
    if (!frozen) drawPulseTarget(this.actorLayer, layout, state, animMs);
    drawPulse(this.actorLayer, layout, state);
    drawWarningShimmer(this.actorLayer, layout, state);

    this.frameTimes.push(nowMs);
    while (this.frameTimes.length > 0 && nowMs - this.frameTimes[0]! > 1000) {
      this.frameTimes.shift();
    }
    this.lastPerf = {
      fps: this.frameTimes.length,
      transientCount: this.visuals.size + state.impacts.length + state.repairs.length,
      particleCount: impactStats.particleCount,
      width: viewWidth,
      height: viewHeight,
      dpr,
    };
    return this.lastPerf;
  }

  getPerf(): ArenaPerfStats {
    return this.lastPerf;
  }

  destroy(): void {
    this.root.destroy({ children: true });
    this.visuals.clear();
  }
}

function pulseWarpFor(
  state: EngineState,
  layout: ArenaLayout,
  allowWarp: boolean,
): PulseWarp | null {
  if (!allowWarp || state.pulse.usedAtTick === null) return null;
  const age = state.tick - state.pulse.usedAtTick;
  if (age < 0 || age > 12) return null;
  const progress = age / 12;
  return {
    x: pxX(layout, state.pulse.x),
    y: pxY(layout, state.pulse.y),
    radius: layout.cell * (0.8 + progress * 8.2),
    strength: (1 - progress) * layout.cell * 0.85,
  };
}
