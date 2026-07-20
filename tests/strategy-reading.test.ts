import { describe, expect, it } from "vitest";
import { STRATEGY_EXAMPLES, compileStrategy, compileStrategyWithReading } from "../src/game/strategy";

describe("GRIDWAKE instinct reading (understood vs ignored)", () => {
  it("returns strategy, interpretation, reading, and error together", () => {
    const result = compileStrategyWithReading(STRATEGY_EXAMPLES[0].source);
    expect(result).toEqual(
      expect.objectContaining({
        strategy: expect.any(Object),
        interpretation: expect.objectContaining({
          plan: expect.objectContaining({ version: "instinct-v2" }),
          warnings: expect.any(Array),
          blocking: false,
        }),
        reading: expect.objectContaining({
          dials: expect.any(Object),
          ignoredWords: expect.any(Array),
        }),
        error: null,
      }),
    );
  });

  it("returns the identical compiled strategy as compileStrategy for every shipped example", () => {
    for (const example of STRATEGY_EXAMPLES) {
      const plain = compileStrategy(example.source);
      const { strategy } = compileStrategyWithReading(example.source);
      expect(strategy).toBeTruthy();
      expect(strategy!).toEqual(plain);
    }
  });

  it("surfaces a blocking error while still returning interpretation for contradictions", () => {
    const result = compileStrategyWithReading("Spread wide in a tight ring around the core.");
    expect(result.strategy).toBeTruthy();
    expect(result.interpretation.blocking).toBe(true);
    expect(result.error).toMatch(/spread and ring/i);
  });

  it("surfaces a null strategy and blocking error for decorative-only prose", () => {
    const result = compileStrategyWithReading("Be brave, little sparks.");
    expect(result.strategy).toBeNull();
    expect(result.interpretation.blocking).toBe(true);
    expect(result.error).toMatch(/actionable directive/i);
  });

  it("marks clamped radius readings from interpretation warnings", () => {
    const { strategy, reading } = compileStrategyWithReading(STRATEGY_EXAMPLES[3].source);
    expect(strategy?.policy.engagementRadius).toBe(4);
    expect(reading.dials.radius.provenance).toBe("clamped");
    expect(reading.dials.radius.clamp).toBe("min");
    expect(reading.dials.radius.evidence.some((text) => /radius clamped/i.test(text))).toBe(true);
  });

  it("marks an over-range radius as clamped in the reading", () => {
    const { strategy, reading } = compileStrategyWithReading("Circle the light and attack within 90%.");
    expect(strategy?.policy.engagementRadius).toBe(14);
    expect(reading.dials.radius.provenance).toBe("clamped");
    expect(reading.dials.radius.evidence.length).toBeGreaterThan(0);
  });

  it("attributes stated dials to source fragments surfaced in evidence spans", () => {
    const { reading, strategy } = compileStrategyWithReading(
      "Guard the core and chase threats for 4 cells then return. Pulse below 60%.",
    );
    expect(reading.dials.pursuit.provenance).toBe("stated");
    expect(reading.dials.pursuit.evidence.some((text) => /return|chase/i.test(text))).toBe(true);
    expect(strategy?.policy.pulseHealthThreshold).toBe(60);
    expect(strategy?.plan?.pulseGuidance.condition).toEqual({ kind: "core-health-below", percent: 60 });
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
    expect(reading.dials.formation.evidence.some((text) => /orbit/i.test(text))).toBe(true);
  });

  it("attributes no-chase phrasing and interceptor counts from evidence spans", () => {
    const { reading } = compileStrategyWithReading(
      "Circle the core, send two units to intercept, and do not chase.",
    );
    expect(reading.dials.pursuit.evidence.some((text) => /do not chase/i.test(text))).toBe(true);
    expect(reading.dials.interceptors.evidence.some((text) => /send two units/i.test(text))).toBe(true);
  });

  it("lists content words that had no effect and skips function words", () => {
    const { reading } = compileStrategyWithReading(
      "Circle the light gracefully and sing to the moonlight while guarding.",
    );
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

  it("marks risk as stated when aggressive or hunt words appear", () => {
    const aggressive = compileStrategyWithReading("Aggressively hunt everything near the core.");
    expect(aggressive.reading.dials.risk.provenance).toBe("stated");
    expect(aggressive.reading.dials.risk.evidence.some((text) => /aggressive|hunt/i.test(text))).toBe(true);
    const plain = compileStrategyWithReading("Circle the light.");
    expect(plain.reading.dials.risk.provenance).toBe("default");
  });
});
