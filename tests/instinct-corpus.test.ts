import { describe, expect, it } from "vitest";
import {
  compileRoleScoped,
  planToPolicy,
} from "../src/game/instinct";
import type {
  CanonicalStrategyPlan,
  EngagementStyle,
  StrategyAction,
  StrategyTarget,
} from "../src/game/instinct/types";
import {
  DEFAULT_STRATEGY,
  STRATEGY_EXAMPLES,
  compileStrategy,
  compileStrategyWithReading,
} from "../src/game/strategy";

type CorpusExpectation = Readonly<{
  label: string;
  source: string;
  compiles?: boolean;
  error?: RegExp | string | null;
  blocking?: boolean;
  formationShape?: CanonicalStrategyPlan["formation"]["shape"];
  movementStyle?: CanonicalStrategyPlan["formation"]["movementStyle"];
  radius?: number;
  interceptors?: number;
  pursuitLimit?: number;
  pulseThreshold?: number;
  target?: StrategyTarget;
  action?: StrategyAction;
  engagement?: EngagementStyle;
  warning?: RegExp;
  noWarning?: RegExp;
  compiler?: string;
  directiveCount?: number;
  hasDirectives?: boolean;
}>;

function runCorpusCase(expectation: CorpusExpectation): void {
  const result = compileStrategyWithReading(expectation.source);

  if (expectation.compiles === false) {
    expect(result.strategy).toBeNull();
    expect(result.error).toBeTruthy();
    if (expectation.error instanceof RegExp) {
      expect(result.error).toMatch(expectation.error);
    } else if (typeof expectation.error === "string") {
      expect(result.error).toBe(expectation.error);
    }
    if (expectation.blocking !== undefined) {
      expect(result.interpretation.blocking).toBe(expectation.blocking);
    }
    return;
  }

  expect(result.strategy).toBeTruthy();
  if (expectation.error instanceof RegExp) {
    expect(result.error).toMatch(expectation.error);
  } else if (typeof expectation.error === "string") {
    expect(result.error).toBe(expectation.error);
  } else {
    expect(result.error).toBeNull();
  }
  const { strategy, interpretation } = result;
  const plan = strategy!.plan!;
  const policy = strategy!.policy;

  if (expectation.blocking !== undefined) {
    expect(interpretation.blocking).toBe(expectation.blocking);
  }
  if (expectation.formationShape !== undefined) {
    expect(plan.formation.shape).toBe(expectation.formationShape);
  }
  if (expectation.movementStyle !== undefined) {
    expect(plan.formation.movementStyle).toBe(expectation.movementStyle);
  }
  if (expectation.radius !== undefined) {
    expect(plan.formation.radius).toBe(expectation.radius);
    expect(policy.engagementRadius).toBe(expectation.radius);
  }
  if (expectation.interceptors !== undefined) {
    expect(policy.interceptors).toBe(expectation.interceptors);
  }
  if (expectation.pursuitLimit !== undefined) {
    expect(policy.pursuitLimit).toBe(expectation.pursuitLimit);
  }
  if (expectation.pulseThreshold !== undefined) {
    expect(policy.pulseHealthThreshold).toBe(expectation.pulseThreshold);
  }
  if (expectation.target !== undefined) {
    expect(plan.directives.some((directive) => directive.target === expectation.target)).toBe(true);
  }
  if (expectation.action !== undefined) {
    expect(plan.directives.some((directive) => directive.action === expectation.action)).toBe(true);
  }
  if (expectation.engagement !== undefined) {
    expect(plan.directives.some((directive) => directive.engagementStyle === expectation.engagement)).toBe(true);
  }
  if (expectation.warning !== undefined) {
    expect(interpretation.warnings.some((warning) => expectation.warning!.test(warning.message))).toBe(true);
  }
  if (expectation.noWarning !== undefined) {
    expect(interpretation.warnings.some((warning) => expectation.noWarning!.test(warning.message))).toBe(false);
  }
  if (expectation.compiler !== undefined) {
    expect(strategy!.compiler).toBe(expectation.compiler);
  }
  if (expectation.directiveCount !== undefined) {
    expect(plan.directives).toHaveLength(expectation.directiveCount);
  }
  if (expectation.hasDirectives !== undefined) {
    expect(plan.directives.length > 0).toBe(expectation.hasDirectives);
  }

  expect(plan.version).toBe("instinct-v2");
  expect(planToPolicy(plan).formation).toBe(plan.formation.shape);
}

const SHIPPED: readonly CorpusExpectation[] = STRATEGY_EXAMPLES.map((example, index) => {
  const expectations: Record<number, Partial<CorpusExpectation>> = {
    0: {
      formationShape: "ring",
      movementStyle: "disciplined",
      interceptors: 2,
      pursuitLimit: 0,
      pulseThreshold: 45,
      action: "screen",
    },
    1: {
      formationShape: "spread",
      movementStyle: "erratic",
      interceptors: 3,
      pursuitLimit: 6,
      target: "highest-pressure-sector",
      engagement: "aggressive",
      warning: /highest-pressure boundary sector/i,
    },
    2: {
      formationShape: "link",
      movementStyle: "organic",
      interceptors: 1,
      action: "repair",
      target: "shared-trail",
    },
    3: {
      formationShape: "ring",
      radius: 4,
      interceptors: 2,
      pursuitLimit: 0,
      warning: /radius clamped/i,
    },
  };
  return {
    label: `shipped example: ${example.label}`,
    source: example.source,
    compiles: true,
    compiler: "local-instinct-v2",
    ...expectations[index],
  };
});

const CORPUS: readonly CorpusExpectation[] = [
  ...SHIPPED,
  {
    label: "default strategy",
    source: DEFAULT_STRATEGY,
    formationShape: "ring",
    movementStyle: "organic",
    interceptors: 2,
    pursuitLimit: 0,
    action: "orbit",
  },
  {
    label: "ring paraphrase",
    source: "Form a protective circle around the core and intercept intruders with two lights.",
    formationShape: "ring",
    interceptors: 2,
    action: "intercept",
  },
  {
    label: "spread paraphrase",
    source: "Deploy wide and hunt the busiest edge with all three lights.",
    formationShape: "spread",
    interceptors: 3,
    target: "highest-pressure-sector",
  },
  {
    label: "link paraphrase",
    source: "Stay linked and mend every shared trail crossing.",
    formationShape: "link",
    action: "repair",
  },
  {
    label: "orbit paraphrase",
    source: "Rotate around the light in a steady ring.",
    formationShape: "ring",
    movementStyle: "disciplined",
    action: "orbit",
  },
  {
    label: "guard paraphrase",
    source: "Shield the centre and send one unit to nearby threats.",
    interceptors: 1,
    action: "screen",
  },
  {
    label: "scout verb paraphrase",
    source: "Spread wide and scout the closest breach, then return.",
    formationShape: "spread",
    target: "nearest-breach",
    action: "intercept",
  },
  {
    label: "reordered intercept and ring",
    source: "Send two units and circle the light.",
    formationShape: "ring",
    interceptors: 2,
    action: "orbit",
  },
  {
    label: "reordered spread and aggression",
    source: "Move unpredictably while spread wide with all three units.",
    formationShape: "spread",
    movementStyle: "erratic",
    interceptors: 3,
  },
  {
    label: "reordered pulse and orbit",
    source: "Orbit the core. Pulse below 60%.",
    formationShape: "ring",
    pulseThreshold: 60,
    action: "orbit",
  },
  {
    label: "guardian role clause",
    source: "Guardian holds the core in a tight ring.",
    formationShape: "ring",
    action: "hold",
  },
  {
    label: "scout role clause",
    source: "Scout intercepts the nearest breach and returns.",
    target: "nearest-breach",
    action: "intercept",
  },
  {
    label: "mender role clause",
    source: "Mender repairs shared trails while the squad holds.",
    action: "repair",
    target: "shared-trail",
  },
  {
    label: "multi-role sentence",
    source: "Guardian never leaves the core. Scout hunts the most crowded edge for four cells, then returns. Mender repairs shared trails.",
    directiveCount: 3,
    warning: /highest-pressure boundary sector/i,
  },
  {
    label: "collapse phase regroup",
    source: "During collapse, regroup close to the light.",
    action: "regroup",
  },
  {
    label: "probe phase hold",
    source: "Probe phase: hold the core.",
    action: "hold",
  },
  {
    label: "threat-within condition",
    source: "Send two units only when corruption reaches the inner grid.",
    interceptors: 2,
  },
  {
    label: "core health condition phrase",
    source: "If the core falls below 50%, orbit the light.",
    pulseThreshold: 50,
    action: "orbit",
  },
  {
    label: "negated attack",
    source: "Do not attack. Hold the core.",
    action: "hold",
    pursuitLimit: 0,
  },
  {
    label: "negated leave",
    source: "Guardian never leaves the core.",
    action: "hold",
    pursuitLimit: 0,
  },
  {
    label: "no chase global",
    source: "Circle the core and send two units to intercept, and do not chase.",
    interceptors: 2,
    pursuitLimit: 0,
  },
  {
    label: "explicit leash",
    source: "Hunt the nearest breach for four cells then return.",
    pursuitLimit: 4,
    target: "nearest-breach",
  },
  {
    label: "send one unit",
    source: "Circle the light and send one unit.",
    interceptors: 1,
  },
  {
    label: "send three units",
    source: "Circle the light and send three units.",
    interceptors: 3,
  },
  {
    label: "whole squad responders",
    source: "Spread wide and deploy the whole squad to the edges.",
    formationShape: "spread",
    interceptors: 3,
  },
  {
    label: "within 35 percent radius",
    source: "Circle the light and send two units within 35%.",
    radius: 6,
    interceptors: 2,
  },
  {
    label: "within 45 percent radius",
    source: "Circle the light and send two units within 45%.",
    radius: 8,
    interceptors: 2,
  },
  {
    label: "within 10 percent clamp",
    source: "Circle the light within 10% and send two and do not chase.",
    radius: 4,
    pursuitLimit: 0,
    warning: /radius clamped/i,
  },
  {
    label: "tight ring radius",
    source: "Hold a tight ring around the core.",
    formationShape: "ring",
    radius: 5,
  },
  {
    label: "wide spread radius",
    source: "Spread wide across the boundary.",
    formationShape: "spread",
    radius: 14,
  },
  {
    label: "disciplined movement",
    source: "Move steadily around the core.",
    formationShape: "ring",
    movementStyle: "disciplined",
  },
  {
    label: "erratic movement",
    source: "Move unpredictably around the core.",
    formationShape: "ring",
    movementStyle: "erratic",
  },
  {
    label: "organic movement default",
    source: "Circle the light organically.",
    formationShape: "ring",
    movementStyle: "organic",
  },
  {
    label: "aggressive engagement",
    source: "Aggressively hunt everything near the core.",
    engagement: "aggressive",
    pursuitLimit: 6,
  },
  {
    label: "cautious engagement",
    source: "Cautiously defend the core.",
    engagement: "cautious",
    action: "screen",
  },
  {
    label: "most urgent breach target",
    source: "All three intercept the most urgent breach.",
    interceptors: 3,
    target: "highest-urgency-breach",
  },
  {
    label: "closest breach target",
    source: "Spread wide and intercept the closest breach, but do not chase.",
    formationShape: "spread",
    target: "nearest-breach",
    pursuitLimit: 0,
  },
  {
    label: "densest sector pulse wording only",
    source: "If the core falls below 35%, guide Pulse toward the densest sector.",
    compiles: false,
    error: /actionable directive/i,
    blocking: true,
  },
  {
    label: "return without chasing sequence",
    source: "Send two units to intercept nearby threats then return without chasing.",
    interceptors: 2,
    pursuitLimit: 0,
  },
  {
    label: "regroup after intercept sequence",
    source: "Intercept nearby threats and regroup at the core.",
    action: "intercept",
  },
  {
    label: "ring then send sequence",
    source: "Form a ring, then send two units to the edge.",
    formationShape: "ring",
    interceptors: 2,
  },
  {
    label: "spread ring contradiction",
    source: "Spread wide in a tight ring around the core.",
    blocking: true,
    error: /spread and ring/i,
    warning: /spread and ring/i,
    hasDirectives: true,
  },
  {
    label: "decorative only sentence",
    source: "Be brave, little sparks.",
    compiles: false,
    error: /actionable directive/i,
    blocking: true,
  },
  {
    label: "decorative with valid directive",
    source: "Circle gracefully around the light and sing to the moon.",
    formationShape: "ring",
    action: "orbit",
    compiles: true,
  },
  {
    label: "misspelling intercept normalises",
    source: "Intersept the nearest breach and return.",
    target: "nearest-breach",
    action: "intercept",
  },
  {
    label: "unsupported pulse-only",
    source: "Pulse below 45% health.",
    compiles: false,
    error: /actionable directive/i,
    blocking: true,
  },
  {
    label: "unsupported chase-only",
    source: "Do not chase anything.",
    compiles: false,
    error: /actionable directive/i,
    blocking: true,
  },
  {
    label: "empty source",
    source: "",
    compiles: false,
    error: /one sentence/i,
    blocking: true,
  },
  {
    label: "whitespace source",
    source: "   \n\t ",
    compiles: false,
    error: /one sentence/i,
    blocking: true,
  },
  {
    label: "case normalisation",
    source: "  CIRCLE   the LIGHT and SEND two UNITS  ",
    formationShape: "ring",
    interceptors: 2,
  },
  {
    label: "hug the core hold",
    source: "Hug the light in a tight steady ring.",
    formationShape: "ring",
    movementStyle: "disciplined",
    action: "hold",
  },
  {
    label: "close orbit",
    source: "Guard the center in a close orbit.",
    formationShape: "ring",
    action: "orbit",
  },
  {
    label: "screen the core",
    source: "Screen the core and send two units.",
    interceptors: 2,
    action: "screen",
  },
  {
    label: "reinforce trails",
    source: "Link together organically and reinforce ally trails.",
    formationShape: "link",
    action: "repair",
  },
  {
    label: "follow trails becomes repair",
    source: "Follow shared trails and stay with allies.",
    action: "repair",
  },
  {
    label: "mender stays with trails",
    source: "All three intercept the most urgent breach, but the Mender stays with the trails.",
    interceptors: 3,
    directiveCount: 2,
  },
  {
    label: "only attack within radius",
    source: "Only attack within 10%.",
    radius: 4,
    action: "intercept",
    warning: /radius clamped/i,
  },
  {
    label: "scout hold negation",
    source: "Scout never leaves the edge.",
    action: "hold",
    pursuitLimit: 0,
  },
  {
    label: "short chase leash",
    source: "Circle the core and take a short chase after breaches.",
    pursuitLimit: 2,
  },
  {
    label: "send two explicit",
    source: "Send two units to intercept anything near the core.",
    interceptors: 2,
    action: "intercept",
  },
  {
    label: "everyone responds",
    source: "Everyone intercept the nearest breach.",
    interceptors: 3,
    target: "nearest-breach",
  },
  {
    label: "all lights respond",
    source: "All lights hunt the closest threat.",
    interceptors: 3,
  },
  {
    label: "regroup collapse wording",
    source: "Regroup when collapse begins.",
    action: "regroup",
  },
  {
    label: "surge phase not yet wired",
    source: "During surge, send two units to the edge.",
    interceptors: 2,
    compiles: true,
  },
  {
    label: "balanced default formation",
    source: "Intercept the nearest breach.",
    action: "intercept",
    target: "nearest-breach",
  },
  {
    label: "double pulse threshold uses first match",
    source: "Pulse below 40%. Pulse below 55%. Orbit the core.",
    pulseThreshold: 40,
    action: "orbit",
  },
  {
    label: "return continuation",
    source: "Send one unit to intercept and return immediately.",
    interceptors: 1,
    action: "regroup",
  },
  {
    label: "protect core screen",
    source: "Protect the light and remain in formation.",
    action: "screen",
  },
  {
    label: "defend core",
    source: "Defend the core in a disciplined ring.",
    formationShape: "ring",
    movementStyle: "disciplined",
    action: "screen",
  },
  {
    label: "cut off breach",
    source: "Cut off the nearest breach with two units.",
    interceptors: 2,
    target: "nearest-breach",
  },
  {
    label: "respond to nearby threats",
    source: "Respond to nearby threats with two lights.",
    interceptors: 2,
    target: "nearest-breach",
  },
  {
    label: "stitch trails",
    source: "Stitch shared trails together near the core.",
    action: "repair",
  },
  {
    label: "restore ally links",
    source: "Restore ally links across the grid.",
    action: "repair",
  },
  {
    label: "stay with trails follow",
    source: "Stay with the trails and link together.",
    formationShape: "link",
    action: "repair",
  },
  {
    label: "fall back regroup",
    source: "Fall back to the core when threatened.",
    action: "regroup",
  },
  {
    label: "retreat to light",
    source: "Retreat to the light and hold formation.",
    action: "regroup",
  },
  {
    label: "anchor at core",
    source: "Anchor at the core and do not chase.",
    action: "hold",
    pursuitLimit: 0,
  },
  {
    label: "without chasing phrase",
    source: "Send two units to intercept nearby threats without chasing.",
    interceptors: 2,
    pursuitLimit: 0,
  },
  {
    label: "never chase phrase",
    source: "Circle the core and never chase far.",
    pursuitLimit: 0,
  },
  {
    label: "don't chase phrase",
    source: "Orbit the light and don't chase.",
    pursuitLimit: 0,
  },
  {
    label: "within cells radius",
    source: "Send two units within 6 cells of the core.",
    radius: 6,
    interceptors: 2,
  },
  {
    label: "within max cells radius",
    source: "Hold the core within 14 cells.",
    radius: 14,
    action: "hold",
  },
  {
    label: "over max percent clamp",
    source: "Circle the light and attack within 90%.",
    radius: 14,
    warning: /radius clamped/i,
  },
  {
    label: "under min percent clamp",
    source: "Circle the light and attack within 5%.",
    radius: 4,
    warning: /radius clamped/i,
  },
  {
    label: "pulse under threshold",
    source: "Pulse under 70%. Guard the core.",
    pulseThreshold: 70,
    action: "screen",
  },
  {
    label: "pulse below threshold",
    source: "Pulse below 45%. Circle the light.",
    pulseThreshold: 45,
    formationShape: "ring",
  },
  {
    label: "scout crowded edge",
    source: "Scout the most crowded edge aggressively.",
    target: "highest-pressure-sector",
    engagement: "aggressive",
    warning: /highest-pressure boundary sector/i,
  },
  {
    label: "densest breach target phrase",
    source: "Send two units to the densest breach.",
    interceptors: 2,
    target: "highest-pressure-sector",
    warning: /highest-pressure boundary sector/i,
  },
  {
    label: "highest pressure explicit",
    source: "Intercept the highest-pressure sector with all three units.",
    interceptors: 3,
    target: "highest-pressure-sector",
  },
  {
    label: "mender repairs while scout intercepts",
    source: "Mender repairs shared trails while scout intercepts.",
    action: "intercept",
    compiles: true,
  },
  {
    label: "hold pulse threshold low clamp",
    source: "Hold pulse under 2%. Circle the core.",
    pulseThreshold: 15,
    warning: /pulse threshold clamped/i,
  },
  {
    label: "hold pulse threshold high clamp",
    source: "Hold pulse below 99%. Circle the core.",
    pulseThreshold: 80,
    warning: /pulse threshold clamped/i,
  },
  {
    label: "send lights wording",
    source: "Circle the light and send two lights.",
    interceptors: 2,
  },
  {
    label: "use three interceptors wording",
    source: "Use three interceptors to hunt the edge.",
    interceptors: 3,
  },
  {
    label: "surround the core",
    source: "Surround the core and send one unit.",
    formationShape: "balanced",
    interceptors: 1,
    action: "orbit",
  },
  {
    label: "rotate around light",
    source: "Rotate around the light and send two.",
    formationShape: "ring",
    interceptors: 2,
  },
  {
    label: "stay close hold",
    source: "Stay close to the core.",
    action: "hold",
  },
  {
    label: "remain anchored",
    source: "Remain anchored at the light.",
    action: "hold",
  },
  {
    label: "close the grid repair",
    source: "Close the grid by repairing shared trails.",
    action: "repair",
  },
  {
    label: "reinforce every ally trail",
    source: "Reinforce every ally trail near the core.",
    action: "repair",
  },
  {
    label: "spread wide default movement",
    source: "Spread wide and move erratically.",
    formationShape: "spread",
    movementStyle: "organic",
    action: "screen",
  },
  {
    label: "ring and move precisely",
    source: "Circle the core precisely.",
    formationShape: "ring",
    movementStyle: "disciplined",
  },
  {
    label: "edge hunter exact sentence",
    source: "Spread wide, scout the weakest edges aggressively with all three units, and move unpredictably.",
    formationShape: "spread",
    movementStyle: "erratic",
    interceptors: 3,
    target: "highest-pressure-sector",
    engagement: "aggressive",
    pursuitLimit: 6,
  },
];

describe("Instinct Runtime v2 corpus", () => {
  it.each(CORPUS)("$label", (expectation) => {
    runCorpusCase(expectation);
  });

  it("derives policy adapters from canonical plans for every shipped example", () => {
    for (const example of STRATEGY_EXAMPLES) {
      const compiled = compileStrategy(example.source);
      expect(compiled.plan).toBeTruthy();
      expect(planToPolicy(compiled.plan!).formation).toBe(compiled.plan!.formation.shape);
      expect(compiled.compiler).toBe("local-instinct-v2");
      expect(compiled.planHash).toBeTruthy();
    }
  });

  it("scopes multiplayer ownership via compileRoleScoped for scouts", () => {
    const scoped = compileRoleScoped("Guard the core in a ring and send two units.", "scout");
    expect(scoped.ownershipWarnings.some((warning) => /scout does not own/i.test(warning))).toBe(true);
    expect(scoped.strategy.plan?.formation.shape).toBe("balanced");
    expect(scoped.strategy.plan?.directives.every((directive) => directive.actor !== "guardian")).toBe(true);
  });

  it("scopes multiplayer ownership via compileRoleScoped for guardians", () => {
    const scoped = compileRoleScoped("Scout intercepts the edge and send two units.", "guardian");
    expect(scoped.ownershipWarnings.length).toBeGreaterThan(0);
    expect(scoped.strategy.plan?.directives.every((directive) => directive.action !== "intercept")).toBe(true);
  });

  it("scopes multiplayer ownership via compileRoleScoped for menders", () => {
    const scoped = compileRoleScoped("Spread wide and send three units to the edge.", "mender");
    expect(scoped.ownershipWarnings.some((warning) => /does not own that role/i.test(warning))).toBe(true);
    const linkScoped = compileRoleScoped("Link together and repair shared trails.", "mender");
    expect(linkScoped.strategy.plan?.formation.shape).toBe("link");
  });

  it("throws on compileStrategy when decorative-only prose has no directives", () => {
    expect(() => compileStrategy("Be brave, little sparks.")).toThrow(/actionable directive/i);
  });

  it("returns blocking contradiction via compileStrategyWithReading without throwing", () => {
    const result = compileStrategyWithReading("Spread wide in a tight ring around the core.");
    expect(result.error).toMatch(/spread and ring/i);
    expect(result.interpretation.blocking).toBe(true);
    expect(result.strategy).toBeTruthy();
  });
});

describe("Instinct corpus coverage count", () => {
  it(`runs ${CORPUS.length} parametrized corpus cases`, () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(100);
  });
});
