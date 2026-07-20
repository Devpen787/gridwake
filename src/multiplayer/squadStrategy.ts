import {
  compileRoleScoped,
  hashCanonicalPlan,
  planToPolicy,
} from "../game/instinct";
import type { CanonicalStrategyPlan } from "../game/instinct/types";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "../game/strategy";
import type { CompiledStrategy, Instinct, LightRole, StrategyPolicy } from "../game/types";
import type { LaunchContribution } from "./types";

const ROLE_ORDER: readonly LightRole[] = ["guardian", "scout", "mender"];

// Compiler defaults for dials whose owning role is absent from the room.
const ABSENT_ROLE_POLICY: StrategyPolicy = {
  focus: { core: 34, edge: 33, link: 33 },
  formation: "balanced",
  engagementRadius: 9,
  interceptors: 2,
  pursuitLimit: 2,
  movementStyle: "organic",
  entropy: 34,
  risk: 50,
  pulseHealthThreshold: 35,
  matchedSignals: [],
};

const ABSENT_ROLE_PLAN: CanonicalStrategyPlan = {
  version: "instinct-v2",
  formation: { shape: "balanced", radius: 9, movementStyle: "organic" },
  directives: [],
  pulseGuidance: {
    condition: { kind: "core-health-below", percent: 35 },
    target: "highest-pressure-sector",
  },
};

function normalizedFocus(core: number, edge: number, link: number): StrategyPolicy["focus"] {
  const raw = [Math.max(1, core), Math.max(1, edge), Math.max(1, link)];
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

function mergeSquadPlan(
  guardianPlan: CanonicalStrategyPlan,
  scoutPlan: CanonicalStrategyPlan,
  menderPlan: CanonicalStrategyPlan,
): CanonicalStrategyPlan {
  return {
    version: "instinct-v2",
    formation: guardianPlan.formation,
    pulseGuidance: guardianPlan.pulseGuidance,
    directives: [
      ...guardianPlan.directives,
      ...scoutPlan.directives,
      ...menderPlan.directives,
    ],
  };
}

export type SquadCompositionError = Readonly<{
  memberId: string;
  displayName: string;
  message: string;
}>;

export type SquadCompositionResult =
  | Readonly<{ ok: true; strategy: CompiledStrategy }>
  | Readonly<{ ok: false; error: SquadCompositionError }>;

export function composeSquadStrategy(
  contributions: readonly LaunchContribution[],
  combinedSource: string,
): SquadCompositionResult {
  const byRolePlan = new Map<LightRole, CanonicalStrategyPlan>();
  const byRolePolicy = new Map<LightRole, StrategyPolicy>();
  const signalsInRoleOrder: string[] = [];

  for (const role of ROLE_ORDER) {
    const contribution = contributions.find((candidate) => candidate.role === role);
    if (!contribution) {
      byRolePlan.set(role, ABSENT_ROLE_PLAN);
      byRolePolicy.set(role, ABSENT_ROLE_POLICY);
      continue;
    }
    try {
      const { strategy } = compileRoleScoped(contribution.source, role);
      byRolePlan.set(role, strategy.plan ?? ABSENT_ROLE_PLAN);
      byRolePolicy.set(role, strategy.policy);
      signalsInRoleOrder.push(...strategy.policy.matchedSignals);
    } catch (caught) {
      return {
        ok: false,
        error: {
          memberId: contribution.memberId,
          displayName: contribution.displayName,
          message: caught instanceof Error ? caught.message : "The Instinct could not be interpreted.",
        },
      };
    }
  }

  const guardianPlan = byRolePlan.get("guardian") ?? ABSENT_ROLE_PLAN;
  const scoutPlan = byRolePlan.get("scout") ?? ABSENT_ROLE_PLAN;
  const menderPlan = byRolePlan.get("mender") ?? ABSENT_ROLE_PLAN;

  const mergedPlan = mergeSquadPlan(guardianPlan, scoutPlan, menderPlan);
  const matchedSignals = [...new Set(signalsInRoleOrder)];

  const guardian = byRolePolicy.get("guardian") ?? ABSENT_ROLE_POLICY;
  const scout = byRolePolicy.get("scout") ?? ABSENT_ROLE_POLICY;
  const mender = byRolePolicy.get("mender") ?? ABSENT_ROLE_POLICY;

  const policy: StrategyPolicy = {
    ...planToPolicy(mergedPlan, matchedSignals),
    focus: normalizedFocus(guardian.focus.core, scout.focus.edge, mender.focus.link),
    formation: guardian.formation,
    engagementRadius: guardian.engagementRadius,
    movementStyle: guardian.movementStyle,
    entropy: guardian.entropy,
    pulseHealthThreshold: guardian.pulseHealthThreshold,
    interceptors: scout.interceptors,
    pursuitLimit: scout.pursuitLimit,
    risk: scout.risk,
    matchedSignals,
  };

  const instincts: Instinct[] = ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    description: ROLE_DESCRIPTIONS[role],
  }));

  return {
    ok: true,
    strategy: {
      source: combinedSource,
      policy,
      instincts,
      compiler: "local-instinct-v2",
      plan: mergedPlan,
      planHash: hashCanonicalPlan(mergedPlan),
    },
  };
}
