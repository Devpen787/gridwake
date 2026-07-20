import { describe, expect, it } from "vitest";
import {
  compileRoleScoped,
  hashCanonicalPlan,
  serializeCanonicalPlan,
} from "../src/game/instinct";
import { compileStrategy, compileStrategyWithReading } from "../src/game/strategy";
import type { CanonicalStrategyPlan } from "../src/game/instinct/types";

function planOf(source: string): CanonicalStrategyPlan {
  const compiled = compileStrategy(source);
  if (!compiled.plan) throw new Error(`Missing plan for: ${source}`);
  return compiled.plan;
}

function hashOf(source: string): string {
  return compileStrategy(source).planHash ?? hashCanonicalPlan(planOf(source));
}

describe("Instinct metamorphic properties", () => {
  it("maps equivalent paraphrases to equal canonical plans", () => {
    const pairs = [
      ["Circle the light and send two units.", "Send two units to circle the light."],
      ["Link together and reinforce ally trails.", "Reinforce every ally trail and link together."],
      ["Orbit the light.", "Go in circles around the light."],
    ] as const;

    for (const [left, right] of pairs) {
      expect(serializeCanonicalPlan(planOf(left))).toBe(serializeCanonicalPlan(planOf(right)));
    }
  });

  it("maps equivalent paraphrases to equal plan hashes", () => {
    const left = "Circle the light and send two units.";
    const right = "Send two units to circle the light.";
    expect(hashOf(left)).toBe(hashOf(right));
  });

  it("changes responder count only when two becomes three", () => {
    const two = planOf("Circle the light and send two units within 40% and do not chase.");
    const three = planOf("Circle the light and send three units within 40% and do not chase.");

    expect(two.formation).toEqual(three.formation);
    expect(two.pulseGuidance).toEqual(three.pulseGuidance);
    expect(two.directives[0]?.responderCount).toBe(2);
    expect(three.directives[0]?.responderCount).toBe(3);
    expect(serializeCanonicalPlan(two)).not.toBe(serializeCanonicalPlan(three));
  });

  it("changes pulse threshold only when 35% becomes 45%", () => {
    const lower = planOf("Pulse below 35%. Circle the core.");
    const higher = planOf("Pulse below 45%. Circle the core.");

    expect(lower.formation).toEqual(higher.formation);
    expect(lower.directives).toEqual(higher.directives);
    expect(lower.pulseGuidance.condition).toEqual({ kind: "core-health-below", percent: 35 });
    expect(higher.pulseGuidance.condition).toEqual({ kind: "core-health-below", percent: 45 });
  });

  it("preserves the plan when independent clauses are reordered", () => {
    const ordered = planOf("Circle the light and send two units.");
    const reordered = planOf("Send two units and circle the light.");
    expect(serializeCanonicalPlan(ordered)).toBe(serializeCanonicalPlan(reordered));
  });

  it("preserves the plan when harmless decorative prose is added", () => {
    const base = planOf("Circle the light and send two units.");
    const decorated = planOf("Circle the light gracefully and send two units.");
    const prefixed = planOf("Be brave, circle the light and send two units.");

    expect(serializeCanonicalPlan(base)).toBe(serializeCanonicalPlan(decorated));
    expect(serializeCanonicalPlan(base)).toBe(serializeCanonicalPlan(prefixed));
  });

  it("flips attack intent under negation", () => {
    const defensive = planOf("Do not attack. Hold the core.");
    const offensive = planOf("Attack nearby threats.");

    expect(defensive.directives.some((directive) => directive.action === "hold")).toBe(true);
    expect(offensive.directives.some((directive) => directive.action === "intercept")).toBe(true);
    expect(serializeCanonicalPlan(defensive)).not.toBe(serializeCanonicalPlan(offensive));
  });

  it("scopes role-specific overrides to the owning role only", () => {
    const source = "Guard the core in a ring and send two units.";
    const scoped = compileRoleScoped(source, "scout");

    expect(scoped.ownershipWarnings.length).toBeGreaterThan(0);
    expect(scoped.strategy.plan?.formation.shape).toBe("balanced");
    expect(scoped.strategy.plan?.directives.every((directive) => directive.actor !== "guardian")).toBe(true);

    const full = compileStrategy(source);
    expect(full.plan?.formation.shape).toBe("ring");
  });

  it("binds evidence spans to the source fragments that stated them", () => {
    const { interpretation } = compileStrategyWithReading(
      "Guard the core and chase threats for 4 cells then return. Pulse below 60%.",
    );
    const spanTexts = interpretation.evidenceByDirective.flatMap((entry) => entry.spans.map((span) => span.text));
    expect(spanTexts.some((text) => /return/i.test(text))).toBe(true);
    expect(spanTexts.some((text) => /guard/i.test(text) || /core/i.test(text))).toBe(true);
    expect(interpretation.evidenceByDirective.some((entry) => entry.provenance === "stated")).toBe(true);
  });

  it("compiles repeatedly to identical plans and hashes", () => {
    const source =
      "Spread wide, scout the weakest edges aggressively with all three units, and move unpredictably.";
    const first = compileStrategy(source);
    const second = compileStrategy(source);

    expect(first.planHash).toBe(second.planHash);
    expect(serializeCanonicalPlan(first.plan!)).toBe(serializeCanonicalPlan(second.plan!));
    expect(first.sourceHash).toBe(second.sourceHash);
  });
});
