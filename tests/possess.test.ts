import { describe, expect, it } from "vitest";
import {
  advanceTick,
  createInitialState,
  queueManualIntent,
  setPossession,
} from "../src/game/engine";
import { compileStrategy, DEFAULT_STRATEGY } from "../src/game/strategy";

const strategy = compileStrategy(DEFAULT_STRATEGY);

function step(state: ReturnType<typeof createInitialState>, count = 1) {
  let next = state;
  for (let index = 0; index < count; index += 1) next = advanceTick(next);
  return next;
}

describe("possess light override", () => {
  it("holds still while possessed with no input", () => {
    let state = createInitialState(11, strategy, 40);
    const light = state.lights[0];
    state = setPossession(state, light.id);
    const before = state.lights[0];
    state = step(state, 4);
    const after = state.lights.find((candidate) => candidate.id === light.id)!;
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
    expect(after.mode).toBe("manual");
  });

  it("moves one cell per move tick when intent is queued", () => {
    let state = createInitialState(11, strategy, 40);
    const light = state.lights[0];
    state = setPossession(state, light.id);
    // Land on an even tick so the next advance applies movement.
    while (state.tick % 2 !== 1) state = advanceTick(state);
    const origin = state.lights.find((candidate) => candidate.id === light.id)!;
    state = queueManualIntent(state, { dx: 1, dy: 0 });
    state = advanceTick(state);
    const moved = state.lights.find((candidate) => candidate.id === light.id)!;
    expect(moved.x).toBe(origin.x + 1);
    expect(moved.y).toBe(origin.y);
    expect(state.manualIntent).toBeNull();
  });

  it("releases possession and returns the light to autopilot", () => {
    let state = createInitialState(11, strategy, 80);
    const lightId = state.lights[0].id;
    state = setPossession(state, lightId);
    state = step(state, 6);
    expect(state.lights.find((light) => light.id === lightId)?.mode).toBe("manual");
    state = setPossession(state, null);
    expect(state.possessedLightId).toBeNull();
    state = step(state, 4);
    expect(state.lights.find((light) => light.id === lightId)?.mode).not.toBe("manual");
  });

  it("hashes identical manual sequences the same way and diverges otherwise", () => {
    function drive(rightSteps: number) {
      let state = createInitialState(11, strategy, 60);
      const lightId = state.lights[0].id;
      state = setPossession(state, lightId);
      while (state.tick % 2 !== 1) state = advanceTick(state);
      for (let index = 0; index < rightSteps; index += 1) {
        state = queueManualIntent(state, { dx: 1, dy: 0 });
        state = advanceTick(state);
        state = advanceTick(state);
      }
      return state.replayHash;
    }
    expect(drive(3)).toBe(drive(3));
    expect(drive(3)).not.toBe(drive(4));
  });

  it("ignores diagonal and empty intents", () => {
    let state = createInitialState(11, strategy, 40);
    state = setPossession(state, state.lights[0].id);
    const blocked = queueManualIntent(state, { dx: 1, dy: 1 });
    expect(blocked).toBe(state);
    const empty = queueManualIntent(state, { dx: 0, dy: 0 });
    expect(empty).toBe(state);
  });

  it("clears the corruption cell under a possessed light on the next clear tick", () => {
    const ring = compileStrategy(
      "Guard the core in a tight disciplined ring. Send two units within 25% and do not chase. Pulse below 45% health.",
    );
    let state = createInitialState(11, ring, 80);
    const lightId = state.lights[0].id;
    const edgeKey = [...state.corruption].find((key) => {
      const [x, y] = key.split(":").map(Number);
      return Math.abs(x - 15) + Math.abs(y - 9) > 10;
    });
    expect(edgeKey).toBeTruthy();
    const [edgeX, edgeY] = edgeKey!.split(":").map(Number);

    // Seed a denser local cluster so old core-first sorting would skip the occupied cell.
    const cluster = [
      edgeKey!,
      `${edgeX + 1}:${edgeY}`,
      `${edgeX}:${edgeY + 1}`,
      `${Math.max(0, edgeX - 1)}:${edgeY}`,
    ];
    state = {
      ...state,
      corruption: new Set([...state.corruption, ...cluster]),
    };
    state = setPossession(state, lightId);
    expect(state.lights.find((light) => light.id === lightId)?.mode).toBe("manual");
    state = {
      ...state,
      lights: state.lights.map((light) =>
        light.id === lightId
          ? {
              ...light,
              x: edgeX,
              y: edgeY,
              previousX: edgeX,
              previousY: edgeY,
              mode: "manual" as const,
              trail: [{ x: edgeX, y: edgeY }],
            }
          : light
      ),
    };
    while (state.tick % 2 !== 1) state = advanceTick(state);
    expect(state.corruption.has(edgeKey!)).toBe(true);
    state = advanceTick(state);
    expect(state.corruption.has(edgeKey!)).toBe(false);
  });
});
