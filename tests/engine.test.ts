import { describe, expect, it } from "vitest";
import golden from "../validation/causal_strategy_golden.json";
import {
  activatePulse,
  advanceTick,
  createInitialState,
  createReceipt,
  exposureDamage,
  formationAnchor,
  instinctImpact,
  performanceGrade,
  performanceScore,
  pulseGuidance,
  runToEnd,
  threatLevel,
  threatUrgencyScore,
} from "../src/game/engine";
import { compileStrategy, DEFAULT_STRATEGY, STRATEGY_EXAMPLES } from "../src/game/strategy";
import {
  GRID_COLUMNS,
  GRID_ROWS,
  LOOKAHEAD_CELLS,
  PULSE_CLEAR_CAP,
  PULSE_SHIELD_TICKS,
  ROUND_SECONDS,
  ROUND_TICKS,
  TICK_RATE,
} from "../src/game/types";
import { parseCellKey } from "../src/game/math";

const strategy = compileStrategy(DEFAULT_STRATEGY);

describe("GRIDWAKE local deterministic engine", () => {
  it("produces the same final state and receipt for the same inputs", () => {
    const first = runToEnd(createInitialState(42, strategy, 180), 90);
    const second = runToEnd(createInitialState(42, strategy, 180), 90);
    expect(first).toEqual(second);
    expect(createReceipt(first, strategy)).toEqual(createReceipt(second, strategy));
  });

  it("changes the replay identity when the seed changes", () => {
    const first = runToEnd(createInitialState(42, strategy, 180), 90);
    const second = runToEnd(createInitialState(43, strategy, 180), 90);
    expect(first.replayHash).not.toBe(second.replayHash);
  });

  it("accepts exactly one pulse", () => {
    const initial = createInitialState(7, strategy, 120);
    const first = activatePulse(initial);
    const second = activatePulse(first);
    expect(first.pulse.available).toBe(false);
    expect(second).toBe(first);
  });

  it("runs a fast 45-second default round", () => {
    expect(ROUND_TICKS).toBe(ROUND_SECONDS * TICK_RATE);
  });

  it("keeps all canonical values inside bounds", () => {
    let state = createInitialState(99, strategy, 240);
    while (!state.ended) {
      state = advanceTick(state);
      expect(state.health).toBeGreaterThanOrEqual(0);
      expect(state.health).toBeLessThanOrEqual(100);
      for (const key of state.corruption) {
        const point = parseCellKey(key);
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThan(GRID_COLUMNS);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThan(GRID_ROWS);
      }
      for (const light of state.lights) {
        expect(light.x).toBeGreaterThanOrEqual(0);
        expect(light.x).toBeLessThan(GRID_COLUMNS);
        expect(light.y).toBeGreaterThanOrEqual(0);
        expect(light.y).toBeLessThan(GRID_ROWS);
      }
    }
  });

  it("rejects an empty strategy and clamps an explicit pulse threshold", () => {
    expect(() => compileStrategy("   ")).toThrow(/one sentence/i);
    expect(() => compileStrategy("make something beautiful and surprising")).toThrow(/movement or protection/i);
    expect(compileStrategy("Hold pulse under 99%").policy.pulseHealthThreshold).toBe(80);
    expect(compileStrategy("Hold pulse below 2%").policy.pulseHealthThreshold).toBe(15);
  });

  it("refuses to produce a receipt before resolution", () => {
    expect(() => createReceipt(createInitialState(1, strategy, 60), strategy)).toThrow(/resolved/i);
  });

  it("keeps focus allocation bounded and exactly conserved", () => {
    for (const example of STRATEGY_EXAMPLES) {
      const focus = compileStrategy(example.source).policy.focus;
      expect(focus.core + focus.edge + focus.link).toBe(100);
      expect(Object.values(focus).every((value) => value >= 0 && value <= 100)).toBe(true);
    }
  });

  it("matches the independent Python policy, guidance, and grade vectors", () => {
    for (const vector of golden.policies) {
      expect(compileStrategy(vector.source).policy).toEqual(vector.policy);
    }
    for (const vector of golden.guidance) {
      expect(pulseGuidance(vector.health, vector.threat, vector.threshold)).toBe(vector.result);
    }
    for (const vector of golden.exposure) {
      expect(exposureDamage(vector.corruptionSize, vector.defenders, vector.tick)).toBe(vector.result);
    }
    for (const vector of golden.urgency) {
      expect(threatUrgencyScore(vector.coreDistance, vector.engagementRadius, vector.sectorPressure)).toBe(vector.result);
    }
    expect(golden.pulse.clearCap).toBe(PULSE_CLEAR_CAP);
    expect(golden.pulse.shieldTicks).toBe(PULSE_SHIELD_TICKS);
    for (const vector of golden.grades) {
      const score = performanceScore(vector.health, vector.peakThreat, vector.instinctImpact);
      expect(score).toBe(vector.score);
      expect(performanceGrade(vector.outcome as "grid-held" | "core-lost", score)).toBe(vector.result);
    }
  });

  it("bounds Instinct contribution and exposes the grade formula", () => {
    expect(instinctImpact(0, 0, 0)).toBe(0);
    expect(instinctImpact(8, 2, 5)).toBe(67);
    expect(instinctImpact(20, 0, 0)).toBe(100);
    expect(performanceScore(80, 40, 80)).toBe(76);
    expect(performanceGrade("grid-held", 76)).toBe("A");
    expect(performanceGrade("core-lost", 100)).toBe("D");
  });

  it("changes tactics, not the world seed, when the prompt changes", () => {
    const compiled = STRATEGY_EXAMPLES.map((example) => compileStrategy(example.source));
    const rounds = compiled.map((policy) => runToEnd(createInitialState(2_654_483_283, policy, 180), 90));
    expect(new Set(rounds.map((round) => round.seed))).toEqual(new Set([2_654_483_283]));
    const paths = rounds.map((round) => round.lights.map((light) => light.trail.map((point) => `${point.x}:${point.y}`).join(",")).join("|"));
    expect(new Set(paths).size).toBe(STRATEGY_EXAMPLES.length);
  });

  it("compiles the circle, 10%, two-interceptor, no-chase instruction into bounded behavior", () => {
    const policy = compileStrategy(
      "Go in circles around the light and only kill anything that gets close within 10% of its radius. Send two and do not chase.",
    ).policy;
    expect(policy.formation).toBe("ring");
    expect(policy.engagementRadius).toBe(4);
    expect(policy.interceptors).toBe(2);
    expect(policy.pursuitLimit).toBe(0);
  });

  it("uses controlled entropy to vary paths without changing action bounds", () => {
    const disciplined = compileStrategy("Circle the core precisely. Send two units within 40% and do not chase.");
    const erratic = compileStrategy("Circle the core unpredictably. Send two units within 40% and do not chase.");
    const first = runToEnd(createInitialState(88, disciplined, 180));
    const second = runToEnd(createInitialState(88, erratic, 180));
    const path = (state: typeof first) => state.lights.map((light) => light.trail.map((point) => `${point.x}:${point.y}`).join(",")).join("|");
    expect(path(first)).not.toBe(path(second));
    expect(disciplined.policy.interceptors).toBe(erratic.policy.interceptors);
    expect(disciplined.policy.engagementRadius).toBe(erratic.policy.engagementRadius);
    expect(disciplined.policy.pursuitLimit).toBe(erratic.policy.pursuitLimit);
  });

  it("returns lights to bounded formation anchors when no legal threat is available", () => {
    const ring = compileStrategy("Circle the light precisely, send two units within 10%, and do not chase.");
    let state = createInitialState(5, ring, 20);
    state = { ...state, corruption: new Set(["0:0"]) };
    state = advanceTick(state);
    state = advanceTick(state);
    expect(state.lights.every((light) => light.intention.startsWith("RETURN"))).toBe(true);
    state.lights.forEach((light, index) => {
      const anchor = formationAnchor(state, index);
      expect(anchor.x).toBeGreaterThanOrEqual(0);
      expect(anchor.x).toBeLessThan(GRID_COLUMNS);
      expect(anchor.y).toBeGreaterThanOrEqual(0);
      expect(anchor.y).toBeLessThan(GRID_ROWS);
    });
  });

  it("stages for a predicted breach while keeping zero-pursuit clears inside the protected radius", () => {
    const ring = compileStrategy("Circle the light precisely, send two units within 10%, and do not chase.");
    let state = createInitialState(5, ring, 20);
    const stagedThreat = `${15 + ring.policy.engagementRadius + LOOKAHEAD_CELLS}:9`;
    state = { ...state, corruption: new Set([stagedThreat]) };
    state = advanceTick(state);
    state = advanceTick(state);
    expect(state.lights.filter((light) => light.mode === "intercept")).toHaveLength(2);
    expect(state.lights.filter((light) => light.mode === "intercept").every((light) => light.reason.includes("4-CELL"))).toBe(true);

    state = {
      ...state,
      tick: 5,
      corruption: new Set([`${15 + ring.policy.engagementRadius + 1}:9`]),
    };
    const advanced = advanceTick(state);
    expect(advanced.corruption.has(`${15 + ring.policy.engagementRadius + 1}:9`)).toBe(true);
  });

  it("keeps Pulse clears separate from trail repairs in state and receipt", () => {
    let state = createInitialState(42, strategy, 60);
    state = activatePulse(state);
    state = runToEnd(state);
    const receipt = createReceipt(state, strategy);
    expect(receipt.pulseClears).toBe(state.pulse.cleared);
    expect(receipt.trailRepairs).toBe(state.trailRepairs);
  });

  it("caps Pulse to six closest threats and shields for exactly 1.2 seconds", () => {
    const initial = createInitialState(42, strategy, 60);
    const corruption = new Set<string>();
    for (let x = 15; x < 25; x += 1) {
      for (let y = 9; y < 15; y += 1) corruption.add(`${x}:${y}`);
    }
    const pulsed = activatePulse({ ...initial, tick: 7, corruption });
    expect(pulsed.pulse.cleared).toBe(PULSE_CLEAR_CAP);
    expect(pulsed.pulse.cleared).toBeLessThanOrEqual(6);
    expect((pulsed.pulse.shieldUntilTick ?? 0) - (pulsed.pulse.usedAtTick ?? 0)).toBe(PULSE_SHIELD_TICKS);
  });

  it("makes the canonical defensive Instinct contribute more clears than guided Pulse on average", () => {
    const ring = compileStrategy(STRATEGY_EXAMPLES[3].source);
    const rounds = Array.from({ length: 8 }, (_, index) => {
      let state = createInitialState(0x9e3779b9 + (index + 1) * 7_919, ring);
      while (!state.ended) {
        const threat = threatLevel(state.corruption);
        if (state.pulse.available && (state.health <= ring.policy.pulseHealthThreshold || threat >= 76)) {
          state = activatePulse(state);
        }
        state = advanceTick(state);
      }
      return state;
    });
    const autonomous = rounds.reduce((sum, state) => sum + state.interceptClears + state.trailRepairs, 0);
    const pulse = rounds.reduce((sum, state) => sum + state.pulseClears, 0);
    expect(autonomous).toBeGreaterThan(pulse);
  });

  it("makes full-squad edge coverage pay a measurable core-exposure cost", () => {
    const edge = compileStrategy(STRATEGY_EXAMPLES[1].source);
    const state = runToEnd(createInitialState(2_654_483_283, edge));
    expect(state.interceptClears).toBeGreaterThan(0);
    expect(state.health).toBeLessThan(100);
    expect(exposureDamage(70, 0, 15)).toBe(2);
    expect(exposureDamage(70, 2, 15)).toBe(0);
  });
});
