/** Shared renderer-owned visual bookkeeping helpers. */

export type {
  CameraImpulse,
  CellVisual,
} from "../../components/arena-fx";

export {
  CAMERA_DAMAGE_MS,
  CAMERA_PHASE_MS,
  CAMERA_PULSE_MS,
  COLLAPSE_TICKS,
  CRUST_TICKS,
  collapseProgress,
  coreDistance,
  crustProgress,
  frontierAggression,
  isRimCell,
  nearestRimNeighbor,
  pressureTowardCore,
  syncCorruptionVisuals,
  veinHash,
} from "../../components/arena-fx";
