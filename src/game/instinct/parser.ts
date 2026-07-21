import { GRID_ROWS } from "../types";
import {
  ACTION_PHRASES,
  ENGAGEMENT_PHRASES,
  FORMATION_PHRASES,
  MOVEMENT_PHRASES,
  NUMBER_WORDS,
  PHASE_PHRASES,
  TARGET_PHRASES,
} from "./lexicon";
import { findPhraseSpans, spanFromNormalized } from "./normalize";
import type {
  CanonicalDirective,
  Clause,
  EngagementStyle,
  NormalizedText,
  SourceSpan,
  StrategyAction,
  StrategyActor,
  StrategyCondition,
  StrategyContinuation,
  StrategyTarget,
} from "./types";

export type ParsedExtraction = Readonly<{
  formationShape: "ring" | "spread" | "link" | "balanced" | null;
  formationSpans: readonly SourceSpan[];
  radius: number | null;
  radiusClamped: boolean;
  radiusSpans: readonly SourceSpan[];
  movementStyle: "disciplined" | "organic" | "erratic" | null;
  movementSpans: readonly SourceSpan[];
  engagementStyle: EngagementStyle | null;
  engagementSpans: readonly SourceSpan[];
  responderCount: 1 | 2 | 3 | null;
  responderSpans: readonly SourceSpan[];
  leashCells: number | null;
  leashExplicit: boolean;
  leashSpans: readonly SourceSpan[];
  noChase: boolean;
  noChaseSpans: readonly SourceSpan[];
  noAttack: boolean;
  noAttackSpans: readonly SourceSpan[];
  pulsePercent: number | null;
  pulseClamped: boolean;
  pulseSpans: readonly SourceSpan[];
  pulseTarget: "highest-pressure-sector" | "nearest-core-breach";
  directives: readonly CanonicalDirective[];
  directiveSpans: readonly (readonly SourceSpan[])[];
  consumedSpans: readonly SourceSpan[];
  formationConflict: boolean;
  formationChoices: readonly string[];
}>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function wordNumber(text: string): number | null {
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`(?:^|[^a-z])${word}(?:$|[^a-z])`, "i").test(text)) return value;
  }
  return null;
}

function firstMatch(
  normalized: NormalizedText,
  groups: ReadonlyArray<Readonly<{ phrases: readonly string[]; [key: string]: unknown }>>,
  options: Readonly<{ allowVerbSuffix?: boolean }> = {},
): { entry: (typeof groups)[number]; spans: SourceSpan[] } | null {
  let best: { entry: (typeof groups)[number]; spans: SourceSpan[]; length: number } | null = null;
  for (const entry of groups) {
    for (const phrase of entry.phrases) {
      const spans = findPhraseSpans(normalized, phrase, options);
      if (spans.length === 0) continue;
      if (!best || phrase.length > best.length) {
        best = { entry, spans, length: phrase.length };
      }
    }
  }
  return best ? { entry: best.entry, spans: best.spans } : null;
}

function parseRadius(normalized: NormalizedText): {
  radius: number | null;
  clamped: boolean;
  spans: SourceSpan[];
} {
  const text = normalized.text;
  const cellMatch = text.match(
    /(?:within|inside|radius|range)\s+(\d+|one|two|three|four|five|six|seven|eight)\s*(?:cells?|tiles?)/i,
  );
  if (cellMatch) {
    const raw = NUMBER_WORDS[cellMatch[1]!.toLowerCase()] ?? Number(cellMatch[1]);
    const clamped = raw < 4 || raw > 14;
    const start = cellMatch.index ?? 0;
    return {
      radius: clamp(raw, 4, 14),
      clamped,
      spans: [spanFromNormalized(normalized, start, start + cellMatch[0]!.length)],
    };
  }
  const percentMatch = text.match(
    /(?:within|inside|radius|range|only\s+attack[^.]*within)\s+(\d+)\s*%/i,
  );
  if (percentMatch) {
    const percent = Number(percentMatch[1]);
    const cells = Math.round((percent / 100) * GRID_ROWS);
    const clamped = cells < 4 || cells > 14 || percent < 10;
    const start = percentMatch.index ?? 0;
    return {
      radius: clamp(cells, 4, 14),
      clamped,
      spans: [spanFromNormalized(normalized, start, start + percentMatch[0]!.length)],
    };
  }
  if (/\btight\b|\bclose\b/i.test(text)) {
    return { radius: 5, clamped: false, spans: findPhraseSpans(normalized, "tight").concat(findPhraseSpans(normalized, "close")) };
  }
  if (/\bwide\b|\bfar\b/i.test(text)) {
    return { radius: 14, clamped: false, spans: findPhraseSpans(normalized, "wide") };
  }
  return { radius: null, clamped: false, spans: [] };
}

function parseResponder(normalized: NormalizedText): {
  count: 1 | 2 | 3 | null;
  spans: SourceSpan[];
} {
  const text = normalized.text.toLowerCase();
  if (/all three|whole squad|everyone|all lights/.test(text)) {
    const spans = findPhraseSpans(normalized, "all three")
      .concat(findPhraseSpans(normalized, "whole squad"))
      .concat(findPhraseSpans(normalized, "everyone"))
      .concat(findPhraseSpans(normalized, "all lights"));
    return { count: 3, spans };
  }
  const match = text.match(
    /(?:send|use|with)\s+(one|two|three|[123])\s+(?:units?|lights?|interceptors?)/i,
  );
  if (match) {
    const raw = NUMBER_WORDS[match[1]!.toLowerCase()] ?? Number(match[1]);
    const count = clamp(raw, 1, 3) as 1 | 2 | 3;
    const start = match.index ?? 0;
    return {
      count,
      spans: [spanFromNormalized(normalized, start, start + match[0]!.length)],
    };
  }
  return { count: null, spans: [] };
}

function parseLeash(normalized: NormalizedText, negated: boolean): {
  leash: number | null;
  explicit: boolean;
  noChase: boolean;
  spans: SourceSpan[];
} {
  const text = normalized.text.toLowerCase();
  const noChasePhrases = ["do not chase", "don't chase", "dont chase", "never chase", "no chase", "without chasing", "never leave"];
  const noChaseSpans = noChasePhrases.flatMap((phrase) => findPhraseSpans(normalized, phrase));
  if (noChaseSpans.length > 0 || (negated && /\bchase\b|\bpursue\b|\bhunt\b/.test(text))) {
    return { leash: 0, explicit: true, noChase: true, spans: noChaseSpans };
  }
  const distance = text.match(
    /(?:chase|pursue|pursuit|hunt|for)\s+(\d+|one|two|three|four|five|six|seven|eight)\s*cells?/i,
  );
  if (distance) {
    const raw = NUMBER_WORDS[distance[1]!.toLowerCase()] ?? Number(distance[1]);
    const start = distance.index ?? 0;
    return {
      leash: clamp(raw, 0, 8),
      explicit: true,
      noChase: false,
      spans: [spanFromNormalized(normalized, start, start + distance[0]!.length)],
    };
  }
  if (/\bshort chase\b|\bbrief pursuit\b|\breturn quickly\b/.test(text)) {
    return { leash: 2, explicit: true, noChase: false, spans: findPhraseSpans(normalized, "short chase") };
  }
  return { leash: null, explicit: false, noChase: false, spans: [] };
}

function parsePulse(normalized: NormalizedText): {
  percent: number | null;
  clamped: boolean;
  spans: SourceSpan[];
  target: "highest-pressure-sector" | "nearest-core-breach";
} {
  const match = normalized.text.match(
    /(?:below|under|at)\s+(\d+)\s*%/i,
  );
  let target: "highest-pressure-sector" | "nearest-core-breach" = "highest-pressure-sector";
  if (/nearest.?core|toward the core/.test(normalized.text.toLowerCase())) {
    target = "nearest-core-breach";
  }
  if (!match) return { percent: null, clamped: false, spans: [], target };
  const raw = Number(match[1]);
  const clamped = raw < 15 || raw > 80;
  const start = match.index ?? 0;
  return {
    percent: clamp(raw, 15, 80),
    clamped,
    spans: [spanFromNormalized(normalized, start, start + match[0]!.length)],
    target,
  };
}

function parseCondition(clause: Clause, normalized: NormalizedText): StrategyCondition {
  return parseConditionWithSpans(clause, normalized).condition;
}

function parseConditionWithSpans(
  clause: Clause,
  normalized: NormalizedText,
): { condition: StrategyCondition; spans: SourceSpan[] } {
  const text = clause.text.toLowerCase();
  for (const entry of PHASE_PHRASES) {
    for (const phrase of entry.phrases) {
      if (text.includes(phrase)) {
        return {
          condition: { kind: "phase", phase: entry.phase },
          spans: findPhraseSpans(normalized, phrase),
        };
      }
    }
  }
  const health = text.match(/(?:falls?|drops?|below|under)\s*(?:below|under)?\s*(\d+)\s*%/);
  if (health || /core falls below|core health/.test(text)) {
    const percent = health ? clamp(Number(health[1]), 15, 80) : 35;
    const start = health?.index ?? 0;
    return {
      condition: { kind: "core-health-below", percent },
      spans: health ? [spanFromNormalized(normalized, start, start + health[0]!.length)] : [],
    };
  }
  const within = text.match(/(?:within|reaches?|gets? within)\s+(\d+|one|two|three|four|five|six|seven|eight)\s*cells?/);
  if (within || /inner grid|reaches the inner/.test(text)) {
    const cells = within
      ? clamp(NUMBER_WORDS[within[1]!.toLowerCase()] ?? Number(within[1]), 1, 14)
      : 6;
    const start = within?.index ?? 0;
    return {
      condition: { kind: "threat-within", cells },
      spans: within ? [spanFromNormalized(normalized, start, start + within[0]!.length)] : [],
    };
  }
  if (/only when/.test(text) && /corruption|threat|breach/.test(text)) {
    return { condition: { kind: "threat-within", cells: 6 }, spans: [] };
  }
  return { condition: { kind: "always" }, spans: [] };
}

function defaultTargetForAction(action: StrategyAction): StrategyTarget {
  switch (action) {
    case "repair":
    case "follow":
      return "shared-trail";
    case "intercept":
      return "nearest-breach";
    case "hold":
    case "orbit":
    case "screen":
    case "regroup":
      return "core";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

function continuationFromClause(clause: Clause): StrategyContinuation {
  const text = clause.text.toLowerCase();
  if (/return|come back|come home|regroup|retreat|fall back/.test(text)) return "return";
  if (/hold|stay|remain/.test(text) && !/intercept|hunt|attack/.test(text)) return "hold";
  return "continue";
}

function extractDirectiveFromClause(
  clause: Clause,
  globals: {
    engagementStyle: EngagementStyle;
    responderCount: 1 | 2 | 3 | null;
    leashCells: number | null;
    noChase: boolean;
    noAttack: boolean;
  },
): { directive: CanonicalDirective; spans: SourceSpan[] } | null {
  const local: NormalizedText = {
    text: clause.text,
    indexMap: Array.from({ length: clause.text.length }, (_, index) => clause.start + index),
  };

  if (clause.negated && /\bleave\b|\bleaves\b|\bleaving\b/.test(clause.text.toLowerCase())) {
    return {
      directive: {
        actor: clause.actor ?? "guardian",
        action: "hold",
        target: "core",
        condition: parseCondition(clause, local),
        responderCount: null,
        leashCells: 0,
        continuation: "hold",
        engagementStyle: "cautious",
        priority: 1,
      },
      spans: [spanFromNormalized(local, 0, clause.text.length)],
    };
  }

  if (clause.negated && /\battack\b|\bhunt\b|\bengage\b|\bintercept\b/.test(clause.text.toLowerCase())) {
    // Negated attack → hold core
    return {
      directive: {
        actor: clause.actor ?? "squad",
        action: "hold",
        target: "core",
        condition: parseCondition(clause, local),
        responderCount: null,
        leashCells: 0,
        continuation: "hold",
        engagementStyle: "cautious",
        priority: 1,
      },
      spans: [spanFromNormalized(local, 0, clause.text.length)],
    };
  }

  const actionHit = firstMatch(local, ACTION_PHRASES, { allowVerbSuffix: true });
  if (!actionHit) return null;
  const action = actionHit.entry.action as StrategyAction;

  if (globals.noAttack && action === "intercept") return null;

  const targetHit = firstMatch(local, TARGET_PHRASES);
  const target = (targetHit?.entry.target as StrategyTarget | undefined)
    ?? defaultTargetForAction(action);

  const actor: StrategyActor = clause.actor
    ?? (action === "repair" ? "mender" : action === "intercept" ? "scout" : action === "orbit" || action === "hold" || action === "screen" ? "guardian" : "squad");

  let leash = globals.leashCells;
  if (globals.noChase) leash = 0;
  const localLeash = parseLeash(local, clause.negated);
  if (localLeash.explicit) leash = localLeash.leash;

  const localResponders = parseResponder(local);
  const conditionHit = parseConditionWithSpans(clause, local);

  return {
    directive: {
      actor,
      action,
      target,
      condition: conditionHit.condition,
      responderCount: localResponders.count ?? globals.responderCount,
      leashCells: leash,
      continuation: continuationFromClause(clause),
      engagementStyle: globals.engagementStyle,
      priority: actor === "squad" ? 2 : 1,
    },
    spans: [
      ...actionHit.spans,
      ...(targetHit?.spans ?? []),
      ...localResponders.spans,
      ...localLeash.spans,
      ...conditionHit.spans,
    ],
  };
}

export function extractFromText(
  normalized: NormalizedText,
  clauses: readonly Clause[],
): ParsedExtraction {
  const consumed: SourceSpan[] = [];

  const formationHits = FORMATION_PHRASES
    .map((entry) => ({
      shape: entry.shape,
      spans: entry.phrases.flatMap((phrase) => findPhraseSpans(normalized, phrase)),
    }))
    .filter((entry) => entry.spans.length > 0);

  const distinctShapes = [...new Set(formationHits.map((hit) => hit.shape))];
  const formationConflict = distinctShapes.includes("ring") && distinctShapes.includes("spread");
  let formationShape: ParsedExtraction["formationShape"] = null;
  if (!formationConflict && formationHits.length > 0) {
    // Precedence when not blocking: ring > spread > link > balanced
    const order = ["ring", "spread", "link", "balanced"] as const;
    formationShape = order.find((shape) => distinctShapes.includes(shape)) ?? null;
  }
  const formationSpans = formationHits.flatMap((hit) => hit.spans);
  consumed.push(...formationSpans);

  const radius = parseRadius(normalized);
  consumed.push(...radius.spans);

  const movementHit = firstMatch(normalized, MOVEMENT_PHRASES);
  const movementStyle = movementHit
    ? (movementHit.entry.style as "disciplined" | "organic" | "erratic")
    : null;
  if (movementHit) consumed.push(...movementHit.spans);

  const engagementHit = firstMatch(normalized, ENGAGEMENT_PHRASES);
  const engagementStyle = engagementHit
    ? (engagementHit.entry.style as EngagementStyle)
    : null;
  if (engagementHit) consumed.push(...engagementHit.spans);

  const responders = parseResponder(normalized);
  consumed.push(...responders.spans);

  const leash = parseLeash(normalized, false);
  consumed.push(...leash.spans);

  const noAttackSpans = ["do not attack", "don't attack", "never attack", "do not engage"]
    .flatMap((phrase) => findPhraseSpans(normalized, phrase));
  const noAttack = noAttackSpans.length > 0;
  consumed.push(...noAttackSpans);

  const pulse = parsePulse(normalized);
  consumed.push(...pulse.spans);

  const globals = {
    engagementStyle: engagementStyle ?? "balanced",
    responderCount: responders.count,
    leashCells: leash.leash,
    noChase: leash.noChase,
    noAttack,
  };

  const directives: CanonicalDirective[] = [];
  const directiveSpans: SourceSpan[][] = [];
  for (const clause of clauses) {
    const extracted = extractDirectiveFromClause(clause, globals);
    if (!extracted) continue;
    directives.push(extracted.directive);
    directiveSpans.push([...extracted.spans]);
    consumed.push(...extracted.spans);
  }

  // Ensure at least a defensive default directive when formation/hold language present.
  if (directives.length === 0 && (formationShape || radius.radius !== null)) {
    directives.push({
      actor: "guardian",
      action: formationShape === "ring" ? "orbit" : "screen",
      target: "core",
      condition: { kind: "always" },
      responderCount: responders.count,
      leashCells: leash.noChase ? 0 : leash.leash,
      continuation: "hold",
      engagementStyle: globals.engagementStyle,
      priority: 1,
    });
    directiveSpans.push(formationSpans);
  }

  // Propagate global responder count onto intercept directives that omitted it.
  const withResponders = directives.map((directive) => {
    if (directive.responderCount !== null || responders.count === null) return directive;
    if (directive.action === "intercept" || directive.actor === "squad" || directive.actor === "scout") {
      return { ...directive, responderCount: responders.count };
    }
    return directive;
  });

  return {
    formationShape,
    formationSpans,
    radius: radius.radius,
    radiusClamped: radius.clamped,
    radiusSpans: radius.spans,
    movementStyle,
    movementSpans: movementHit?.spans ?? [],
    engagementStyle,
    engagementSpans: engagementHit?.spans ?? [],
    responderCount: responders.count,
    responderSpans: responders.spans,
    leashCells: leash.leash,
    leashExplicit: leash.explicit,
    leashSpans: leash.spans,
    noChase: leash.noChase,
    noChaseSpans: leash.spans,
    noAttack,
    noAttackSpans,
    pulsePercent: pulse.percent,
    pulseClamped: pulse.clamped,
    pulseSpans: pulse.spans,
    pulseTarget: pulse.target,
    directives: withResponders,
    directiveSpans,
    consumedSpans: consumed,
    formationConflict,
    formationChoices: formationConflict ? ["Ring", "Spread"] : [],
  };
}
