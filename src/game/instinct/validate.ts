import type { CanonicalStrategyPlan, InterpretationWarning, StrategyInterpretation } from "./types";

export function validateInterpretation(
  interpretation: StrategyInterpretation,
): StrategyInterpretation {
  const warnings: InterpretationWarning[] = [...interpretation.warnings];
  let blocking = interpretation.blocking;

  if (interpretation.plan.directives.length === 0) {
    blocking = true;
    warnings.push({
      kind: "unsupported",
      message: "No actionable directive. Describe movement or protection.",
      evidence: [],
      blocking: true,
    });
  }

  // Decorative-only unresolved words should not block.
  const decorative = new Set(["gracefully", "sing", "moon", "little", "sparks", "brave"]);
  const materialUnresolved = interpretation.unresolved.filter(
    (span) => !decorative.has(span.text.toLowerCase()),
  );

  return {
    ...interpretation,
    warnings,
    unresolved: materialUnresolved.length > 0
      ? materialUnresolved
      : interpretation.unresolved.filter((span) => decorative.has(span.text.toLowerCase())),
    blocking,
  };
}

export function hasActionablePlan(plan: CanonicalStrategyPlan): boolean {
  return plan.directives.length > 0;
}
