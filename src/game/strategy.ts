import { hashText, hexHash } from "./math";
import {
  GRID_ROWS,
  type CompiledStrategy,
  type Formation,
  type Instinct,
  type LightRole,
  type MovementStyle,
  type StrategyPolicy,
} from "./types";

export const DEFAULT_STRATEGY =
  "Circle the light in an organic ring. Send two units to intercept anything that enters the inner grid, then return without chasing.";

export const STRATEGY_EXAMPLES = [
  {
    label: "RING KEEPER",
    source: "Guard the core in a tight disciplined ring. Send two units within 25% and do not chase. Pulse below 45% health.",
  },
  {
    label: "EDGE HUNTER",
    source: "Spread wide, scout the weakest edges aggressively with all three units, and move unpredictably.",
  },
  {
    label: "CHAIN REPAIR",
    source: "Link together organically, reinforce every ally trail, and send one unit to nearby threats before returning.",
  },
  {
    label: "TEN PERCENT RING",
    source: "Go in circles around the light and only attack anything within 10%; send two and do not chase.",
  },
] as const;

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

export function normalizeStrategy(source: string): string {
  return source.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 280);
}

const SIGNALS = {
  core: ["core", "protect", "guard", "center", "centre", "ring", "circle", "circles", "orbit", "light", "hold"],
  edge: ["edge", "edges", "weak", "weakest", "pressure", "spread", "scout", "wide", "perimeter"],
  link: ["ally", "allies", "together", "link", "linked", "repair", "repairs", "reinforce", "crossing", "chain", "trail"],
  response: ["attack", "kill", "intercept", "engage", "defend", "chase", "pursue", "return", "send"],
  pulse: ["pulse", "danger", "peak"],
  aggressive: ["aggressive", "aggressively", "rush", "hunt", "hunter", "fast", "kill", "attack"],
  cautious: ["cautious", "safe", "careful", "tight", "patient", "only", "return"],
  disciplined: ["disciplined", "precise", "precisely", "steady", "exact", "tightly"],
  organic: ["organic", "naturally", "flow", "swarm", "fluid"],
  erratic: ["random", "randomly", "unpredictable", "unpredictably", "erratic", "chaotic", "chaos"],
} as const;

function hasWord(source: string, word: string): boolean {
  return new RegExp(`(?:^|[^a-z])${word}(?:$|[^a-z])`, "i").test(source);
}

function matchedWords(source: string, words: readonly string[]): string[] {
  return words.filter((word) => hasWord(source, word));
}

function matchedPhrases(source: string, phrases: readonly string[]): string[] {
  const lowered = source.toLowerCase();
  return phrases.filter((phrase) => lowered.includes(phrase));
}

const STATED_DEFAULT: DialReading = { provenance: "default", clamp: null, evidence: [] };

function stated(evidence: readonly string[]): DialReading {
  return { provenance: "stated", clamp: null, evidence };
}

function clamped(clamp: "min" | "max", evidence: readonly string[]): DialReading {
  return { provenance: "clamped", clamp, evidence };
}

function boundedReading(requested: number, minimum: number, maximum: number, evidence: readonly string[]): DialReading {
  if (requested < minimum) return clamped("min", evidence);
  if (requested > maximum) return clamped("max", evidence);
  return stated(evidence);
}

function readThreshold(source: string): { threshold: number; reading: DialReading } {
  const match = source.match(/(?:below|under|at)\s+(\d{1,2})\s*%/i);
  if (!match) return { threshold: 35, reading: STATED_DEFAULT };
  const requested = Number(match[1]);
  return {
    threshold: Math.min(80, Math.max(15, requested)),
    reading: boundedReading(requested, 15, 80, [match[0]]),
  };
}

function percentages(coreHits: number, edgeHits: number, linkHits: number) {
  const raw = [2 + coreHits * 3, 2 + edgeHits * 3, 2 + linkHits * 3];
  const total = raw.reduce((sum, value) => sum + value, 0);
  const scaled = raw.map((value) => value * 100);
  const result = scaled.map((value) => Math.floor(value / total));
  const remainder = 100 - result.reduce((sum, value) => sum + value, 0);
  const order = scaled
    .map((value, index) => ({ index, fraction: value % total }))
    .toSorted((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remainder; index += 1) result[order[index].index] += 1;
  return { core: result[0], edge: result[1], link: result[2] };
}

function readFormation(source: string): { formation: Formation; reading: DialReading } {
  const ringWords = matchedWords(source, ["ring", "circle", "circles", "orbit", "center", "centre"]);
  const ringPhrases = matchedPhrases(source, ["around the light", "around the core", "go around"]);
  if (ringWords.length > 0 || ringPhrases.length > 0) {
    return { formation: "ring", reading: stated([...ringWords, ...ringPhrases]) };
  }
  const spreadWords = matchedWords(source, ["spread", "wide", "edges", "perimeter"]);
  if (spreadWords.length > 0) return { formation: "spread", reading: stated(spreadWords) };
  const linkWords = matchedWords(source, ["link", "together", "chain", "crossing"]);
  if (linkWords.length > 0) return { formation: "link", reading: stated(linkWords) };
  return { formation: "balanced", reading: STATED_DEFAULT };
}

function readRadius(source: string, formation: Formation): { radius: number; reading: DialReading } {
  const cells = source.match(/(?:within|inside|radius(?:\s+of)?|range(?:\s+of)?)\s+(\d{1,2})\s*(?:cells?|tiles?)/i);
  if (cells) {
    const requested = Number(cells[1]);
    return {
      radius: Math.min(14, Math.max(4, requested)),
      reading: boundedReading(requested, 4, 14, [cells[0]]),
    };
  }
  const percent = source.match(/(?:within|inside|radius(?:\s+of)?|range(?:\s+of)?)\s+(\d{1,3})\s*%/i);
  if (percent) {
    const requested = Math.round((Number(percent[1]) / 100) * GRID_ROWS);
    return {
      radius: Math.min(14, Math.max(4, requested)),
      reading: boundedReading(requested, 4, 14, [percent[0]]),
    };
  }
  if (formation === "ring") return { radius: 5, reading: STATED_DEFAULT };
  if (formation === "spread") return { radius: 14, reading: STATED_DEFAULT };
  if (formation === "link") return { radius: 8, reading: STATED_DEFAULT };
  return { radius: 9, reading: STATED_DEFAULT };
}

function readInterceptors(source: string): { interceptors: number; reading: DialReading } {
  const numberWords: Record<string, number> = { one: 1, two: 2, three: 3 };
  const wordMatch = source.match(/(?:send|use|with)?\s*(one|two|three|[1-3])\s+(?:units?|lights?|interceptors?)/i)
    ?? source.match(/(?:send|use|with)\s+(one|two|three|[1-3])(?:\b|\s)/i);
  if (!wordMatch) {
    const phrases = matchedPhrases(source, ["all three", "whole squad", "everyone"]);
    if (phrases.length > 0) return { interceptors: 3, reading: stated(phrases) };
    return { interceptors: 2, reading: STATED_DEFAULT };
  }
  return {
    interceptors: Math.min(3, Math.max(1, numberWords[wordMatch[1].toLowerCase()] ?? Number(wordMatch[1]))),
    reading: stated([wordMatch[0].trim()]),
  };
}

function readPursuit(source: string): { pursuitLimit: number; reading: DialReading } {
  const noChase = matchedPhrases(source, ["do not chase", "don't chase", "never chase", "no chase", "without chasing", "return immediately"]);
  if (noChase.length > 0) return { pursuitLimit: 0, reading: stated(noChase) };
  // Allow an object between the verb and the distance ("chase threats for 4 cells"),
  // but never across sentence punctuation.
  const explicit = source.match(/(?:chase|pursue|pursuit)[^.;!?]*?(\d{1,2})\s*(?:cells?|tiles?)/i);
  if (explicit) {
    const requested = Number(explicit[1]);
    return {
      pursuitLimit: Math.min(8, Math.max(0, requested)),
      reading: boundedReading(requested, 0, 8, [explicit[0]]),
    };
  }
  const shortChase = matchedPhrases(source, ["short chase", "brief pursuit", "return quickly"]);
  if (shortChase.length > 0) return { pursuitLimit: 2, reading: stated(shortChase) };
  const chaseWords = matchedWords(source, ["chase", "pursue", "hunt", "hunter"]);
  if (chaseWords.length > 0) return { pursuitLimit: 6, reading: stated(chaseWords) };
  return { pursuitLimit: 2, reading: STATED_DEFAULT };
}

function readMovement(source: string): { movementStyle: MovementStyle; entropy: number; reading: DialReading } {
  const erratic = matchedWords(source, SIGNALS.erratic);
  if (erratic.length > 0) return { movementStyle: "erratic", entropy: 78, reading: stated(erratic) };
  const disciplined = matchedWords(source, SIGNALS.disciplined);
  if (disciplined.length > 0) return { movementStyle: "disciplined", entropy: 10, reading: stated(disciplined) };
  const organic = matchedWords(source, SIGNALS.organic);
  if (organic.length > 0) return { movementStyle: "organic", entropy: 42, reading: stated(organic) };
  return { movementStyle: "organic", entropy: 34, reading: STATED_DEFAULT };
}

const FUNCTION_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "then", "than", "that", "this", "these", "those",
  "to", "of", "in", "on", "at", "with", "for", "from", "into", "onto", "near", "by", "as",
  "if", "when", "while", "after", "before", "during", "up", "down", "out", "off", "over",
  "under", "between", "through", "against", "around", "it", "its", "is", "are", "be",
  "been", "being", "was", "were", "am", "do", "does", "did", "not", "no", "don't",
  "they", "them", "their", "he", "she", "we", "us", "our", "you", "your", "i", "me", "my",
  "any", "anything", "everything", "something", "nothing", "some", "each", "every",
  "much", "many", "more", "most", "less", "least", "very", "really", "please", "just",
  "also", "too", "again", "still", "will", "would", "shall", "should", "can", "could",
  "may", "might", "must", "get", "gets", "got", "let", "lets", "go", "goes", "going",
  "who", "what", "which", "where", "how", "why", "there", "here", "because", "so",
]);

function ignoredWordsFrom(
  source: string,
  matchedSignals: readonly string[],
  dials: readonly DialReading[],
): string[] {
  const consumed = new Set(matchedSignals.map((signal) => signal.toLowerCase()));
  for (const dial of dials) {
    for (const fragment of dial.evidence) {
      for (const word of fragment.toLowerCase().match(/[a-z']+/g) ?? []) consumed.add(word);
    }
  }
  const seen = new Set<string>();
  const ignored: string[] = [];
  for (const word of source.toLowerCase().match(/[a-z']+/g) ?? []) {
    if (consumed.has(word) || FUNCTION_WORDS.has(word) || seen.has(word)) continue;
    seen.add(word);
    ignored.push(word);
  }
  return ignored;
}

function compilePolicy(source: string): { policy: StrategyPolicy; reading: InstinctReading } {
  const core = matchedWords(source, SIGNALS.core);
  const edge = matchedWords(source, SIGNALS.edge);
  const link = matchedWords(source, SIGNALS.link);
  const response = matchedWords(source, SIGNALS.response);
  const pulse = matchedWords(source, SIGNALS.pulse);
  const aggressive = matchedWords(source, SIGNALS.aggressive);
  const cautious = matchedWords(source, SIGNALS.cautious);
  const disciplined = matchedWords(source, SIGNALS.disciplined);
  const organic = matchedWords(source, SIGNALS.organic);
  const erratic = matchedWords(source, SIGNALS.erratic);
  const allSignals = [...new Set([
    ...core,
    ...edge,
    ...link,
    ...response,
    ...pulse,
    ...aggressive,
    ...cautious,
    ...disciplined,
    ...organic,
    ...erratic,
  ])];
  if (allSignals.length === 0) {
    throw new Error("Describe movement or protection. Try: circle the light and send two units after anything nearby.");
  }
  const formation = readFormation(source);
  const radius = readRadius(source, formation.formation);
  const interceptors = readInterceptors(source);
  const pursuit = readPursuit(source);
  const movement = readMovement(source);
  const threshold = readThreshold(source);

  const focusHits = [...new Set([...core, ...edge, ...link])];
  const focusReading = focusHits.length === 0 ? STATED_DEFAULT : stated(focusHits);

  const riskWords = [...new Set([...aggressive, ...cautious])];
  const rawRisk = 50 + aggressive.length * 15 - cautious.length * 15;
  const riskReading = riskWords.length === 0
    ? STATED_DEFAULT
    : boundedReading(rawRisk, 0, 100, riskWords);

  const dials = {
    focus: focusReading,
    formation: formation.reading,
    radius: radius.reading,
    interceptors: interceptors.reading,
    pursuit: pursuit.reading,
    movement: movement.reading,
    risk: riskReading,
    pulse: threshold.reading,
  } as const;

  return {
    policy: {
      focus: percentages(core.length, edge.length, link.length),
      formation: formation.formation,
      engagementRadius: radius.radius,
      interceptors: interceptors.interceptors,
      pursuitLimit: pursuit.pursuitLimit,
      movementStyle: movement.movementStyle,
      entropy: movement.entropy,
      risk: Math.min(100, Math.max(0, rawRisk)),
      pulseHealthThreshold: threshold.threshold,
      matchedSignals: allSignals,
    },
    reading: {
      dials,
      ignoredWords: ignoredWordsFrom(source, allSignals, Object.values(dials)),
    },
  };
}

function roleOrder(source: string): readonly LightRole[] {
  const normalized = source.toLowerCase();
  const weighted: Array<{ role: LightRole; weight: number }> = [
    { role: "guardian", weight: Number(normalized.includes("core")) + Number(normalized.includes("protect")) + Number(normalized.includes("ring")) },
    { role: "scout", weight: Number(normalized.includes("weak")) + Number(normalized.includes("edge")) + Number(normalized.includes("intercept")) },
    { role: "mender", weight: Number(normalized.includes("reinforce")) + Number(normalized.includes("ally")) + Number(normalized.includes("repair")) },
  ];
  return weighted
    .toSorted((a, b) => b.weight - a.weight || a.role.localeCompare(b.role))
    .map(({ role }) => role);
}

export function compileStrategyWithReading(source: string): { strategy: CompiledStrategy; reading: InstinctReading } {
  const normalized = normalizeStrategy(source);
  if (!normalized) throw new Error("Write one sentence, or launch the default Instinct.");
  const { policy, reading } = compilePolicy(normalized);
  const instincts: Instinct[] = roleOrder(normalized).map((role) => ({
    role,
    label: ROLE_LABELS[role],
    description: ROLE_DESCRIPTIONS[role],
  }));
  return {
    strategy: { source: normalized, policy, instincts, compiler: "local-prototype" },
    reading,
  };
}

export function compileStrategy(source: string): CompiledStrategy {
  return compileStrategyWithReading(source).strategy;
}

export function strategyHash(strategy: CompiledStrategy): string {
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
