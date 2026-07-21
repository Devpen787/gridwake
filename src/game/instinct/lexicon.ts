/** Bounded paraphrase lexicon for Instinct Runtime v2. */

import type {
  EngagementStyle,
  StrategyAction,
  StrategyActor,
  StrategyTarget,
} from "./types";

export const NUMBER_WORDS: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
};

export const ACTOR_PHRASES: ReadonlyArray<Readonly<{ phrase: string; actor: StrategyActor }>> = [
  { phrase: "all three", actor: "squad" },
  { phrase: "all lights", actor: "squad" },
  { phrase: "whole squad", actor: "squad" },
  { phrase: "everyone", actor: "squad" },
  { phrase: "the squad", actor: "squad" },
  { phrase: "the guardian", actor: "guardian" },
  { phrase: "the scout", actor: "scout" },
  { phrase: "the mender", actor: "mender" },
  { phrase: "guardian", actor: "guardian" },
  { phrase: "mender", actor: "mender" },
  // "scout" alone is often a verb ("scout the edges"); only treat as actor when clause-leading.
];

export const NEGATION_PHRASES = [
  "do not",
  "don't",
  "dont",
  "never",
  "without",
  "avoid",
  "stay away from",
] as const;

export const ACTION_PHRASES: ReadonlyArray<Readonly<{ phrases: readonly string[]; action: StrategyAction }>> = [
  {
    action: "orbit",
    phrases: [
      "circle", "orbit", "surround", "form a ring", "rotate around", "go in circles", "go around",
      "revolve around", "loop around", "patrol",
    ],
  },
  {
    action: "hold",
    phrases: [
      "hold", "remain", "anchor", "hug the core", "hug the light", "stay close", "stay here",
      "camp", "stand guard", "stand fast", "stay put",
    ],
  },
  {
    action: "screen",
    phrases: ["guard", "protect", "shield", "screen", "defend", "cover", "wall off", "safeguard", "watch over"],
  },
  {
    action: "intercept",
    phrases: [
      "intercept",
      "intersept",
      "engage",
      "stop",
      "cut off",
      "respond to",
      "attack",
      "hunt",
      "hunter",
      "scout the",
      "scout",
      "send",
      "chase down",
      "neutralize",
      "purge",
      "strike",
      "counter",
      "push back",
    ],
  },
  {
    action: "repair",
    phrases: ["repair", "mend", "stitch", "reinforce", "restore", "close the grid", "heal", "patch", "weld", "rebuild"],
  },
  {
    action: "regroup",
    phrases: [
      "return", "come back", "come home", "regroup", "retreat", "fall back", "return immediately",
      "rally", "pull back", "recall", "withdraw",
    ],
  },
  {
    action: "follow",
    phrases: ["follow", "link together", "stay with", "stays with", "stay with the trails", "escort", "shadow"],
  },
];

export const TARGET_PHRASES: ReadonlyArray<Readonly<{ phrases: readonly string[]; target: StrategyTarget; label: string }>> = [
  {
    target: "core",
    label: "the core",
    phrases: ["core", "light", "center", "centre", "the light", "the core", "heart", "nucleus", "beacon"],
  },
  {
    target: "highest-pressure-sector",
    label: "highest-pressure boundary sector",
    phrases: [
      "weakest edge",
      "weakest edges",
      "busiest edge",
      "densest breach",
      "densest sector",
      "most crowded sector",
      "most crowded edge",
      "highest-pressure sector",
      "highest pressure sector",
      "worst edge",
      "hottest sector",
      "hottest edge",
      "heaviest breach",
      "biggest cluster",
    ],
  },
  {
    target: "nearest-breach",
    label: "nearest breach",
    phrases: [
      "nearest breach", "closest breach", "closest threat", "nearby threats", "nearby threat",
      "closest corruption", "nearest intruder", "closest invader",
    ],
  },
  {
    target: "highest-urgency-breach",
    label: "most urgent breach",
    phrases: [
      "most urgent breach", "highest-urgency breach", "highest urgency",
      "most dangerous breach", "biggest threat", "most critical breach",
    ],
  },
  {
    target: "shared-trail",
    label: "shared trails",
    phrases: ["shared trail", "shared trails", "ally trail", "ally trails", "crossing", "crossings", "trail"],
  },
  {
    target: "ally",
    label: "allies",
    phrases: ["ally", "allies", "together", "teammates"],
  },
];

export const FORMATION_PHRASES: ReadonlyArray<Readonly<{ phrases: readonly string[]; shape: "ring" | "spread" | "link" | "balanced" }>> = [
  { shape: "ring", phrases: ["ring", "circle", "orbit", "around the light", "around the core", "tight ring", "close orbit", "halo", "encircle"] },
  { shape: "spread", phrases: ["spread", "spread wide", "wide", "perimeter", "fan out", "scatter", "corners"] },
  { shape: "link", phrases: ["link", "chain", "linked", "convoy", "chained", "daisy chain"] },
  { shape: "balanced", phrases: ["balanced", "triangle"] },
];

export const MOVEMENT_PHRASES: ReadonlyArray<Readonly<{ phrases: readonly string[]; style: "disciplined" | "organic" | "erratic" }>> = [
  { style: "erratic", phrases: ["unpredictably", "unpredictable", "erratic", "chaotic", "randomly", "random", "chaos", "wild", "wildly", "frantically", "jittery"] },
  { style: "disciplined", phrases: ["disciplined", "steady", "precisely", "precise", "exact", "tightly", "steadily", "rigid", "strict", "military", "orderly"] },
  { style: "organic", phrases: ["organic", "organically", "naturally", "fluid", "swarm", "flow", "gracefully", "smooth", "smoothly", "loose", "loosely"] },
];

export const ENGAGEMENT_PHRASES: ReadonlyArray<Readonly<{ phrases: readonly string[]; style: EngagementStyle }>> = [
  { style: "aggressive", phrases: ["aggressively", "aggressive", "rush", "fast", "relentless", "relentlessly", "boldly", "fearlessly"] },
  { style: "cautious", phrases: ["cautiously", "cautious", "safe", "careful", "patient", "carefully", "conservative", "timidly", "warily"] },
  { style: "balanced", phrases: ["balanced"] },
];

export const PHASE_PHRASES: ReadonlyArray<Readonly<{ phrases: readonly string[]; phase: "probe" | "surge" | "collapse" }>> = [
  { phase: "probe", phrases: ["during probe", "in probe", "early on", "at the start", "early game"] },
  { phase: "surge", phrases: ["during surge", "in surge", "midgame", "mid game"] },
  { phase: "collapse", phrases: ["during collapse", "in collapse", "at the end", "late game", "endgame"] },
];

export const CONNECTORS = ["but", "then", "when", "if", "during", "after", "until", "unless"] as const;

export const FUNCTION_WORDS = new Set([
  "a", "an", "the", "to", "and", "or", "of", "in", "on", "at", "for", "with", "from", "by",
  "that", "this", "it", "its", "as", "be", "is", "are", "was", "were", "into", "anything",
  "that", "gets", "get", "before", "while", "every", "only", "move", "moves", "moving",
  "units", "unit", "lights", "light", "cells", "cell", "percent", "health", "corruption",
]);

export const SPELLING_FIXES: Readonly<Record<string, string>> = {
  intersept: "intercept",
  agressively: "aggressively",
  unpredicably: "unpredictably",
};
