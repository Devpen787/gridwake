import {
  CORE_X,
  CORE_Y,
  ENGINE_VERSION,
  GRID_COLUMNS,
  GRID_ROWS,
  LOOKAHEAD_CELLS,
  OVERRIDE_MAX_TICKS,
  PULSE_CLEAR_CAP,
  PULSE_SHIELD_TICKS,
  ROUND_TICKS,
  type ClearResolution,
  type CompiledStrategy,
  type EngineState,
  type GameEvent,
  type LightRole,
  type LightShape,
  type LightState,
  type ManualIntent,
  type Point,
  type RoundPhase,
  type RoundReceipt,
  type StrategyPolicy,
} from "./types";
import {
  cellKey,
  clamp,
  hashEvent,
  hashText,
  hexHash,
  isInsideGrid,
  lcgNext,
  manhattan,
  parseCellKey,
  sectorCenter,
  sectorForPoint,
} from "./math";
import { strategyHash } from "./strategy";

const CORE_POINT: Point = { x: CORE_X, y: CORE_Y };
const COLORS = [0x40e8ff, 0xffd166, 0xa78bfa] as const;
const SHAPES: readonly LightShape[] = ["diamond", "triangle", "circle"];
const STARTS: readonly Point[] = [
  { x: CORE_X - 1, y: CORE_Y },
  { x: CORE_X + 1, y: CORE_Y },
  { x: CORE_X, y: CORE_Y + 1 },
];

function makeLight(role: LightRole, index: number): LightState {
  const start = STARTS[index];
  return {
    id: `light-${index + 1}`,
    role,
    color: COLORS[index],
    shape: SHAPES[index],
    x: start.x,
    y: start.y,
    previousX: start.x,
    previousY: start.y,
    trail: [start],
    mode: "formation",
    target: CORE_POINT,
    urgency: 0,
    sector: 0,
    intention: role === "guardian" ? "GUARD CORE" : role === "scout" ? "SCAN EDGES" : "SEEK ALLY",
    reason: "INSTINCT INITIALIZING",
  };
}

function boundaryCellFromIndex(index: number): Point {
  const perimeter = GRID_COLUMNS * 2 + (GRID_ROWS - 2) * 2;
  let cursor = ((index % perimeter) + perimeter) % perimeter;
  if (cursor < GRID_COLUMNS) return { x: cursor, y: 0 };
  cursor -= GRID_COLUMNS;
  if (cursor < GRID_ROWS - 2) return { x: GRID_COLUMNS - 1, y: cursor + 1 };
  cursor -= GRID_ROWS - 2;
  if (cursor < GRID_COLUMNS) return { x: GRID_COLUMNS - 1 - cursor, y: GRID_ROWS - 1 };
  cursor -= GRID_COLUMNS;
  return { x: 0, y: GRID_ROWS - 2 - cursor };
}

export function createInitialState(
  seed: number,
  strategy: CompiledStrategy,
  maxTicks = ROUND_TICKS,
): EngineState {
  let rng = seed >>> 0;
  const corruption = new Set<string>();
  for (let index = 0; index < 42; index += 1) {
    rng = lcgNext(rng);
    const point = boundaryCellFromIndex(rng);
    corruption.add(cellKey(point.x, point.y));
  }

  const roles = strategy.instincts.map((instinct) => instinct.role);
  const lights = roles.map(makeLight);
  const replayHash = hashEvent(seed >>> 0, `start|${strategyHash(strategy)}|${maxTicks}`);

  return {
    seed: seed >>> 0,
    rngState: rng,
    tick: 0,
    maxTicks,
    health: 100,
    policy: strategy.policy,
    corruption,
    lights,
    repairs: [],
    impacts: [],
    pulse: { available: true, usedAtTick: null, x: CORE_X, y: CORE_Y, sector: null, cleared: 0, shieldUntilTick: null },
    trailRepairs: 0,
    interceptClears: 0,
    manualClears: 0,
    pulseClears: 0,
    peakThreat: threatLevel(corruption),
    damageTaken: 0,
    lastEvent: null,
    ended: false,
    sharedWin: null,
    replayHash,
    possessedLightId: null,
    manualIntent: null,
    overrideTicksRemaining: OVERRIDE_MAX_TICKS,
  };
}

/** Derived round pacing from existing growth thresholds (150 / 330). */
export function phaseForTick(tick: number): RoundPhase {
  if (tick < 150) return "probe";
  if (tick < 330) return "surge";
  return "collapse";
}

export function pressureBySector(corruption: ReadonlySet<string>): number[] {
  const pressure = Array.from({ length: 8 }, () => 0);
  for (const key of corruption) {
    pressure[sectorForPoint(parseCellKey(key))] += 1;
  }
  return pressure;
}

export function worstSector(corruption: ReadonlySet<string>): number {
  const pressure = pressureBySector(corruption);
  let worst = 0;
  for (let index = 1; index < pressure.length; index += 1) {
    if (pressure[index] > pressure[worst]) worst = index;
  }
  return worst;
}

export function threatLevel(corruption: ReadonlySet<string>): number {
  let coreDanger = 0;
  for (const key of corruption) {
    if (manhattan(parseCellKey(key), CORE_POINT) <= 5) coreDanger += 1;
  }
  return clamp(Math.round(corruption.size * 0.55 + coreDanger * 5.5), 0, 100);
}

export function pulseGuidance(
  health: number,
  threat: number,
  threshold: number,
): "HOLD" | "READY" | "FIRE" {
  if (health <= threshold || threat >= 76) return "FIRE";
  if (threat >= 54 || health <= threshold + 15) return "READY";
  return "HOLD";
}

export function instinctImpact(
  interceptClears: number,
  trailRepairs: number,
  pulseClears: number,
  manualClears = 0,
): number {
  const autonomousClears = Math.max(0, interceptClears) + Math.max(0, trailRepairs);
  const totalClears = autonomousClears + Math.max(0, pulseClears) + Math.max(0, manualClears);
  return totalClears === 0 ? 0 : clamp(Math.round((autonomousClears / totalClears) * 100), 0, 100);
}

export function performanceScore(finalHealth: number, peakThreat: number, impact: number): number {
  const threatControl = 100 - clamp(peakThreat, 0, 100);
  return clamp(Math.round(clamp(finalHealth, 0, 100) * 0.55 + clamp(impact, 0, 100) * 0.25 + threatControl * 0.2), 0, 100);
}

export function performanceGrade(
  outcome: "grid-held" | "core-lost",
  score: number,
): "S" | "A" | "B" | "C" | "D" {
  if (outcome === "core-lost") return "D";
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  if (score >= 35) return "C";
  return "D";
}

function distanceToBoundary(point: Point): number {
  return Math.min(point.x, point.y, GRID_COLUMNS - 1 - point.x, GRID_ROWS - 1 - point.y);
}

export function threatUrgencyScore(coreDistance: number, engagementRadius: number, sectorPressure: number): number {
  const breachEta = Math.max(0, coreDistance - engagementRadius);
  return clamp(100 - 12 * breachEta + 3 * sectorPressure, 0, 100);
}

export function threatUrgency(point: Point, state: EngineState): number {
  const coreDistance = manhattan(point, CORE_POINT);
  const sectorPressure = pressureBySector(state.corruption)[sectorForPoint(point)];
  return threatUrgencyScore(coreDistance, state.policy.engagementRadius, sectorPressure);
}

function targetScore(light: LightState, point: Point, state: EngineState, urgency: number): number {
  const { focus, risk, entropy } = state.policy;
  const otherLights = state.lights.filter((other) => other.id !== light.id);
  const allyDistance = Math.min(...otherLights.map((ally) => manhattan(point, ally)), 20);
  const coreDistance = manhattan(point, CORE_POINT);
  const travel = manhattan(light, point);
  const coreBias = light.role === "guardian" ? 1.25 : 1;
  const edgeBias = light.role === "scout" ? 1.25 : 1;
  const linkBias = light.role === "mender" ? 1.3 : 1;
  const riskTravel = 1.2 - risk * 0.004;
  const bucket = Math.floor(state.tick / 30);
  const rawNoise = hashText(`${state.seed}|${bucket}|${light.id}|${point.x}:${point.y}`) % 2_001;
  const tieBreak = ((rawNoise - 1_000) / 1_000) * entropy * 0.7;
  const urgencyBonus = urgency * 1.4;
  return (
    travel * 20 * riskTravel +
    coreDistance * focus.core * coreBias * 0.8 +
    distanceToBoundary(point) * focus.edge * edgeBias * 0.75 +
    allyDistance * focus.link * linkBias * 0.45 +
    tieBreak -
    urgencyBonus
  );
}

function eligibleThreats(state: EngineState): Point[] {
  const maximumRange = state.policy.engagementRadius + state.policy.pursuitLimit + LOOKAHEAD_CELLS;
  return [...state.corruption]
    .map(parseCellKey)
    .filter((point) => manhattan(point, CORE_POINT) <= maximumRange);
}

const RING_DIRECTIONS: readonly Point[] = [
  { x: 2, y: 0 },
  { x: 2, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 2 },
  { x: 0, y: 2 },
  { x: -1, y: 2 },
  { x: -1, y: 1 },
  { x: -2, y: 1 },
  { x: -2, y: 0 },
  { x: -2, y: -1 },
  { x: -1, y: -1 },
  { x: -1, y: -2 },
  { x: 0, y: -2 },
  { x: 1, y: -2 },
  { x: 1, y: -1 },
  { x: 2, y: -1 },
];

function radialOffset(direction: Point, radius: number): Point {
  const magnitude = Math.hypot(direction.x, direction.y);
  return {
    x: Math.round((direction.x / magnitude) * radius),
    y: Math.round((direction.y / magnitude) * radius),
  };
}

export function formationAnchor(state: EngineState, lightIndex: number): Point {
  const { formation, engagementRadius, movementStyle, entropy } = state.policy;
  const bucketSize = movementStyle === "erratic" ? 16 : movementStyle === "organic" ? 22 : 30;
  const phase = Math.floor(state.tick / bucketSize);
  const noise = hashText(`${state.seed}|anchor|${Math.floor(state.tick / 36)}|${lightIndex}`) % 101;
  const wobbleRange = movementStyle === "erratic" ? 2 : movementStyle === "organic" ? 1 : 0;
  const wobble = entropy === 0 ? 0 : Math.round(((noise - 50) / 50) * wobbleRange);

  if (formation === "spread") {
    const anchors: readonly Point[] = [
      { x: 4, y: 4 },
      { x: GRID_COLUMNS - 5, y: 4 },
      { x: CORE_X, y: GRID_ROWS - 4 },
    ];
    return anchors[lightIndex % anchors.length];
  }

  if (formation === "link") {
    const directionIndex = (phase + lightIndex * 2 + wobble + RING_DIRECTIONS.length) % RING_DIRECTIONS.length;
    const direction = RING_DIRECTIONS[directionIndex];
    const radial = radialOffset(direction, 2 + lightIndex);
    return { x: CORE_X + radial.x, y: CORE_Y + radial.y };
  }

  if (formation === "balanced") {
    const anchors: readonly Point[] = [
      { x: CORE_X, y: CORE_Y - 4 },
      { x: CORE_X + 5, y: CORE_Y + 3 },
      { x: CORE_X - 5, y: CORE_Y + 3 },
    ];
    return anchors[(lightIndex + (movementStyle === "disciplined" ? 0 : phase)) % anchors.length];
  }

  const directionIndex = (phase + lightIndex * 5 + wobble + RING_DIRECTIONS.length * 4) % RING_DIRECTIONS.length;
  const direction = RING_DIRECTIONS[directionIndex];
  const radius = Math.max(2, Math.min(7, engagementRadius - 1));
  const offset = radialOffset(direction, radius);
  return {
    x: clamp(CORE_X + offset.x, 0, GRID_COLUMNS - 1),
    y: clamp(CORE_Y + offset.y, 0, GRID_ROWS - 1),
  };
}

type LightAssignment = Readonly<{
  target: Point;
  mode: "intercept" | "formation";
  urgency: number;
  sector: number;
  reason: string;
}>;

function assignLights(state: EngineState): ReadonlyMap<string, LightAssignment> {
  const threats = eligibleThreats(state);
  const assignments = new Map<string, LightAssignment>();
  if (threats.length > 0) {
    const sectorPressure = pressureBySector(state.corruption);
    const urgencyByCell = new Map(threats.map((point) => [
      cellKey(point.x, point.y),
      threatUrgencyScore(
        manhattan(point, CORE_POINT),
        state.policy.engagementRadius,
        sectorPressure[sectorForPoint(point)],
      ),
    ]));
    const lightOrder = state.lights
      .map((light, index) => ({
        light,
        index,
        distance: Math.min(...threats.map((point) => manhattan(light, point))),
      }))
      .filter(({ light }) => light.id !== state.possessedLightId)
      .toSorted((a, b) => a.distance - b.distance || a.index - b.index);
    const remaining = [...threats];
    for (const { light } of lightOrder.slice(0, state.policy.interceptors)) {
      const ordered = remaining.toSorted(
        (a, b) => (
          targetScore(light, a, state, urgencyByCell.get(cellKey(a.x, a.y)) ?? 0) -
          targetScore(light, b, state, urgencyByCell.get(cellKey(b.x, b.y)) ?? 0) ||
          a.y - b.y ||
          a.x - b.x
        ),
      );
      const target = ordered[0] ?? threats[0];
      assignments.set(light.id, {
        target,
        mode: "intercept",
        urgency: urgencyByCell.get(cellKey(target.x, target.y)) ?? 0,
        sector: sectorForPoint(target),
        reason: state.policy.pursuitLimit === 0
          ? `PROTECT ${state.policy.engagementRadius}-CELL · NO CHASE`
          : `PROTECT ${state.policy.engagementRadius}-CELL · CHASE +${state.policy.pursuitLimit}`,
      });
      const uniqueIndex = remaining.findIndex((point) => point.x === target.x && point.y === target.y);
      if (uniqueIndex >= 0 && remaining.length > 1) remaining.splice(uniqueIndex, 1);
    }
  }
  state.lights.forEach((light, index) => {
    if (!assignments.has(light.id)) {
      const target = formationAnchor(state, index);
      assignments.set(light.id, {
        target,
        mode: "formation",
        urgency: 0,
        sector: sectorForPoint(target),
        reason: `FORMATION · ${state.policy.formation.toUpperCase()}`,
      });
    }
  });
  return assignments;
}

function stepToward(light: LightState, target: Point, state: EngineState): Point {
  const dx = Math.sign(target.x - light.x);
  const dy = Math.sign(target.y - light.y);
  const tie = hashText(`${state.seed}|step|${state.tick}|${light.id}|${state.policy.movementStyle}`);
  const preferX = Math.abs(target.x - light.x) > Math.abs(target.y - light.y) ||
    (Math.abs(target.x - light.x) === Math.abs(target.y - light.y) && (tie & 1) === 0);
  return preferX && dx !== 0
    ? { x: light.x + dx, y: light.y }
    : dy !== 0
      ? { x: light.x, y: light.y + dy }
      : dx !== 0
        ? { x: light.x + dx, y: light.y }
        : { x: light.x, y: light.y };
}

function growCorruption(
  corruption: Set<string>,
  rngState: number,
  tick: number,
): { corruption: Set<string>; rngState: number } {
  if (tick % 3 !== 0 || corruption.size === 0) return { corruption, rngState };
  const growthCount = 1 + Number(tick >= 150) + Number(tick >= 330);
  let rng = rngState;
  const grown = new Set(corruption);
  const sources = [...corruption].map(parseCellKey);
  const front = sources
    .toSorted((a, b) => manhattan(a, CORE_POINT) - manhattan(b, CORE_POINT) || a.y - b.y || a.x - b.x)
    .slice(0, Math.min(12, sources.length));

  for (let growth = 0; growth < growthCount; growth += 1) {
    rng = lcgNext(rng);
    const sourcePool = (rng & 3) === 0 ? sources : front;
    const source = sourcePool[rng % sourcePool.length];
    const options: Point[] = [
      { x: source.x + Math.sign(CORE_X - source.x), y: source.y },
      { x: source.x, y: source.y + Math.sign(CORE_Y - source.y) },
      { x: source.x + 1, y: source.y },
      { x: source.x - 1, y: source.y },
      { x: source.x, y: source.y + 1 },
      { x: source.x, y: source.y - 1 },
    ].filter((point) => isInsideGrid(point.x, point.y));
    const candidate = options[(rng >>> 8) % options.length];
    grown.add(cellKey(candidate.x, candidate.y));
  }
  return { corruption: grown, rngState: rng };
}

function distinctTrailOwnersNear(point: Point, lights: readonly LightState[]): number {
  let owners = 0;
  for (const light of lights) {
    if (light.trail.some((trailPoint) => manhattan(point, trailPoint) <= 1)) owners += 1;
  }
  return owners;
}

function resolveRepairs(
  corruption: Set<string>,
  lights: readonly LightState[],
  tick: number,
  policy: StrategyPolicy,
): { corruption: Set<string>; repairPoints: Point[] } {
  const repairInterval = policy.focus.link >= 50 ? 10 : policy.focus.link >= 25 ? 15 : 20;
  if (tick % repairInterval !== 0) return { corruption, repairPoints: [] };
  const remaining = new Set(corruption);
  const repairPoints: Point[] = [];
  for (const key of corruption) {
    const point = parseCellKey(key);
    if (distinctTrailOwnersNear(point, lights) >= 2) {
      repairPoints.push(point);
    }
  }
  repairPoints.sort(
    (a, b) => manhattan(a, CORE_POINT) - manhattan(b, CORE_POINT) || a.y - b.y || a.x - b.x,
  );
  const bounded = repairPoints.slice(0, 1);
  bounded.forEach((point) => remaining.delete(cellKey(point.x, point.y)));
  return { corruption: remaining, repairPoints: bounded };
}

function moveLights(state: EngineState, rngState: number): {
  lights: LightState[];
  rngState: number;
  replayHash: number;
  manualIntent: ManualIntent | null;
} {
  if (state.tick % 2 !== 0) {
    return { lights: [...state.lights], rngState, replayHash: state.replayHash, manualIntent: state.manualIntent };
  }
  const assignments = assignLights(state);
  const occupied = new Set<string>();
  let replayHash = state.replayHash;
  let consumedManual = false;
  const lights = state.lights.map((light) => {
    if (light.id === state.possessedLightId) {
      const intent = state.manualIntent;
      let point = { x: light.x, y: light.y };
      if (intent && (intent.dx !== 0 || intent.dy !== 0)) {
        const next = {
          x: clamp(light.x + intent.dx, 0, GRID_COLUMNS - 1),
          y: clamp(light.y + intent.dy, 0, GRID_ROWS - 1),
        };
        if (!occupied.has(cellKey(next.x, next.y))) point = next;
        replayHash = hashEvent(replayHash, `manual|${state.tick}|${light.id}|${intent.dx},${intent.dy}`);
        consumedManual = true;
      }
      occupied.add(cellKey(point.x, point.y));
      return {
        ...light,
        previousX: light.x,
        previousY: light.y,
        x: point.x,
        y: point.y,
        trail: [...light.trail, point].slice(-64),
        mode: "manual" as const,
        target: point,
        urgency: 0,
        sector: sectorForPoint(point),
        intention: `MANUAL / ${point.x}:${point.y}`,
        reason: "POSSESSED · WASD",
      };
    }

    const assignment = assignments.get(light.id) ?? {
      target: CORE_POINT,
      mode: "formation" as const,
      urgency: 0,
      sector: 0,
      reason: "FORMATION · CORE",
    };
    let point = stepToward(light, assignment.target, state);
    if (occupied.has(cellKey(point.x, point.y))) point = { x: light.x, y: light.y };
    occupied.add(cellKey(point.x, point.y));
    const trail = [...light.trail, point].slice(-64);
    const intention = assignment.mode === "intercept"
      ? `INTERCEPT / ${assignment.target.x}:${assignment.target.y}`
      : `RETURN / ${state.policy.formation.toUpperCase()}`;
    return {
      ...light,
      previousX: light.x,
      previousY: light.y,
      x: point.x,
      y: point.y,
      trail,
      mode: assignment.mode,
      target: assignment.target,
      urgency: assignment.urgency,
      sector: assignment.sector,
      intention,
      reason: assignment.reason,
    };
  });
  return {
    lights,
    rngState,
    replayHash,
    manualIntent: consumedManual ? null : state.manualIntent,
  };
}

function resolveIntercepts(
  corruption: Set<string>,
  lights: readonly LightState[],
  tick: number,
  policy: StrategyPolicy,
): ClearResolution {
  const remaining = new Set(corruption);
  const autonomousPoints: Point[] = [];
  const manualPoints: Point[] = [];
  const maximumClearRange = policy.engagementRadius + policy.pursuitLimit;

  for (const light of lights) {
    if (light.mode === "manual") {
      // Scarce override: clear only the occupied cell on every logical tick.
      const key = cellKey(light.x, light.y);
      if (remaining.has(key)) {
        remaining.delete(key);
        manualPoints.push({ x: light.x, y: light.y });
      }
      continue;
    }

    if (light.mode !== "intercept") continue;
    if (tick % 4 !== 0) continue;

    const target = [...remaining]
      .map(parseCellKey)
      .filter((point) =>
        manhattan(light, point) <= 3
        && manhattan(point, CORE_POINT) <= maximumClearRange
      )
      .toSorted((a, b) => (
        manhattan(a, CORE_POINT) - manhattan(b, CORE_POINT) ||
        manhattan(light, a) - manhattan(light, b) ||
        a.y - b.y ||
        a.x - b.x
      ))[0];
    if (!target) continue;
    const key = cellKey(target.x, target.y);
    remaining.delete(key);
    autonomousPoints.push(target);
  }
  return { corruption: remaining, autonomousPoints, manualPoints };
}

export function exposureDamage(corruptionSize: number, defenders: number, tick: number): number {
  if (tick % 15 !== 0 || corruptionSize < 70 || defenders >= 2) return 0;
  return defenders === 0 ? 2 : 1;
}

function coreDamage(corruption: ReadonlySet<string>, lights: readonly LightState[], tick: number): number {
  if (tick % 3 !== 0) return 0;
  let danger = 0;
  for (const key of corruption) {
    if (manhattan(parseCellKey(key), CORE_POINT) <= 4) danger += 1;
  }
  const localBreach = Math.ceil(danger / 2);
  const networkOverload = corruption.size >= 130 ? Math.ceil((corruption.size - 120) / 40) : 0;
  const defenders = lights.filter((light) => manhattan(light, CORE_POINT) <= 6).length;
  const exposure = exposureDamage(corruption.size, defenders, tick);
  return Math.min(7, Math.max(localBreach, networkOverload, exposure));
}

function stateEvent(
  tick: number,
  health: number,
  corruption: ReadonlySet<string>,
  lights: readonly LightState[],
  repairCount: number,
  interceptCount: number,
  manualCount: number,
  pulseClears: number,
  overrideRemaining: number,
  possessedLightId: string | null,
): string {
  const positions = lights.map((light) => `${light.id}:${light.x},${light.y}`).join(";");
  return [
    tick,
    health,
    corruption.size,
    positions,
    repairCount,
    interceptCount,
    manualCount,
    pulseClears,
    overrideRemaining,
    possessedLightId ?? "none",
  ].join("|");
}

function releasePossession(
  state: EngineState,
  reason: "manual" | "auto",
  atTick = state.tick,
): EngineState {
  if (state.possessedLightId === null) return state;
  const releasedId = state.possessedLightId;
  return {
    ...state,
    possessedLightId: null,
    manualIntent: null,
    lights: state.lights.map((light) => (
      light.id === releasedId
        ? {
            ...light,
            mode: "formation" as const,
            reason: reason === "auto" ? "OVERRIDE EXHAUSTED" : "RELEASED · RETURNING",
          }
        : light
    )),
    replayHash: hashEvent(
      state.replayHash,
      reason === "auto"
        ? `override-release|${atTick}|auto`
        : `possess|${atTick}|none`,
    ),
  };
}

export function setPossession(state: EngineState, lightId: string | null): EngineState {
  if (state.ended) return state;
  if (lightId === null) return releasePossession(state, "manual");
  if (!state.lights.some((light) => light.id === lightId)) return state;
  if (state.possessedLightId === lightId) return state;
  if (state.overrideTicksRemaining <= 0) return state;
  return {
    ...state,
    possessedLightId: lightId,
    manualIntent: null,
    lights: state.lights.map((light) => {
      if (light.id === lightId) {
        return {
          ...light,
          mode: "manual" as const,
          intention: `MANUAL / ${light.x}:${light.y}`,
          reason: "POSSESSED · WASD",
        };
      }
      if (state.possessedLightId !== null && light.id === state.possessedLightId) {
        return {
          ...light,
          mode: "formation" as const,
          reason: "RELEASED · RETURNING",
        };
      }
      return light;
    }),
    replayHash: hashEvent(state.replayHash, `possess|${state.tick}|${lightId}`),
  };
}

export function queueManualIntent(state: EngineState, intent: ManualIntent): EngineState {
  if (state.ended || state.possessedLightId === null) return state;
  if (intent.dx !== 0 && intent.dy !== 0) return state;
  if (intent.dx === 0 && intent.dy === 0) return state;
  if (state.manualIntent?.dx === intent.dx && state.manualIntent?.dy === intent.dy) return state;
  return { ...state, manualIntent: intent };
}

export function advanceTick(state: EngineState): EngineState {
  if (state.ended) return state;
  const tick = state.tick + 1;
  const wasPossessed = state.possessedLightId !== null;
  let overrideTicksRemaining = state.overrideTicksRemaining;
  let replayBase = state.replayHash;

  if (wasPossessed) {
    overrideTicksRemaining = Math.max(0, overrideTicksRemaining - 1);
    replayBase = hashEvent(
      replayBase,
      `override-tick|${tick}|${overrideTicksRemaining}`,
    );
  }

  const grown = growCorruption(new Set(state.corruption), state.rngState, tick);
  const provisional: EngineState = {
    ...state,
    tick,
    corruption: grown.corruption,
    overrideTicksRemaining,
    replayHash: replayBase,
  };
  const moved = moveLights(provisional, grown.rngState);
  const cleared = resolveIntercepts(grown.corruption, moved.lights, tick, state.policy);
  const repaired = resolveRepairs(cleared.corruption, moved.lights, tick, state.policy);
  const pulseShielded = state.pulse.shieldUntilTick !== null && tick <= state.pulse.shieldUntilTick;
  const damage = pulseShielded ? 0 : coreDamage(repaired.corruption, moved.lights, tick);
  const health = clamp(state.health - damage, 0, 100);
  const ended = health === 0 || tick >= state.maxTicks;
  const repairs = [
    ...state.repairs.filter((repair) => tick - repair.bornAtTick <= 10),
    ...repaired.repairPoints.map((point) => ({ ...point, bornAtTick: tick })),
  ];
  const impacts = [
    ...state.impacts.filter((impact) => tick - impact.bornAtTick <= 10),
    ...cleared.autonomousPoints.map((point) => ({ ...point, bornAtTick: tick, kind: "intercept" as const })),
    ...cleared.manualPoints.map((point) => ({ ...point, bornAtTick: tick, kind: "manual" as const })),
    ...(damage > 0 ? [{ ...CORE_POINT, bornAtTick: tick, kind: "damage" as const }] : []),
  ];
  const currentThreat = threatLevel(repaired.corruption);
  const guidance = pulseGuidance(health, currentThreat, state.policy.pulseHealthThreshold);
  let lastEvent: GameEvent | null = state.lastEvent;
  if (damage > 0) {
    lastEvent = { tick, kind: "damage", message: `CORE HIT · -${damage} HEALTH` };
  } else if (cleared.manualPoints.length > 0) {
    lastEvent = {
      tick,
      kind: "intercept",
      message: `OVERRIDE · ${cleared.manualPoints.length} CORRUPTION CLEARED`,
    };
  } else if (cleared.autonomousPoints.length > 0) {
    lastEvent = {
      tick,
      kind: "intercept",
      message: `INTERCEPT · ${cleared.autonomousPoints.length} CORRUPTION CLEARED`,
    };
  } else if (repaired.repairPoints.length > 0) {
    lastEvent = { tick, kind: "repair", message: `TRAIL STITCH · +${repaired.repairPoints.length} REPAIR` };
  } else if (guidance === "FIRE" && state.pulse.available && state.lastEvent?.kind !== "warning") {
    lastEvent = { tick, kind: "warning", message: "PULSE WINDOW CRITICAL" };
  }

  let next: EngineState = {
    ...state,
    tick,
    rngState: moved.rngState,
    health,
    corruption: repaired.corruption,
    lights: moved.lights,
    repairs,
    impacts,
    trailRepairs: state.trailRepairs + repaired.repairPoints.length,
    interceptClears: state.interceptClears + cleared.autonomousPoints.length,
    manualClears: state.manualClears + cleared.manualPoints.length,
    peakThreat: Math.max(state.peakThreat, currentThreat),
    damageTaken: state.damageTaken + damage,
    lastEvent,
    ended,
    sharedWin: ended ? health > 0 && tick >= state.maxTicks : null,
    replayHash: moved.replayHash,
    manualIntent: moved.manualIntent,
    overrideTicksRemaining,
    possessedLightId: state.possessedLightId,
  };

  if (wasPossessed && overrideTicksRemaining === 0) {
    next = releasePossession(next, "auto", tick);
  }

  const replayHash = hashEvent(
    next.replayHash,
    stateEvent(
      tick,
      health,
      repaired.corruption,
      next.lights,
      repaired.repairPoints.length,
      cleared.autonomousPoints.length,
      cleared.manualPoints.length,
      state.pulseClears,
      overrideTicksRemaining,
      next.possessedLightId,
    ),
  );

  return { ...next, replayHash };
}

export function activatePulse(state: EngineState): EngineState {
  if (state.ended || !state.pulse.available) return state;
  const sector = worstSector(state.corruption);
  const center = sectorCenter(sector);
  const corruption = new Set(state.corruption);
  const targets = [...state.corruption]
    .map(parseCellKey)
    .filter((point) => sectorForPoint(point) === sector)
    .toSorted((a, b) => (
      manhattan(a, CORE_POINT) - manhattan(b, CORE_POINT) ||
      manhattan(a, center) - manhattan(b, center) ||
      a.y - b.y ||
      a.x - b.x
    ))
    .slice(0, PULSE_CLEAR_CAP);
  targets.forEach((point) => corruption.delete(cellKey(point.x, point.y)));
  const cleared = targets.length;
  return {
    ...state,
    corruption,
    pulse: {
      available: false,
      usedAtTick: state.tick,
      x: center.x,
      y: center.y,
      sector,
      cleared,
      shieldUntilTick: state.tick + PULSE_SHIELD_TICKS,
    },
    impacts: [
      ...state.impacts,
      ...targets.map((point) => ({ ...point, bornAtTick: state.tick, kind: "pulse" as const })),
    ],
    pulseClears: state.pulseClears + cleared,
    lastEvent: { tick: state.tick, kind: "pulse", message: `PULSE S${sector + 1} · ${cleared} CLEARED · 1.2S SHIELD` },
    replayHash: hashEvent(state.replayHash, `pulse|${state.tick}|${sector}|${cleared}`),
  };
}

export function runToEnd(
  initial: EngineState,
  pulseAtTick: number | null = null,
): EngineState {
  let state = initial;
  while (!state.ended) {
    if (pulseAtTick !== null && state.tick === pulseAtTick) state = activatePulse(state);
    state = advanceTick(state);
  }
  return state;
}

export function createReceipt(state: EngineState, strategy: CompiledStrategy): RoundReceipt {
  if (!state.ended || state.sharedWin === null) {
    throw new Error("A receipt requires a resolved round.");
  }
  const outcome = state.sharedWin ? "grid-held" : "core-lost";
  const impact = instinctImpact(
    state.interceptClears,
    state.trailRepairs,
    state.pulseClears,
    state.manualClears,
  );
  const score = performanceScore(state.health, state.peakThreat, impact);
  return {
    engineVersion: ENGINE_VERSION,
    seed: state.seed,
    strategyHash: strategyHash(strategy),
    ticks: state.tick,
    outcome,
    finalHealth: state.health,
    trailRepairs: state.trailRepairs,
    interceptClears: state.interceptClears,
    manualClears: state.manualClears,
    pulseClears: state.pulseClears,
    peakThreat: state.peakThreat,
    damageTaken: state.damageTaken,
    instinctImpact: impact,
    gradeScore: score,
    grade: performanceGrade(outcome, score),
    replayHash: hexHash(state.replayHash),
  };
}
