import { describe, expect, it } from "vitest";
import { compileStrategy } from "../src/game/strategy";
import { createInitialState, runToEnd } from "../src/game/engine";
import type { CanonicalStrategyPlan } from "../src/game/instinct/types";

const EDGE_HUNTER =
  "Spread wide, scout the weakest edges aggressively with all three units, and move unpredictably.";

const AB_SEED = 2_654_483_283;

function lightPaths(state: ReturnType<typeof runToEnd>): string {
  return state.lights
    .map((light) => light.trail.map((point) => `${point.x}:${point.y}`).join(","))
    .join("|");
}

function formationSnapshot(plan: CanonicalStrategyPlan | undefined) {
  return plan?.formation;
}

describe("Instinct Edge-Hunter causal A/B", () => {
  it("resolves spread formation, sector targeting, aggression, three responders, and erratic movement", () => {
    const compiled = compileStrategy(EDGE_HUNTER);

    expect(compiled.plan?.formation).toEqual({
      shape: "spread",
      radius: 14,
      movementStyle: "erratic",
    });
    expect(compiled.plan?.directives[0]).toMatchObject({
      action: "intercept",
      target: "highest-pressure-sector",
      responderCount: 3,
      engagementStyle: "aggressive",
    });
    expect(compiled.policy.interceptors).toBe(3);
    expect(compiled.policy.formation).toBe("spread");
    expect(compiled.policy.movementStyle).toBe("erratic");
    expect(compiled.policy.risk).toBe(65);
    expect(compiled.interpretation?.warnings.some((warning) =>
      /highest-pressure boundary sector/i.test(warning.message),
    )).toBe(true);
  });

  it("removing weakest edges changes the intercept target sector policy", () => {
    const baseline = compileStrategy(EDGE_HUNTER);
    const variant = compileStrategy(EDGE_HUNTER.replace("weakest edges", "edges"));

    expect(baseline.plan?.directives[0]?.target).toBe("highest-pressure-sector");
    expect(variant.plan?.directives[0]?.target).toBe("nearest-breach");
    expect(baseline.planHash).not.toBe(variant.planHash);
    expect(baseline.policy.formation).toBe(variant.policy.formation);
    expect(baseline.policy.movementStyle).toBe(variant.policy.movementStyle);
  });

  it("replacing all three with one changes responders only", () => {
    const baseline = compileStrategy(EDGE_HUNTER);
    const variant = compileStrategy(EDGE_HUNTER.replace("all three units", "one unit"));

    expect(baseline.policy.interceptors).toBe(3);
    expect(variant.policy.interceptors).toBe(1);
    expect(formationSnapshot(baseline.plan)).toEqual(formationSnapshot(variant.plan));
    expect(baseline.plan?.directives[0]?.target).toBe(variant.plan?.directives[0]?.target);
    expect(baseline.plan?.formation.movementStyle).toBe(variant.plan?.formation.movementStyle);
  });

  it("replacing unpredictably with steadily changes paths but not target priority or responders", () => {
    const baseline = compileStrategy(EDGE_HUNTER);
    const variant = compileStrategy(EDGE_HUNTER.replace("unpredictably", "steadily"));

    expect(baseline.plan?.directives[0]?.target).toBe(variant.plan?.directives[0]?.target);
    expect(baseline.policy.interceptors).toBe(variant.policy.interceptors);
    expect(baseline.plan?.formation.movementStyle).toBe("erratic");
    expect(variant.plan?.formation.movementStyle).toBe("disciplined");

    const baselineRound = runToEnd(createInitialState(AB_SEED, baseline, 180), 90);
    const variantRound = runToEnd(createInitialState(AB_SEED, variant, 180), 90);
    expect(lightPaths(baselineRound)).not.toBe(lightPaths(variantRound));
  });

  it("removing aggressively drops the aggressive commitment leash and risk", () => {
    const baseline = compileStrategy(EDGE_HUNTER);
    const variant = compileStrategy(EDGE_HUNTER.replace(" aggressively", ""));

    expect(baseline.policy.risk).toBe(65);
    expect(variant.policy.risk).toBe(50);
    expect(baseline.policy.pursuitLimit).toBe(6);
    expect(variant.policy.pursuitLimit).toBe(2);
    expect(baseline.plan?.directives[0]?.engagementStyle).toBe("aggressive");
    expect(variant.plan?.directives[0]?.engagementStyle).toBe("balanced");
    expect(formationSnapshot(baseline.plan)).toEqual(formationSnapshot(variant.plan));
    expect(baseline.policy.interceptors).toBe(variant.policy.interceptors);
  });

  it("adding do not chase forces zero pursuit despite aggressive wording", () => {
    const baseline = compileStrategy(EDGE_HUNTER);
    const variant = compileStrategy(`${EDGE_HUNTER} Do not chase.`);

    expect(baseline.policy.pursuitLimit).toBe(6);
    expect(variant.policy.pursuitLimit).toBe(0);
    expect(variant.plan?.directives[0]?.leashCells).toBe(0);
    expect(variant.policy.risk).toBe(65);
    expect(variant.policy.interceptors).toBe(baseline.policy.interceptors);
    expect(variant.plan?.directives[0]?.target).toBe(baseline.plan?.directives[0]?.target);
  });

  it("same-seed simulation keeps the world seed while tactics diverge", () => {
    const baseline = compileStrategy(EDGE_HUNTER);
    const oneUnit = compileStrategy(EDGE_HUNTER.replace("all three units", "one unit"));
    const baselineRound = runToEnd(createInitialState(AB_SEED, baseline, 180), 90);
    const oneUnitRound = runToEnd(createInitialState(AB_SEED, oneUnit, 180), 90);

    expect(baselineRound.seed).toBe(AB_SEED);
    expect(oneUnitRound.seed).toBe(AB_SEED);
    expect(lightPaths(baselineRound)).not.toBe(lightPaths(oneUnitRound));
  });
});
