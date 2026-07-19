import { describe, expect, it } from "vitest";
import { DEFAULT_STRATEGY, STRATEGY_EXAMPLES, compileStrategy } from "../src/game/strategy";
import type { StrategyPolicy } from "../src/game/types";

type CorpusCase = Readonly<{
  label: string;
  source: string;
  expected: StrategyPolicy;
}>;

// Characterization corpus: locks in current local-prototype compiler behaviour so the
// compiler can be rewritten (including a model-backed path) against a fixed contract.
// Surprising resolutions are intentional captures, documented in
// specs/instinct-fidelity-v1.md — changing them is a design decision, not a test fix.
const CORPUS: readonly CorpusCase[] = [
  {
    label: "shipped example: ring keeper",
    source: STRATEGY_EXAMPLES[0].source,
    expected: {
      focus: { core: 74, edge: 13, link: 13 },
      formation: "ring",
      engagementRadius: 5,
      interceptors: 2,
      pursuitLimit: 0,
      movementStyle: "disciplined",
      entropy: 10,
      risk: 35,
      pulseHealthThreshold: 45,
      matchedSignals: ["core", "guard", "ring", "chase", "send", "pulse", "tight", "disciplined"],
    },
  },
  {
    label: "shipped example: edge hunter",
    source: STRATEGY_EXAMPLES[1].source,
    expected: {
      focus: { core: 10, edge: 81, link: 9 },
      formation: "spread",
      engagementRadius: 14,
      interceptors: 3,
      pursuitLimit: 2,
      movementStyle: "erratic",
      entropy: 78,
      risk: 65,
      pulseHealthThreshold: 35,
      matchedSignals: ["edges", "weakest", "spread", "scout", "wide", "aggressively", "unpredictably"],
    },
  },
  {
    label: "shipped example: chain repair",
    source: STRATEGY_EXAMPLES[2].source,
    expected: {
      focus: { core: 10, edge: 9, link: 81 },
      formation: "link",
      engagementRadius: 8,
      interceptors: 1,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["ally", "together", "link", "reinforce", "trail", "send"],
    },
  },
  {
    // Captured quirk: "within 10%" of an 18-row grid is 1.8 cells, clamped up to the
    // 4-cell minimum — the example's name promises tighter than the compiler delivers.
    label: "shipped example: ten percent ring clamps to minimum radius",
    source: STRATEGY_EXAMPLES[3].source,
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "ring",
      engagementRadius: 4,
      interceptors: 2,
      pursuitLimit: 0,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["circles", "light", "attack", "chase", "send", "only"],
    },
  },
  {
    label: "default strategy",
    source: DEFAULT_STRATEGY,
    expected: {
      focus: { core: 74, edge: 13, link: 13 },
      formation: "ring",
      engagementRadius: 5,
      interceptors: 2,
      pursuitLimit: 0,
      movementStyle: "organic",
      entropy: 42,
      risk: 35,
      pulseHealthThreshold: 35,
      matchedSignals: ["ring", "circle", "light", "intercept", "return", "send", "organic"],
    },
  },
  {
    label: "ring paraphrase",
    source: "Form a protective circle around the core and intercept intruders with two lights.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "ring",
      engagementRadius: 5,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["core", "circle", "intercept"],
    },
  },
  {
    label: "minimal orbit sentence",
    source: "Orbit the light.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "ring",
      engagementRadius: 5,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["orbit", "light"],
    },
  },
  {
    label: "spread paraphrase",
    source: "Spread wide and scout the weakest edges.",
    expected: {
      focus: { core: 10, edge: 81, link: 9 },
      formation: "spread",
      engagementRadius: 14,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["edges", "weakest", "spread", "scout", "wide"],
    },
  },
  {
    label: "link paraphrase",
    source: "Link together and reinforce every ally trail.",
    expected: {
      focus: { core: 10, edge: 9, link: 81 },
      formation: "link",
      engagementRadius: 8,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["ally", "together", "link", "reinforce", "trail"],
    },
  },
  {
    label: "balanced fallback when only a response verb matches",
    source: "Defend against everything that approaches.",
    expected: {
      focus: { core: 34, edge: 33, link: 33 },
      formation: "balanced",
      engagementRadius: 9,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["defend"],
    },
  },
  {
    label: "radius in cells",
    source: "Guard the core and engage anything within 6 cells.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "balanced",
      engagementRadius: 6,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["core", "guard", "engage"],
    },
  },
  {
    label: "radius in percent of grid rows",
    source: "Circle the light and intercept within 50%.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "ring",
      engagementRadius: 9,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["circle", "light", "intercept"],
    },
  },
  {
    label: "radius clamps to 4-cell minimum",
    source: "Circle the light and attack within 1%.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "ring",
      engagementRadius: 4,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 65,
      pulseHealthThreshold: 35,
      matchedSignals: ["circle", "light", "attack"],
    },
  },
  {
    label: "radius clamps to 14-cell maximum",
    source: "Circle the light and attack within 90%.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "ring",
      engagementRadius: 14,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 65,
      pulseHealthThreshold: 35,
      matchedSignals: ["circle", "light", "attack"],
    },
  },
  {
    label: "one interceptor by word number",
    source: "Guard the core and send one unit to intercept threats.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "balanced",
      engagementRadius: 9,
      interceptors: 1,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["core", "guard", "intercept", "send"],
    },
  },
  {
    label: "all three interceptors by phrase",
    source: "All three lights attack anything near the core.",
    expected: {
      focus: { core: 56, edge: 22, link: 22 },
      formation: "balanced",
      engagementRadius: 9,
      interceptors: 3,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 65,
      pulseHealthThreshold: 35,
      matchedSignals: ["core", "attack"],
    },
  },
  {
    label: "everyone implies three interceptors",
    source: "Everyone hunt the corruption at the edges.",
    expected: {
      focus: { core: 22, edge: 56, link: 22 },
      formation: "spread",
      engagementRadius: 14,
      interceptors: 3,
      pursuitLimit: 6,
      movementStyle: "organic",
      entropy: 34,
      risk: 65,
      pulseHealthThreshold: 35,
      matchedSignals: ["edges", "hunt"],
    },
  },
  {
    label: "do-not-chase phrase zeroes pursuit",
    source: "Circle the core and intercept intruders but do not chase.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "ring",
      engagementRadius: 5,
      interceptors: 2,
      pursuitLimit: 0,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["core", "circle", "intercept", "chase"],
    },
  },
  {
    label: "without-chasing phrase zeroes pursuit",
    source: "Guard the light, engage breaches, then return without chasing.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "balanced",
      engagementRadius: 9,
      interceptors: 2,
      pursuitLimit: 0,
      movementStyle: "organic",
      entropy: 34,
      risk: 35,
      pulseHealthThreshold: 35,
      matchedSignals: ["guard", "light", "engage", "return"],
    },
  },
  {
    label: "chase distance with object between verb and number is honoured",
    source: "Guard the core and chase threats for 4 cells then return.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "balanced",
      engagementRadius: 9,
      interceptors: 2,
      pursuitLimit: 4,
      movementStyle: "organic",
      entropy: 34,
      risk: 35,
      pulseHealthThreshold: 35,
      matchedSignals: ["core", "guard", "chase", "return"],
    },
  },
  {
    label: "chase distance directly after verb is honoured",
    source: "Guard the core and chase for 4 cells then return.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "balanced",
      engagementRadius: 9,
      interceptors: 2,
      pursuitLimit: 4,
      movementStyle: "organic",
      entropy: 34,
      risk: 35,
      pulseHealthThreshold: 35,
      matchedSignals: ["core", "guard", "chase", "return"],
    },
  },
  {
    label: "hunt implies long pursuit",
    source: "Guard the core and hunt anything that comes close.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "balanced",
      engagementRadius: 9,
      interceptors: 2,
      pursuitLimit: 6,
      movementStyle: "organic",
      entropy: 34,
      risk: 65,
      pulseHealthThreshold: 35,
      matchedSignals: ["core", "guard", "hunt"],
    },
  },
  {
    label: "erratic movement",
    source: "Circle the core and move unpredictably.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "ring",
      engagementRadius: 5,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "erratic",
      entropy: 78,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["core", "circle", "unpredictably"],
    },
  },
  {
    label: "disciplined movement",
    source: "Hold a precise steady ring around the light.",
    expected: {
      focus: { core: 74, edge: 13, link: 13 },
      formation: "ring",
      engagementRadius: 5,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "disciplined",
      entropy: 10,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["ring", "light", "hold", "precise", "steady"],
    },
  },
  {
    label: "organic movement keyword raises entropy",
    source: "Flow naturally around the light.",
    expected: {
      focus: { core: 56, edge: 22, link: 22 },
      formation: "ring",
      engagementRadius: 5,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 42,
      risk: 50,
      pulseHealthThreshold: 35,
      matchedSignals: ["light", "naturally", "flow"],
    },
  },
  {
    label: "aggressive words raise risk",
    source: "Aggressively rush and kill everything near the core.",
    expected: {
      focus: { core: 56, edge: 22, link: 22 },
      formation: "balanced",
      engagementRadius: 9,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 95,
      pulseHealthThreshold: 35,
      matchedSignals: ["core", "kill", "aggressively", "rush"],
    },
  },
  {
    label: "cautious words lower risk",
    source: "Circle the light. Stay safe and careful and hold a tight ring.",
    expected: {
      focus: { core: 78, edge: 11, link: 11 },
      formation: "ring",
      engagementRadius: 5,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 5,
      pulseHealthThreshold: 35,
      matchedSignals: ["ring", "circle", "light", "hold", "safe", "careful", "tight"],
    },
  },
  {
    label: "explicit pulse threshold",
    source: "Circle the core. Pulse below 60%.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "ring",
      engagementRadius: 5,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 60,
      matchedSignals: ["core", "circle", "pulse"],
    },
  },
  {
    label: "pulse threshold clamps to 15 minimum",
    source: "Guard the core and pulse below 5%.",
    expected: {
      focus: { core: 67, edge: 17, link: 16 },
      formation: "balanced",
      engagementRadius: 9,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 50,
      pulseHealthThreshold: 15,
      matchedSignals: ["core", "guard", "pulse"],
    },
  },
  {
    label: "do-not-chase phrase beats chase keyword",
    source: "Chase everything aggressively but do not chase far.",
    expected: {
      focus: { core: 34, edge: 33, link: 33 },
      formation: "balanced",
      engagementRadius: 9,
      interceptors: 2,
      pursuitLimit: 0,
      movementStyle: "organic",
      entropy: 34,
      risk: 65,
      pulseHealthThreshold: 35,
      matchedSignals: ["chase", "aggressively"],
    },
  },
  {
    label: "ring beats spread when both formations are named",
    source: "Spread wide in a tight ring around the core.",
    expected: {
      focus: { core: 45, edge: 44, link: 11 },
      formation: "ring",
      engagementRadius: 5,
      interceptors: 2,
      pursuitLimit: 2,
      movementStyle: "organic",
      entropy: 34,
      risk: 35,
      pulseHealthThreshold: 35,
      matchedSignals: ["core", "ring", "spread", "wide", "tight"],
    },
  },
] as const;

describe("GRIDWAKE instinct corpus (characterization)", () => {
  it.each(CORPUS)("compiles: $label", ({ source, expected }) => {
    const strategy = compileStrategy(source);
    expect(strategy.policy).toEqual(expected);
    expect(strategy.compiler).toBe("local-prototype");
  });

  it("rejects a sentence with zero recognised signals", () => {
    expect(() => compileStrategy("Be brave, little sparks.")).toThrowError(/Describe movement or protection/);
  });

  it("rejects empty and whitespace-only input", () => {
    expect(() => compileStrategy("")).toThrowError(/Write one sentence/);
    expect(() => compileStrategy("   \n\t ")).toThrowError(/Write one sentence/);
  });

  it("normalizes case and whitespace to an identical policy", () => {
    const shouty = compileStrategy("  CIRCLE   the LIGHT and SEND two UNITS  ");
    const plain = compileStrategy("circle the light and send two units");
    expect(shouty.policy).toEqual(plain.policy);
    expect(shouty.source).toBe("CIRCLE the LIGHT and SEND two UNITS");
  });

  it("truncates over-length input at 280 characters", () => {
    const padding = "hold the line and stay near the light because the grid matters more than glory ".repeat(5);
    const strategy = compileStrategy(padding);
    expect(strategy.source.length).toBe(280);
  });
});
