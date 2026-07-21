import { hashText, hexHash } from "./math";
import {
  compileFromInterpretation,
  compileInstinct,
  interpretStrategy,
  normalizeInstinctSource,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "./instinct";
import type { StrategyInterpretation } from "./instinct/types";
import type { CompiledStrategy } from "./types";

export { ROLE_DESCRIPTIONS, ROLE_LABELS };

export const DEFAULT_STRATEGY =
  "Circle the light in an organic ring. Send two units to intercept anything that enters the inner grid, then return without chasing.";

export type StrategyTier = "starter" | "advanced" | "expert";

export const STRATEGY_EXAMPLES: ReadonlyArray<Readonly<{ label: string; source: string; tier: StrategyTier }>> = [
  {
    label: "RING KEEPER",
    tier: "starter",
    source: "Guard the core in a tight disciplined ring. Send two units within 25% and do not chase. Pulse below 45% health.",
  },
  {
    label: "EDGE HUNTER",
    tier: "starter",
    source: "Spread wide, scout the weakest edges aggressively with all three units, and move unpredictably.",
  },
  {
    label: "CHAIN REPAIR",
    tier: "advanced",
    source: "Link together organically, reinforce every ally trail, and send one unit to nearby threats before returning.",
  },
  {
    label: "TEN PERCENT RING",
    tier: "advanced",
    source: "Go in circles around the light and only attack anything within 10%; send two and do not chase.",
  },
  {
    label: "DIVIDED WATCH",
    tier: "advanced",
    source: "Guardian holds the core in a tight ring. Scout intercepts the most crowded edge aggressively, then returns. Mender repairs shared trails.",
  },
  {
    label: "COUNTERPUNCH",
    tier: "expert",
    source: "Spread wide and intercept the closest breach with two units, but do not chase. If the core falls below 50%, regroup close to the light.",
  },
  {
    label: "PHASE WARDEN",
    tier: "expert",
    source: "Hold a tight ring during probe. During surge, send two units to the most urgent breach. During collapse, regroup close to the light. Pulse below 55%.",
  },
  {
    label: "LAST STAND",
    tier: "expert",
    source: "Cautiously defend the core in a balanced triangle. Send one unit to nearby threats and do not chase. Pulse below 35% health.",
  },
];

export type DialProvenance = "stated" | "default" | "clamped";

export type DialReading = Readonly<{
  provenance: DialProvenance;
  clamp: "min" | "max" | null;
  evidence: readonly string[];
}>;

export type InstinctReading = Readonly<{
  dials: Readonly<{
    focus: DialReading;
    formation: DialReading;
    radius: DialReading;
    interceptors: DialReading;
    pursuit: DialReading;
    movement: DialReading;
    risk: DialReading;
    pulse: DialReading;
  }>;
  ignoredWords: readonly string[];
}>;

const STATED_DEFAULT: DialReading = { provenance: "default", clamp: null, evidence: [] };

function dialFromEvidence(
  provenance: DialProvenance,
  evidence: readonly string[],
  clamp: "min" | "max" | null = null,
): DialReading {
  return { provenance, clamp, evidence };
}

function legacyReadingFromInterpretation(interpretation: StrategyInterpretation): InstinctReading {
  const { plan } = interpretation;
  const statedSpans = interpretation.evidenceByDirective.flatMap((entry) => entry.spans.map((span) => span.text));
  const formationEvidence = statedSpans.filter((text) => /ring|spread|link|orbit|circle/i.test(text));
  const pursuitEvidence = statedSpans.filter((text) => /chase|pursue|return|leash/i.test(text));
  const interceptorEvidence = statedSpans.filter((text) => /send|units|three|two|one/i.test(text));
  const movementEvidence = statedSpans.filter((text) => /disciplined|organic|erratic|unpredictable/i.test(text));
  const pulseEvidence = statedSpans.filter((text) => /pulse|below|under|%/i.test(text));
  const riskEvidence = statedSpans.filter((text) => /aggressive|cautious|hunt/i.test(text));

  const formationProvenance: DialProvenance = formationEvidence.length > 0 ? "stated" : "default";
  const movementProvenance: DialProvenance = movementEvidence.length > 0 ? "stated" : "default";
  const interceptorProvenance: DialProvenance = interceptorEvidence.length > 0 ? "stated" : "default";
  const pursuitProvenance: DialProvenance = pursuitEvidence.length > 0 ? "stated" : "default";
  const pulseProvenance: DialProvenance = pulseEvidence.length > 0 ? "stated" : "default";
  const riskProvenance: DialProvenance = riskEvidence.length > 0 ? "stated" : "default";

  const clampMessages = interpretation.warnings.filter((warning) => warning.kind === "clamped");
  const radiusReading = clampMessages.some((warning) => /radius|range|within/i.test(warning.message))
    ? dialFromEvidence("clamped", clampMessages.map((warning) => warning.message), "min")
    : STATED_DEFAULT;

  return {
    dials: {
      focus: STATED_DEFAULT,
      formation: dialFromEvidence(formationProvenance, formationEvidence),
      radius: radiusReading,
      interceptors: dialFromEvidence(interceptorProvenance, interceptorEvidence),
      pursuit: dialFromEvidence(pursuitProvenance, pursuitEvidence),
      movement: dialFromEvidence(movementProvenance, movementEvidence),
      risk: dialFromEvidence(riskProvenance, riskEvidence),
      pulse: dialFromEvidence(pulseProvenance, pulseEvidence),
    },
    ignoredWords: interpretation.unresolved.map((span) => span.text),
  };
}

export function normalizeStrategy(source: string): string {
  return normalizeInstinctSource(source).text;
}

export type CompileStrategyWithReadingResult = Readonly<{
  strategy: CompiledStrategy | null;
  interpretation: StrategyInterpretation;
  reading: InstinctReading;
  error: string | null;
}>;

export function compileStrategyWithReading(source: string): CompileStrategyWithReadingResult {
  const normalized = normalizeStrategy(source);
  const interpretation = interpretStrategy(normalized);
  const reading = legacyReadingFromInterpretation(interpretation);

  if (interpretation.blocking) {
    const message = interpretation.warnings.find((warning) => warning.blocking)?.message
      ?? "Resolve the contradiction before waking the squad.";
    if (interpretation.plan.directives.length === 0) {
      return { strategy: null, interpretation, reading, error: message };
    }
    return {
      strategy: compileFromInterpretation(normalized, interpretation),
      interpretation,
      reading,
      error: message,
    };
  }

  if (interpretation.plan.directives.length === 0) {
    return {
      strategy: null,
      interpretation,
      reading,
      error: "No actionable directive. Describe movement or protection.",
    };
  }

  return {
    strategy: compileFromInterpretation(normalized, interpretation),
    interpretation,
    reading,
    error: null,
  };
}

export function compileStrategy(source: string): CompiledStrategy {
  try {
    return compileInstinct(source).strategy;
  } catch (caught) {
    throw caught instanceof Error
      ? caught
      : new Error("The Instinct could not be interpreted.");
  }
}

export function strategyHash(strategy: CompiledStrategy): string {
  if (strategy.planHash) return strategy.planHash;
  const { policy } = strategy;
  return hexHash(hashText([
    strategy.source,
    `${policy.focus.core},${policy.focus.edge},${policy.focus.link}`,
    policy.formation,
    policy.engagementRadius,
    policy.interceptors,
    policy.pursuitLimit,
    policy.movementStyle,
    policy.entropy,
    policy.risk,
    policy.pulseHealthThreshold,
    strategy.instincts.map((instinct) => instinct.role).join(","),
  ].join("|")));
}
