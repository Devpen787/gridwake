import { describe, expect, it } from "vitest";
import { advanceTick, createInitialState, formationAnchor } from "../src/game/engine";
import { manhattan, parseCellKey } from "../src/game/math";
import { compileStrategy, DEFAULT_STRATEGY } from "../src/game/strategy";
import { CORE_X, GRID_COLUMNS, GRID_ROWS, type EngineState, type LightState } from "../src/game/types";

const strategy = compileStrategy(DEFAULT_STRATEGY);

function advance(state: EngineState, ticks: number): EngineState {
  let next = state;
  for (let index = 0; index < ticks; index += 1) next = advanceTick(next);
  return next;
}

describe("moving front arena", () => {
  it("initializes a deterministic tunnel with a distinct replay identity", () => {
    const first = createInitialState(0x5eed, strategy, 120, "tunnel");
    const second = createInitialState(0x5eed, strategy, 120, "tunnel");
    const bastion = createInitialState(0x5eed, strategy, 120);

    expect(first).toEqual(second);
    expect(first.arena.mode).toBe("tunnel");
    expect(first.arena.distance).toBe(0);
    expect(first.replayHash).not.toBe(bastion.replayHash);
    expect([...first.corruption].map(parseCellKey).every((point) => point.x > CORE_X)).toBe(true);
  });

  it("moves the tunnel front left, advances distance, and stays in bounds", () => {
    const initial = createInitialState(0x71a11e, strategy, 120, "tunnel");
    const before = [...initial.corruption].map(parseCellKey);
    const shifted = advance(initial, 6);

    expect(shifted.arena.distance).toBe(1);
    expect(before.some((point) => shifted.corruption.has(`${point.x - 1}:${point.y}`))).toBe(true);
    for (const key of shifted.corruption) {
      const point = parseCellKey(key);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThan(GRID_COLUMNS);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThan(GRID_ROWS);
    }
  });
});

describe("role agency and movement stability", () => {
  it("keeps balanced role anchors local instead of rotating roles across the arena", () => {
    const balanced = compileStrategy("Hold a balanced organic formation around the core.");
    const start = createInitialState(42, balanced, 120);
    const later = { ...start, tick: 22 };

    start.lights.forEach((_, index) => {
      expect(manhattan(formationAnchor(start, index), formationAnchor(later, index))).toBeLessThanOrEqual(2);
    });
  });

  it("does not let two autonomous lights swap occupied cells", () => {
    const initial = createInitialState(91, strategy, 120);
    const positions = [
      { x: 5, y: 4 },
      { x: 4, y: 4 },
      { x: 15, y: 14 },
    ];
    const lights = initial.lights.map((light, index): LightState => ({
      ...light,
      ...positions[index],
      previousX: positions[index]!.x,
      previousY: positions[index]!.y,
      trail: [positions[index]!],
    }));
    const arranged: EngineState = {
      ...initial,
      tick: 1,
      corruption: new Set(),
      plan: undefined,
      policy: { ...initial.policy, formation: "spread", interceptors: 0 },
      lights,
    };
    const moved = advanceTick(arranged);

    expect(moved.lights.map((light) => `${light.x}:${light.y}`)).not.toEqual(["4:4", "5:4", "15:14"]);
    expect(new Set(moved.lights.map((light) => `${light.x}:${light.y}`)).size).toBe(moved.lights.length);
  });

  it("keeps a Scout on a valid target instead of switching on every decision", () => {
    const initial = createInitialState(17, strategy, 120);
    const scout: LightState = {
      ...initial.lights[1]!,
      x: 14,
      y: 9,
      previousX: 13,
      previousY: 9,
      mode: "intercept",
      target: { x: 16, y: 9 },
      trail: [{ x: 13, y: 9 }, { x: 14, y: 9 }],
    };
    const hunting: EngineState = {
      ...initial,
      tick: 1,
      plan: undefined,
      lights: [scout],
      corruption: new Set(["16:9", "15:8"]),
      policy: { ...initial.policy, interceptors: 1 },
    };
    const moved = advanceTick(hunting);

    expect(moved.lights[0]?.target).toEqual({ x: 16, y: 9 });
  });

  it("keeps named role instructions on the named lights", () => {
    const divided = compileStrategy(
      "Guardian holds the core. Scout hunts the highest-pressure sector aggressively. Mender repairs shared trails.",
    );
    const moved = advance(createInitialState(23, divided, 120, "tunnel"), 2);
    const guardian = moved.lights.find((light) => light.role === "guardian");
    const scout = moved.lights.find((light) => light.role === "scout");
    const mender = moved.lights.find((light) => light.role === "mender");

    expect(guardian?.mode).toBe("formation");
    expect(guardian?.reason).toContain("GUARD");
    expect(scout?.mode).toBe("intercept");
    expect(scout?.intention).toContain("HUNT");
    expect(mender?.mode).toBe("formation");
    expect(mender?.reason).toContain("MENDER");
  });
});
