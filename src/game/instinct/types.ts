/** Canonical tactical-language types for Instinct Runtime v2. */

export type StrategyActor = "squad" | "guardian" | "scout" | "mender";

export type StrategyAction =
  | "hold"
  | "orbit"
  | "screen"
  | "intercept"
  | "repair"
  | "follow"
  | "regroup";

export type StrategyTarget =
  | "core"
  | "nearest-breach"
  | "highest-urgency-breach"
  | "highest-pressure-sector"
  | "shared-trail"
  | "ally";

export type StrategyContinuation = "return" | "hold" | "continue";

export type StrategyPhase = "probe" | "surge" | "collapse";

export type StrategyCondition =
  | Readonly<{ kind: "always" }>
  | Readonly<{ kind: "core-health-below"; percent: number }>
  | Readonly<{ kind: "threat-within"; cells: number }>
  | Readonly<{ kind: "phase"; phase: StrategyPhase }>;

export type EngagementStyle = "cautious" | "balanced" | "aggressive";

export type CanonicalDirective = Readonly<{
  actor: StrategyActor;
  action: StrategyAction;
  target: StrategyTarget;
  condition: StrategyCondition;
  responderCount: 1 | 2 | 3 | null;
  leashCells: number | null;
  continuation: StrategyContinuation;
  engagementStyle: EngagementStyle;
  priority: 1 | 2 | 3;
}>;

export type CanonicalStrategyPlan = Readonly<{
  version: "instinct-v2";
  formation: Readonly<{
    shape: "ring" | "spread" | "link" | "balanced";
    radius: number;
    movementStyle: "disciplined" | "organic" | "erratic";
  }>;
  directives: readonly CanonicalDirective[];
  pulseGuidance: Readonly<{
    condition: StrategyCondition;
    target: "highest-pressure-sector" | "nearest-core-breach";
  }>;
}>;

export type SourceSpan = Readonly<{
  start: number;
  end: number;
  text: string;
}>;

export type InterpretationWarning = Readonly<{
  kind: "contradiction" | "unsupported" | "clamped" | "spelling";
  message: string;
  evidence: readonly SourceSpan[];
  choices?: readonly string[];
  blocking?: boolean;
}>;

export type DirectiveEvidence = Readonly<{
  directiveIndex: number;
  spans: readonly SourceSpan[];
  provenance: "stated" | "inferred" | "default" | "clamped";
  confidence: number;
}>;

export type StrategyInterpretation = Readonly<{
  plan: CanonicalStrategyPlan;
  evidenceByDirective: readonly DirectiveEvidence[];
  warnings: readonly InterpretationWarning[];
  unresolved: readonly SourceSpan[];
  defaultsUsed: readonly string[];
  confidence: number;
  blocking: boolean;
}>;

export type NormalizedText = Readonly<{
  text: string;
  /** Maps each normalized index to original source index. */
  indexMap: readonly number[];
}>;

export type Clause = Readonly<{
  text: string;
  start: number;
  end: number;
  actor: StrategyActor | null;
  negated: boolean;
}>;

export type ActionAttribution =
  | Readonly<{ kind: "directive"; index: number }>
  | Readonly<{ kind: "default" }>
  | Readonly<{ kind: "override" }>
  | Readonly<{ kind: "pulse" }>;
