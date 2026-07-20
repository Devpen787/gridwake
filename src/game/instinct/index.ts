import type { CompiledStrategy, Instinct, LightRole } from "../types";
import { segmentClauses } from "./clauses";
import { explainInterpretation } from "./explain";
import { hashCanonicalPlan, hashSource } from "./hash";
import { normalizeInstinctSource } from "./normalize";
import { extractFromText } from "./parser";
import { planToPolicy } from "./policyAdapter";
import {
  collectUnresolved,
  finalizeInterpretation,
  resolvePlan,
} from "./resolve";
import type { StrategyInterpretation } from "./types";
import { validateInterpretation } from "./validate";

export * from "./types";
export { explainInterpretation, explainFormation, explainPulse, explainRole } from "./explain";
export { hashCanonicalPlan, hashSource, serializeCanonicalPlan } from "./hash";
export { planToPolicy } from "./policyAdapter";
export { normalizeInstinctSource } from "./normalize";

export const ROLE_LABELS: Record<LightRole, string> = {
  guardian: "HOLD THE SHAPE",
  scout: "INTERCEPT THE BREACH",
  mender: "CLOSE THE GRID",
};

export const ROLE_DESCRIPTIONS: Record<LightRole, string> = {
  guardian: "Return to the formation anchor whenever no legal threat is in range.",
  scout: "Take a bounded intercept assignment without exceeding the pursuit limit.",
  mender: "Preserve shared trail crossings while the interceptors leave formation.",
};

function roleOrder(source: string, interpretation: StrategyInterpretation): readonly LightRole[] {
  const roles: LightRole[] = ["guardian", "scout", "mender"];
  const weights = new Map<LightRole, number>(roles.map((role) => [role, 0]));
  for (const directive of interpretation.plan.directives) {
    if (directive.actor === "guardian") weights.set("guardian", (weights.get("guardian") ?? 0) + 2);
    if (directive.actor === "scout") weights.set("scout", (weights.get("scout") ?? 0) + 2);
    if (directive.actor === "mender") weights.set("mender", (weights.get("mender") ?? 0) + 2);
    if (directive.action === "repair") weights.set("mender", (weights.get("mender") ?? 0) + 1);
    if (directive.action === "intercept") weights.set("scout", (weights.get("scout") ?? 0) + 1);
    if (directive.action === "hold" || directive.action === "orbit" || directive.action === "screen") {
      weights.set("guardian", (weights.get("guardian") ?? 0) + 1);
    }
  }
  const lowered = source.toLowerCase();
  if (lowered.includes("core") || lowered.includes("ring")) {
    weights.set("guardian", (weights.get("guardian") ?? 0) + 1);
  }
  if (lowered.includes("edge") || lowered.includes("scout")) {
    weights.set("scout", (weights.get("scout") ?? 0) + 1);
  }
  if (lowered.includes("repair") || lowered.includes("trail")) {
    weights.set("mender", (weights.get("mender") ?? 0) + 1);
  }
  return roles.toSorted(
    (a, b) => (weights.get(b) ?? 0) - (weights.get(a) ?? 0) || a.localeCompare(b),
  );
}

export function interpretStrategy(source: string): StrategyInterpretation {
  const normalized = normalizeInstinctSource(source);
  if (!normalized.text) {
    return {
      plan: {
        version: "instinct-v2",
        formation: { shape: "balanced", radius: 9, movementStyle: "organic" },
        directives: [],
        pulseGuidance: {
          condition: { kind: "core-health-below", percent: 35 },
          target: "highest-pressure-sector",
        },
      },
      evidenceByDirective: [],
      warnings: [{
        kind: "unsupported",
        message: "Write one sentence, or launch the default Instinct.",
        evidence: [],
        blocking: true,
      }],
      unresolved: [],
      defaultsUsed: [],
      confidence: 0,
      blocking: true,
    };
  }

  const clauses = segmentClauses(normalized);
  const extraction = extractFromText(normalized, clauses);
  const resolved = resolvePlan(extraction);
  const unresolved = collectUnresolved(normalized.text, extraction.consumedSpans);
  const spellingWarnings = Object.keys(
    // Spelling already applied in normalize; surface if original contained known typos.
    {},
  );
  void spellingWarnings;

  const draft = finalizeInterpretation(
    resolved.plan,
    resolved.evidenceByDirective,
    [
      ...resolved.warnings,
      ...(/intersept|agressively|unpredicably/i.test(source)
        ? [{
            kind: "spelling" as const,
            message: "Corrected a known tactical misspelling.",
            evidence: [],
          }]
        : []),
    ],
    unresolved,
    resolved.defaultsUsed,
    resolved.blocking,
  );
  return validateInterpretation(draft);
}

export function compileFromInterpretation(
  source: string,
  interpretation: StrategyInterpretation,
): CompiledStrategy {
  const normalized = normalizeInstinctSource(source).text;
  const matchedSignals = interpretation.plan.directives.flatMap((directive) => [
    directive.action,
    directive.target,
    directive.actor,
  ]);
  const policy = planToPolicy(interpretation.plan, [...new Set(matchedSignals)]);
  const instincts: Instinct[] = roleOrder(normalized, interpretation).map((role) => ({
    role,
    label: ROLE_LABELS[role],
    description: ROLE_DESCRIPTIONS[role],
  }));
  return {
    source: normalized,
    policy,
    instincts,
    compiler: "local-instinct-v2",
    plan: interpretation.plan,
    planHash: hashCanonicalPlan(interpretation.plan),
    sourceHash: hashSource(normalized),
    interpretation,
  };
}

export function compileInstinct(source: string): {
  strategy: CompiledStrategy;
  interpretation: StrategyInterpretation;
} {
  const interpretation = interpretStrategy(source);
  if (interpretation.blocking && interpretation.plan.directives.length === 0) {
    const message = interpretation.warnings.find((warning) => warning.blocking)?.message
      ?? "Describe movement or protection. Try: circle the light and send two units after anything nearby.";
    throw new Error(message);
  }
  if (interpretation.plan.directives.length === 0) {
    throw new Error("Describe movement or protection. Try: circle the light and send two units after anything nearby.");
  }
  const strategy = compileFromInterpretation(source, interpretation);
  return { strategy, interpretation };
}

/** Role-scoped compile for multiplayer contributions. */
export function compileRoleScoped(
  source: string,
  owner: LightRole,
): {
  strategy: CompiledStrategy;
  interpretation: StrategyInterpretation;
  ownershipWarnings: readonly string[];
} {
  const { strategy, interpretation } = compileInstinct(source);
  const ownershipWarnings: string[] = [];
  const filteredDirectives = interpretation.plan.directives.filter((directive) => {
    if (directive.actor === "squad" || directive.actor === owner) return true;
    ownershipWarnings.push(
      `${directive.actor} instruction ignored — ${owner} does not own that role.`,
    );
    return false;
  }).map((directive) => (
    directive.actor === "squad"
      ? { ...directive, actor: owner }
      : directive
  ));

  let plan = {
    ...interpretation.plan,
    directives: filteredDirectives,
  };

  // Enforce ownership of formation / responders / repair fields.
  if (owner === "scout") {
    plan = {
      ...plan,
      formation: {
        shape: "balanced",
        radius: 9,
        movementStyle: plan.formation.movementStyle,
      },
    };
    if (interpretation.plan.formation.shape !== "balanced") {
      ownershipWarnings.push("Formation wording ignored — Scout does not own defensive formation.");
    }
  }
  if (owner === "mender") {
    plan = {
      ...plan,
      formation: {
        shape: plan.formation.shape === "link" ? "link" : "balanced",
        radius: plan.formation.shape === "link" ? plan.formation.radius : 9,
        movementStyle: plan.formation.movementStyle,
      },
    };
  }
  if (owner === "guardian") {
    plan = {
      ...plan,
      directives: plan.directives.map((directive) => (
        directive.action === "intercept"
          ? { ...directive, actor: "guardian" as const, action: "screen" as const, target: "core" as const }
          : directive
      )),
    };
  }

  const scopedInterpretation: StrategyInterpretation = {
    ...interpretation,
    plan,
    warnings: [
      ...interpretation.warnings,
      ...ownershipWarnings.map((message) => ({
        kind: "unsupported" as const,
        message,
        evidence: [],
      })),
    ],
  };
  return {
    strategy: compileFromInterpretation(source, scopedInterpretation),
    interpretation: scopedInterpretation,
    ownershipWarnings,
  };
}
