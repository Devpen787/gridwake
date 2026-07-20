import { describe, expect, it } from "vitest";
import {
  advanceTick,
  createInitialState,
  createReceipt,
  phaseForTick,
  queueManualIntent,
  setPossession,
} from "../src/game/engine";
import { allowPossessionForMode } from "../src/game/possession";
import { OVERRIDE_MAX_TICKS } from "../src/game/types";
import { compileStrategy, DEFAULT_STRATEGY } from "../src/game/strategy";

const strategy = compileStrategy(DEFAULT_STRATEGY);

function step(state: ReturnType<typeof createInitialState>, count = 1) {
  let next = state;
  for (let index = 0; index < count; index += 1) next = advanceTick(next);
  return next;
}

function placePossessedOnCorruption(
  state: ReturnType<typeof createInitialState>,
  lightId: string,
  x: number,
  y: number,
  extraKeys: readonly string[] = [],
) {
  const occupied = `${x}:${y}`;
  return {
    ...state,
    corruption: new Set([...state.corruption, occupied, ...extraKeys]),
    lights: state.lights.map((light) =>
      light.id === lightId
        ? {
            ...light,
            x,
            y,
            previousX: x,
            previousY: y,
            mode: "manual" as const,
            trail: [{ x, y }],
          }
        : light
    ),
  };
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

  it("clears only the occupied corruption cell for a possessed light", () => {
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
    const adjacent = [
      `${edgeX + 1}:${edgeY}`,
      `${edgeX}:${edgeY + 1}`,
      `${Math.max(0, edgeX - 1)}:${edgeY}`,
    ];
    state = setPossession(state, lightId);
    state = placePossessedOnCorruption(state, lightId, edgeX, edgeY, adjacent);
    const beforeIntercepts = state.interceptClears;
    const beforeManual = state.manualClears;
    expect(state.corruption.has(edgeKey!)).toBe(true);
    state = advanceTick(state);
    expect(state.corruption.has(edgeKey!)).toBe(false);
    for (const key of adjacent) {
      expect(state.corruption.has(key)).toBe(true);
    }
    expect(state.manualClears).toBe(beforeManual + 1);
    expect(state.interceptClears).toBe(beforeIntercepts);
  });

  it("never counts manual clears as interceptClears and affects replay hashes", () => {
    let withManual = createInitialState(11, strategy, 40);
    let withoutManual = createInitialState(11, strategy, 40);
    const lightId = withManual.lights[0].id;
    const edgeKey = [...withManual.corruption].find((key) => {
      const [x, y] = key.split(":").map(Number);
      return Math.abs(x - 15) + Math.abs(y - 9) > 8;
    })!;
    const [edgeX, edgeY] = edgeKey.split(":").map(Number);

    withManual = setPossession(withManual, lightId);
    withManual = placePossessedOnCorruption(withManual, lightId, edgeX, edgeY);
    withManual = advanceTick(withManual);

    withoutManual = advanceTick(withoutManual);

    expect(withManual.manualClears).toBeGreaterThan(0);
    expect(withManual.interceptClears).toBe(withoutManual.interceptClears);
    expect(withManual.replayHash).not.toBe(withoutManual.replayHash);

    const receipt = createReceipt(
      {
        ...withManual,
        ended: true,
        sharedWin: true,
        tick: withManual.maxTicks,
      },
      strategy,
    );
    expect(receipt.manualClears).toBe(withManual.manualClears);
    expect(receipt.interceptClears).toBe(withManual.interceptClears);
  });

  it("starts with a 60-tick override budget and auto-releases at zero", () => {
    expect(OVERRIDE_MAX_TICKS).toBe(60);
    let state = createInitialState(11, strategy, 120);
    expect(state.overrideTicksRemaining).toBe(60);
    const lightId = state.lights[0].id;
    state = setPossession(state, lightId);
    state = step(state, 60);
    expect(state.overrideTicksRemaining).toBe(0);
    expect(state.possessedLightId).toBeNull();
    expect(state.lights.find((light) => light.id === lightId)?.mode).not.toBe("manual");
    const blocked = setPossession(state, lightId);
    expect(blocked.possessedLightId).toBeNull();
  });

  it("preserves remaining budget on early release and reuses it on re-possession", () => {
    let state = createInitialState(11, strategy, 120);
    const lightId = state.lights[0].id;
    state = setPossession(state, lightId);
    state = step(state, 20);
    expect(state.overrideTicksRemaining).toBe(40);
    state = setPossession(state, null);
    expect(state.overrideTicksRemaining).toBe(40);
    state = step(state, 5);
    expect(state.overrideTicksRemaining).toBe(40);
    state = setPossession(state, lightId);
    expect(state.possessedLightId).toBe(lightId);
    state = step(state, 40);
    expect(state.overrideTicksRemaining).toBe(0);
    expect(state.possessedLightId).toBeNull();
  });

  it("maps phase boundaries exactly at 149/150 and 329/330", () => {
    expect(phaseForTick(0)).toBe("probe");
    expect(phaseForTick(149)).toBe("probe");
    expect(phaseForTick(150)).toBe("surge");
    expect(phaseForTick(329)).toBe("surge");
    expect(phaseForTick(330)).toBe("collapse");
    expect(phaseForTick(450)).toBe("collapse");
  });

  it("keeps multiplayer possession disabled", () => {
    expect(allowPossessionForMode("solo")).toBe(true);
    expect(allowPossessionForMode("multiplayer")).toBe(false);
  });
});
