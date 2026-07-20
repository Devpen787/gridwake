import type { CanonicalDirective, CanonicalStrategyPlan, StrategyInterpretation } from "./types";

function formatCondition(directive: CanonicalDirective): string {
  const condition = directive.condition;
  switch (condition.kind) {
    case "always":
      return "always";
    case "core-health-below":
      return `when core < ${condition.percent}%`;
    case "threat-within":
      return `when threat ≤ ${condition.cells} cells`;
    case "phase":
      return `during ${condition.phase}`;
    default: {
      const _exhaustive: never = condition;
      return _exhaustive;
    }
  }
}

function formatDirective(directive: CanonicalDirective): string {
  const responders = directive.responderCount ? ` · ${directive.responderCount} responders` : "";
  const leash = directive.leashCells === null
    ? ""
    : directive.leashCells === 0
      ? " · no chase"
      : ` · leash ${directive.leashCells}`;
  return `${directive.actor.toUpperCase()} ${directive.action} → ${directive.target}${responders}${leash} (${formatCondition(directive)})`;
}

export function explainRole(
  plan: CanonicalStrategyPlan,
  role: "guardian" | "scout" | "mender",
): string {
  const owned = plan.directives.filter(
    (directive) => directive.actor === role || directive.actor === "squad",
  );
  if (owned.length === 0) {
    if (role === "guardian") {
      return `Hold ${plan.formation.shape} at R${plan.formation.radius} (default).`;
    }
    if (role === "scout") return "No scout directive — falls back to formation.";
    return "No mender directive — safe formation fallback.";
  }
  return owned.map(formatDirective).join(" · ");
}

export function explainFormation(plan: CanonicalStrategyPlan): string {
  return `${plan.formation.shape.toUpperCase()} · R${plan.formation.radius} · ${plan.formation.movementStyle.toUpperCase()}`;
}

export function explainPulse(plan: CanonicalStrategyPlan): string {
  const condition = plan.pulseGuidance.condition;
  if (condition.kind === "core-health-below") {
    return `Guide Pulse below ${condition.percent}% → ${plan.pulseGuidance.target}`;
  }
  if (condition.kind === "phase") {
    return `Guide Pulse during ${condition.phase} → ${plan.pulseGuidance.target}`;
  }
  return `Guide Pulse → ${plan.pulseGuidance.target}`;
}

export function explainInterpretation(interpretation: StrategyInterpretation): Readonly<{
  formation: string;
  guardian: string;
  scout: string;
  mender: string;
  pulse: string;
}> {
  return {
    formation: explainFormation(interpretation.plan),
    guardian: explainRole(interpretation.plan, "guardian"),
    scout: explainRole(interpretation.plan, "scout"),
    mender: explainRole(interpretation.plan, "mender"),
    pulse: explainPulse(interpretation.plan),
  };
}
