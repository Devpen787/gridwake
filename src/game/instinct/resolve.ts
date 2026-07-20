import type { ParsedExtraction } from "./parser";
import type {
  CanonicalDirective,
  CanonicalStrategyPlan,
  DirectiveEvidence,
  EngagementStyle,
  InterpretationWarning,
  SourceSpan,
  StrategyCondition,
  StrategyInterpretation,
} from "./types";

function defaultRadius(shape: CanonicalStrategyPlan["formation"]["shape"]): number {
  switch (shape) {
    case "ring":
      return 5;
    case "spread":
      return 14;
    case "link":
      return 8;
    case "balanced":
      return 9;
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

function applyEngagementDefaults(
  directives: readonly CanonicalDirective[],
  style: EngagementStyle,
  noChase: boolean,
  leashExplicit: boolean,
): CanonicalDirective[] {
  return directives.map((directive) => {
    let leashCells = directive.leashCells;
    if (noChase) {
      leashCells = 0;
    } else if (!leashExplicit && leashCells === null) {
      if (style === "aggressive" && directive.action === "intercept") leashCells = 6;
      else if (style === "cautious") leashCells = 2;
    }
    return {
      ...directive,
      engagementStyle: style,
      leashCells,
    };
  });
}

function dedupeDirectives(directives: readonly CanonicalDirective[]): CanonicalDirective[] {
  const byKey = new Map<string, CanonicalDirective>();
  for (const directive of directives) {
    const key = `${directive.actor}|${directive.action}|${directive.target}|${directive.condition.kind}`;
    const existing = byKey.get(key);
    if (!existing || directive.priority <= existing.priority) {
      byKey.set(key, directive);
    }
  }
  return [...byKey.values()];
}

export function resolvePlan(
  extraction: ParsedExtraction,
): {
  plan: CanonicalStrategyPlan;
  evidenceByDirective: DirectiveEvidence[];
  warnings: InterpretationWarning[];
  defaultsUsed: string[];
  blocking: boolean;
} {
  const warnings: InterpretationWarning[] = [];
  const defaultsUsed: string[] = [];
  let blocking = false;

  if (extraction.formationConflict) {
    blocking = true;
    warnings.push({
      kind: "contradiction",
      message: "Spread and Ring are both explicit. Choose one formation.",
      evidence: extraction.formationSpans,
      choices: ["Ring", "Spread"],
      blocking: true,
    });
  }

  const shape = extraction.formationShape ?? "balanced";
  if (!extraction.formationShape && !extraction.formationConflict) {
    defaultsUsed.push("formation: balanced");
  }

  let radius = extraction.radius ?? defaultRadius(shape);
  if (extraction.radius === null) defaultsUsed.push(`radius: ${radius}`);
  if (extraction.radiusClamped) {
    warnings.push({
      kind: "clamped",
      message: `Radius clamped to ${radius} cells.`,
      evidence: extraction.radiusSpans,
    });
  }

  const movementStyle = extraction.movementStyle ?? "organic";
  if (!extraction.movementStyle) defaultsUsed.push("movement: organic");

  const engagementStyle: EngagementStyle = extraction.engagementStyle ?? "balanced";
  if (!extraction.engagementStyle) defaultsUsed.push("engagement: balanced");

  let directives = applyEngagementDefaults(
    extraction.directives,
    engagementStyle,
    extraction.noChase,
    extraction.leashExplicit,
  );
  directives = dedupeDirectives(directives);

  // Role-specific overrides: later scout/mender/guardian beat squad for same action family
  directives = directives.map((directive) => {
    let next = directive;
    if (next.action === "follow" || (next.action === "hold" && next.target === "shared-trail")) {
      next = { ...next, action: "repair", target: "shared-trail", actor: "mender" };
    }
    if (extraction.noChase && next.action === "intercept") {
      return { ...next, leashCells: 0, continuation: "return" as const };
    }
    return next;
  });

  // Do not invent a default orbit for decorative-only sentences — leave empty for validation.

  let pulseCondition: StrategyCondition = { kind: "core-health-below", percent: 35 };
  if (extraction.pulsePercent !== null) {
    pulseCondition = { kind: "core-health-below", percent: extraction.pulsePercent };
  } else {
    defaultsUsed.push("pulse: below 35%");
  }
  if (extraction.pulseClamped) {
    warnings.push({
      kind: "clamped",
      message: `Pulse threshold clamped to ${extraction.pulsePercent}%.`,
      evidence: extraction.pulseSpans,
    });
  }

  const plan: CanonicalStrategyPlan = {
    version: "instinct-v2",
    formation: { shape, radius, movementStyle },
    directives,
    pulseGuidance: {
      condition: pulseCondition,
      target: extraction.pulseTarget,
    },
  };

  const evidenceByDirective: DirectiveEvidence[] = directives.map((directive, index) => {
    const spans = extraction.directiveSpans[index] ?? [];
    const provenance = spans.length > 0 ? "stated" as const : "default" as const;
    return {
      directiveIndex: index,
      spans,
      provenance,
      confidence: provenance === "stated" ? 0.9 : 0.45,
    };
  });

  // Target mapping notice for highest-pressure paraphrases
  if (directives.some((directive) => directive.target === "highest-pressure-sector")) {
    const edgeSpans = extraction.directiveSpans.flat().filter((span) =>
      /weak|busiest|densest|crowded|pressure/i.test(span.text)
    );
    if (edgeSpans.length > 0) {
      warnings.push({
        kind: "unsupported",
        message: "“Weakest / densest edge” maps to the highest-pressure boundary sector.",
        evidence: edgeSpans,
      });
    }
  }

  return { plan, evidenceByDirective, warnings, defaultsUsed, blocking };
}

export function collectUnresolved(
  normalizedText: string,
  consumed: readonly SourceSpan[],
): SourceSpan[] {
  const covered = new Set<string>();
  for (const span of consumed) {
    for (let index = span.start; index < span.end; index += 1) covered.add(String(index));
  }
  // Word-level unresolved for leftover content words
  const unresolved: SourceSpan[] = [];
  const wordRe = /[A-Za-z']+/g;
  let match: RegExpExecArray | null;
  while ((match = wordRe.exec(normalizedText)) !== null) {
    const word = match[0]!;
    if (word.length < 4) continue;
    const start = match.index;
    const end = start + word.length;
    const anyCovered = Array.from({ length: end - start }, (_, offset) => covered.has(String(start + offset)))
      .some(Boolean);
    if (!anyCovered) {
      unresolved.push({ start, end, text: word });
    }
  }
  return unresolved.slice(0, 12);
}

export function finalizeInterpretation(
  plan: CanonicalStrategyPlan,
  evidenceByDirective: readonly DirectiveEvidence[],
  warnings: readonly InterpretationWarning[],
  unresolved: readonly SourceSpan[],
  defaultsUsed: readonly string[],
  blocking: boolean,
): StrategyInterpretation {
  const confidence = evidenceByDirective.length === 0
    ? 0
    : evidenceByDirective.reduce((sum, item) => sum + item.confidence, 0) / evidenceByDirective.length;
  return {
    plan,
    evidenceByDirective,
    warnings,
    unresolved,
    defaultsUsed,
    confidence,
    blocking,
  };
}
