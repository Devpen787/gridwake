import { hashText, hexHash } from "../math";
import type { CanonicalStrategyPlan, StrategyCondition } from "./types";

function conditionKey(condition: StrategyCondition): string {
  switch (condition.kind) {
    case "always":
      return "always";
    case "core-health-below":
      return `core-health-below:${condition.percent}`;
    case "threat-within":
      return `threat-within:${condition.cells}`;
    case "phase":
      return `phase:${condition.phase}`;
    default: {
      const _exhaustive: never = condition;
      return _exhaustive;
    }
  }
}

/** Stable serialization for behavioral identity — excludes source wording and confidence. */
export function serializeCanonicalPlan(plan: CanonicalStrategyPlan): string {
  const directives = [...plan.directives]
    .map((directive) => ([
      directive.actor,
      directive.action,
      directive.target,
      conditionKey(directive.condition),
      directive.responderCount ?? "null",
      directive.leashCells ?? "null",
      directive.continuation,
      directive.engagementStyle,
      directive.priority,
    ].join(":")))
    .toSorted((a, b) => a.localeCompare(b));

  return [
    plan.version,
    plan.formation.shape,
    plan.formation.radius,
    plan.formation.movementStyle,
    directives.join("|"),
    conditionKey(plan.pulseGuidance.condition),
    plan.pulseGuidance.target,
  ].join("||");
}

export function hashCanonicalPlan(plan: CanonicalStrategyPlan): string {
  return hexHash(hashText(serializeCanonicalPlan(plan)));
}

export function hashSource(source: string): string {
  return hexHash(hashText(source));
}
