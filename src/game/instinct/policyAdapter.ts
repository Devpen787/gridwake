import type { StrategyPolicy } from "../types";
import type { CanonicalStrategyPlan, EngagementStyle } from "./types";

function engagementRisk(style: EngagementStyle): number {
  switch (style) {
    case "cautious":
      return 35;
    case "balanced":
      return 50;
    case "aggressive":
      return 65;
    default: {
      const _exhaustive: never = style;
      return _exhaustive;
    }
  }
}

function movementEntropy(style: CanonicalStrategyPlan["formation"]["movementStyle"]): number {
  switch (style) {
    case "disciplined":
      return 10;
    case "organic":
      return 42;
    case "erratic":
      return 78;
    default: {
      const _exhaustive: never = style;
      return _exhaustive;
    }
  }
}

function focusFromPlan(plan: CanonicalStrategyPlan): StrategyPolicy["focus"] {
  let core = 34;
  let edge = 33;
  let link = 33;
  for (const directive of plan.directives) {
    if (directive.target === "core" || directive.action === "hold" || directive.action === "orbit" || directive.action === "screen") {
      core += 12;
    }
    if (
      directive.target === "nearest-breach"
      || directive.target === "highest-urgency-breach"
      || directive.target === "highest-pressure-sector"
      || directive.action === "intercept"
    ) {
      edge += 12;
    }
    if (directive.target === "shared-trail" || directive.action === "repair" || directive.action === "follow") {
      link += 12;
    }
  }
  if (plan.formation.shape === "ring") core += 8;
  if (plan.formation.shape === "spread") edge += 8;
  if (plan.formation.shape === "link") link += 8;
  const total = core + edge + link;
  return {
    core: Math.round((core / total) * 100),
    edge: Math.round((edge / total) * 100),
    link: Math.max(0, 100 - Math.round((core / total) * 100) - Math.round((edge / total) * 100)),
  };
}

function primaryResponderCount(plan: CanonicalStrategyPlan): number {
  for (const directive of plan.directives) {
    if (directive.responderCount !== null) return directive.responderCount;
  }
  return 2;
}

function primaryLeash(plan: CanonicalStrategyPlan): number {
  for (const directive of plan.directives) {
    if (directive.leashCells !== null) return directive.leashCells;
  }
  return 2;
}

function primaryEngagement(plan: CanonicalStrategyPlan): EngagementStyle {
  for (const directive of plan.directives) {
    if (directive.engagementStyle !== "balanced") return directive.engagementStyle;
  }
  return plan.directives[0]?.engagementStyle ?? "balanced";
}

function pulseThreshold(plan: CanonicalStrategyPlan): number {
  const condition = plan.pulseGuidance.condition;
  if (condition.kind === "core-health-below") return condition.percent;
  return 35;
}

/** Derive legacy StrategyPolicy from the canonical plan for engine compatibility. */
export function planToPolicy(
  plan: CanonicalStrategyPlan,
  matchedSignals: readonly string[] = [],
): StrategyPolicy {
  return {
    focus: focusFromPlan(plan),
    formation: plan.formation.shape,
    engagementRadius: plan.formation.radius,
    interceptors: primaryResponderCount(plan),
    pursuitLimit: primaryLeash(plan),
    movementStyle: plan.formation.movementStyle,
    entropy: movementEntropy(plan.formation.movementStyle),
    risk: engagementRisk(primaryEngagement(plan)),
    pulseHealthThreshold: pulseThreshold(plan),
    matchedSignals,
  };
}
