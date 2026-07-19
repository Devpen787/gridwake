import { describe, expect, it } from "vitest";
import { STRATEGY_EXAMPLES, compileStrategy, compileStrategyWithReading } from "../src/game/strategy";

describe("GRIDWAKE instinct reading (understood vs ignored)", () => {
  it("returns the identical policy as compileStrategy for every shipped example", () => {
    for (const example of STRATEGY_EXAMPLES) {
      const plain = compileStrategy(example.source);
      const { strategy } = compileStrategyWithReading(example.source);
      expect(strategy).toEqual(plain);
    }
  });

  it("marks the ten-percent ring radius as raised to the minimum with its evidence", () => {
    const { strategy, reading } = compileStrategyWithReading(STRATEGY_EXAMPLES[3].source);
    expect(strategy.policy.engagementRadius).toBe(4);
    expect(reading.dials.radius).toEqual({
      provenance: "clamped",
      clamp: "min",
      evidence: ["within 10%"],
    });
  });

  it("marks an over-range radius as capped at the maximum", () => {
    const { strategy, reading } = compileStrategyWithReading("Circle the light and attack within 90%.");
    expect(strategy.policy.engagementRadius).toBe(14);
    expect(reading.dials.radius.provenance).toBe("clamped");
    expect(reading.dials.radius.clamp).toBe("max");
  });

  it("attributes stated dials to the exact fragments that set them", () => {
    const { reading } = compileStrategyWithReading(
      "Guard the core and chase threats for 4 cells then return. Pulse below 60%.",
    );
    expect(reading.dials.pursuit).toEqual({
      provenance: "stated",
      clamp: null,
      evidence: ["chase threats for 4 cells"],
    });
    expect(reading.dials.pulse).toEqual({
      provenance: "stated",
      clamp: null,
      evidence: ["below 60%"],
    });
  });

  it("marks unspoken dials as defaults", () => {
    const { reading } = compileStrategyWithReading("Orbit the light.");
    expect(reading.dials.radius.provenance).toBe("default");
    expect(reading.dials.interceptors.provenance).toBe("default");
    expect(reading.dials.pursuit.provenance).toBe("default");
    expect(reading.dials.movement.provenance).toBe("default");
    expect(reading.dials.risk.provenance).toBe("default");
    expect(reading.dials.pulse.provenance).toBe("default");
    expect(reading.dials.formation.provenance).toBe("stated");
    expect(reading.dials.formation.evidence).toContain("orbit");
  });

  it("attributes no-chase phrasing and interceptor counts", () => {
    const { reading } = compileStrategyWithReading(
      "Circle the core, send two units to intercept, and do not chase.",
    );
    expect(reading.dials.pursuit.evidence).toEqual(["do not chase"]);
    expect(reading.dials.interceptors.evidence).toEqual(["send two units"]);
  });

  it("lists content words that had no effect and skips function words", () => {
    const { reading } = compileStrategyWithReading(
      "Circle the light gracefully and sing to the moonlight while guarding.",
    );
    expect(reading.ignoredWords).toContain("gracefully");
    expect(reading.ignoredWords).toContain("sing");
    expect(reading.ignoredWords).toContain("moonlight");
    expect(reading.ignoredWords).not.toContain("the");
    expect(reading.ignoredWords).not.toContain("and");
    expect(reading.ignoredWords).not.toContain("circle");
    expect(reading.ignoredWords).not.toContain("light");
  });

  it("reports no ignored words when every content word matched", () => {
    const { reading } = compileStrategyWithReading("Circle the light and send two units.");
    expect(reading.ignoredWords).toEqual([]);
  });

  it("marks risk as stated when aggressive or cautious words appear", () => {
    const aggressive = compileStrategyWithReading("Aggressively hunt everything near the core.");
    expect(aggressive.reading.dials.risk.provenance).toBe("stated");
    expect(aggressive.reading.dials.risk.evidence).toContain("aggressively");
    const plain = compileStrategyWithReading("Circle the light.");
    expect(plain.reading.dials.risk.provenance).toBe("default");
  });
});
