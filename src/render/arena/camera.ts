import {
  CAMERA_DAMAGE_MS,
  CAMERA_PHASE_MS,
  CAMERA_PULSE_MS,
  type CameraImpulse,
  easeOutCubic,
} from "../../components/arena-fx";

export type { CameraImpulse };

/** Phosphor Noir v2 camera envelopes (scene-level only). */
export function cameraOffset(
  impulse: CameraImpulse | null,
  nowMs: number,
): Readonly<{ x: number; y: number; scale: number }> {
  if (!impulse) return { x: 0, y: 0, scale: 1 };
  const duration = impulse.kind === "phase"
    ? Math.min(1100, Math.max(700, CAMERA_PHASE_MS + 280))
    : impulse.kind === "damage"
      ? 150
      : CAMERA_PULSE_MS;
  const t = (nowMs - impulse.startedAtMs) / duration;
  if (t >= 1 || t < 0) return { x: 0, y: 0, scale: 1 };
  const envelope = 1 - easeOutCubic(t);
  if (impulse.kind === "pulse") {
    return { x: 0, y: 0, scale: 1 + envelope * 0.02 };
  }
  const amplitude = impulse.kind === "damage" ? 4 : 1.8;
  return {
    x: impulse.dirX * amplitude * envelope,
    y: impulse.dirY * amplitude * envelope,
    scale: 1 + (impulse.kind === "phase" ? envelope * 0.01 : 0),
  };
}

export { CAMERA_DAMAGE_MS, CAMERA_PHASE_MS, CAMERA_PULSE_MS };
