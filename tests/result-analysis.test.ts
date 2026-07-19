import { describe, expect, it } from "vitest";
import { recommendationFor, resultSummary } from "../src/game/analysis";
import { compileStrategy } from "../src/game/strategy";
import { createInitialState } from "../src/game/engine";

describe("GRIDWAKE truthful result analysis", () => {
  it("never recommends the formation already in use", () => {
    const strategy = compileStrategy("Circle the light within 10%. Send two and do not chase.");
    const state = {
      ...createInitialState(1, strategy, 10),
      health: 40,
      damageTaken: 60,
      interceptClears: 1,
      pulseClears: 6,
    };
    const recommendation = recommendationFor(state, strategy);
    expect(recommendation).not.toMatch(/choose ring/i);
    expect(recommendation).toMatch(/radius|core|interceptor/i);
  });

  it("uses correct singular and plural result grammar", () => {
    expect(resultSummary("organic", "ring", 1, 0, 1)).toBe(
      "The organic ring held with 1 intercept, 0 trail repairs, and 1 Pulse clear.",
    );
    expect(resultSummary("organic", "ring", 2, 1, 6)).toBe(
      "The organic ring held with 2 intercepts, 1 trail repair, and 6 Pulse clears.",
    );
  });
});
