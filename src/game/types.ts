export const GRID_COLUMNS = 30;
export const GRID_ROWS = 18;
export const CORE_X = 15;
export const CORE_Y = 9;
export const ENGINE_VERSION = "gridwake-local-v0.6";
export const TICK_RATE = 10;
export const ROUND_SECONDS = 45;
export const ROUND_TICKS = ROUND_SECONDS * TICK_RATE;
export const LOOKAHEAD_CELLS = 3;
export const PULSE_CLEAR_CAP = 6;
export const PULSE_SHIELD_TICKS = 12;
/** Six seconds of scarce manual override at 10 Hz. */
export const OVERRIDE_MAX_TICKS = 60;

export type Point = Readonly<{ x: number; y: number }>;

export type LightRole = "guardian" | "scout" | "mender";

export type LightShape = "diamond" | "circle" | "triangle";

export type LightState = Readonly<{
  id: string;
  role: LightRole;
  color: number;
  shape: LightShape;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  trail: readonly Point[];
  mode: "intercept" | "formation" | "manual";
  target: Point;
  urgency: number;
  sector: number;
  intention: string;
  reason: string;
}>;

export type ManualIntent = Readonly<{ dx: -1 | 0 | 1; dy: -1 | 0 | 1 }>;

export type RepairFlash = Readonly<{
  x: number;
  y: number;
  bornAtTick: number;
}>;

export type ImpactFlash = Readonly<{
  x: number;
  y: number;
  bornAtTick: number;
  kind: "intercept" | "pulse" | "damage" | "manual";
}>;

export type Formation = "spread" | "balanced" | "link" | "ring";

export type MovementStyle = "disciplined" | "organic" | "erratic";

export type StrategyPolicy = Readonly<{
  focus: Readonly<{ core: number; edge: number; link: number }>;
  formation: Formation;
  engagementRadius: number;
  interceptors: number;
  pursuitLimit: number;
  movementStyle: MovementStyle;
  entropy: number;
  risk: number;
  pulseHealthThreshold: number;
  matchedSignals: readonly string[];
}>;

export type GameEvent = Readonly<{
  tick: number;
  kind: "repair" | "intercept" | "pulse" | "damage" | "warning" | "phase";
  message: string;
}>;

export type PulseState = Readonly<{
  available: boolean;
  usedAtTick: number | null;
  x: number;
  y: number;
  sector: number | null;
  cleared: number;
  shieldUntilTick: number | null;
}>;

export type RoundPhase = "probe" | "surge" | "collapse";

export type AttributionSource = "player" | "inferred" | "default" | "override" | "pulse";

export type AttributionEntry = Readonly<{
  tick: number;
  action: string;
  detail: string;
  source: AttributionSource;
  directiveIndex?: number;
  evidence?: string;
}>;

export type RoundAttribution = Readonly<{
  entries: readonly AttributionEntry[];
}>;

export type EngineState = Readonly<{
  seed: number;
  rngState: number;
  tick: number;
  maxTicks: number;
  health: number;
  policy: StrategyPolicy;
  corruption: ReadonlySet<string>;
  lights: readonly LightState[];
  repairs: readonly RepairFlash[];
  impacts: readonly ImpactFlash[];
  pulse: PulseState;
  trailRepairs: number;
  interceptClears: number;
  manualClears: number;
  pulseClears: number;
  peakThreat: number;
  damageTaken: number;
  lastEvent: GameEvent | null;
  ended: boolean;
  sharedWin: boolean | null;
  replayHash: number;
  possessedLightId: string | null;
  manualIntent: ManualIntent | null;
  overrideTicksRemaining: number;
  attribution?: RoundAttribution;
  plan?: import("./instinct/types").CanonicalStrategyPlan;
  interpretation?: import("./instinct/types").StrategyInterpretation;
}>;

export type Instinct = Readonly<{
  role: LightRole;
  label: string;
  description: string;
}>;

export type CompiledStrategy = Readonly<{
  source: string;
  policy: StrategyPolicy;
  instincts: readonly Instinct[];
  compiler: "local-prototype" | "local-instinct-v2";
  plan?: import("./instinct/types").CanonicalStrategyPlan;
  planHash?: string;
  sourceHash?: string;
  interpretation?: import("./instinct/types").StrategyInterpretation;
}>;

export type RoundReceipt = Readonly<{
  engineVersion: string;
  seed: number;
  strategyHash: string;
  ticks: number;
  outcome: "grid-held" | "core-lost";
  finalHealth: number;
  trailRepairs: number;
  interceptClears: number;
  manualClears: number;
  pulseClears: number;
  peakThreat: number;
  damageTaken: number;
  instinctImpact: number;
  gradeScore: number;
  grade: "S" | "A" | "B" | "C" | "D";
  replayHash: string;
}>;

export type ClearResolution = Readonly<{
  corruption: Set<string>;
  autonomousPoints: readonly Point[];
  manualPoints: readonly Point[];
}>;
