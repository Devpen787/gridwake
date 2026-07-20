import { hashText, manhattan, parseCellKey } from "../game/math";
import { CORE_X, CORE_Y, type Point, type RoundPhase } from "../game/types";

export type CellVisual = Readonly<{
  bornAtTick: number;
  dyingAtTick: number | null;
}>;

export type CameraImpulse = Readonly<{
  kind: "phase" | "damage" | "pulse";
  startedAtMs: number;
  dirX: number;
  dirY: number;
}>;

const CORE: Point = { x: CORE_X, y: CORE_Y };
export const CRUST_TICKS = 6;
export const COLLAPSE_TICKS = 8;
export const CAMERA_PHASE_MS = 420;
export const CAMERA_DAMAGE_MS = 220;
export const CAMERA_PULSE_MS = 520;

export function syncCorruptionVisuals(
  visuals: Map<string, CellVisual>,
  corruption: ReadonlySet<string>,
  tick: number,
): void {
  for (const key of corruption) {
    if (!visuals.has(key)) {
      visuals.set(key, { bornAtTick: tick, dyingAtTick: null });
    } else {
      const current = visuals.get(key)!;
      if (current.dyingAtTick !== null) {
        visuals.set(key, { bornAtTick: tick, dyingAtTick: null });
      }
    }
  }
  for (const [key, visual] of [...visuals.entries()]) {
    if (corruption.has(key)) continue;
    if (visual.dyingAtTick === null) {
      visuals.set(key, { ...visual, dyingAtTick: tick });
      continue;
    }
    if (tick - visual.dyingAtTick > COLLAPSE_TICKS) {
      visuals.delete(key);
    }
  }
}

export function crustProgress(visual: CellVisual, tick: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  if (visual.dyingAtTick !== null) return 1;
  return Math.min(1, Math.max(0, (tick - visual.bornAtTick) / CRUST_TICKS));
}

export function collapseProgress(visual: CellVisual, tick: number, reducedMotion: boolean): number {
  if (visual.dyingAtTick === null) return 0;
  if (reducedMotion) return 1;
  return Math.min(1, Math.max(0, (tick - visual.dyingAtTick) / COLLAPSE_TICKS));
}

export function frontierAggression(phase: RoundPhase): number {
  switch (phase) {
    case "probe":
      return 1;
    case "surge":
      return 1.12;
    case "collapse":
      return 1.28;
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

export function pressureTowardCore(point: Point): Point {
  const dx = CORE.x - point.x;
  const dy = CORE.y - point.y;
  const dist = Math.hypot(dx, dy) || 1;
  return { x: dx / dist, y: dy / dist };
}

export function veinHash(a: string, b: string): number {
  return hashText(`vein|${a}|${b}`);
}

export function isRimCell(point: Point, columns: number, rows: number): boolean {
  const edge = Math.min(point.x, point.y, columns - 1 - point.x, rows - 1 - point.y);
  return edge <= 1;
}

export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

export function cameraOffset(
  impulse: CameraImpulse | null,
  nowMs: number,
): Readonly<{ x: number; y: number; scale: number }> {
  if (!impulse) return { x: 0, y: 0, scale: 1 };
  const duration = impulse.kind === "phase"
    ? CAMERA_PHASE_MS
    : impulse.kind === "damage"
      ? CAMERA_DAMAGE_MS
      : CAMERA_PULSE_MS;
  const t = (nowMs - impulse.startedAtMs) / duration;
  if (t >= 1 || t < 0) return { x: 0, y: 0, scale: 1 };
  const envelope = 1 - easeOutCubic(t);
  if (impulse.kind === "pulse") {
    return { x: 0, y: 0, scale: 1 + envelope * 0.018 };
  }
  const amplitude = impulse.kind === "damage" ? 3.2 : 1.6;
  return {
    x: impulse.dirX * amplitude * envelope,
    y: impulse.dirY * amplitude * envelope,
    scale: 1 + (impulse.kind === "phase" ? envelope * 0.008 : 0),
  };
}

export function nearestRimNeighbor(
  key: string,
  corruption: ReadonlySet<string>,
  columns: number,
  rows: number,
): string | null {
  const point = parseCellKey(key);
  if (!isRimCell(point, columns, rows)) return null;
  const candidates = [
    `${point.x + 1}:${point.y}`,
    `${point.x - 1}:${point.y}`,
    `${point.x}:${point.y + 1}`,
    `${point.x}:${point.y - 1}`,
  ].filter((candidate) => {
    if (!corruption.has(candidate) && candidate !== key) return false;
    const other = parseCellKey(candidate);
    return isRimCell(other, columns, rows);
  });
  if (candidates.length === 0) return null;
  return candidates.toSorted((a, b) => veinHash(key, a) - veinHash(key, b) || a.localeCompare(b))[0] ?? null;
}

export function coreDistance(point: Point): number {
  return manhattan(point, CORE);
}
