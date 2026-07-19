import { ROLE_DESCRIPTIONS, ROLE_LABELS, compileStrategy } from "../game/strategy";
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
  const byRole = new Map<LightRole, StrategyPolicy>();
  const signalsInRoleOrder: string[] = [];

  for (const role of ROLE_ORDER) {
    const contribution = contributions.find((candidate) => candidate.role === role);
    if (!contribution) {
      byRole.set(role, ABSENT_ROLE_POLICY);
      continue;
    }
    try {
      const { policy } = compileStrategy(contribution.source);
      byRole.set(role, policy);
      signalsInRoleOrder.push(...policy.matchedSignals);
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

  const guardian = byRole.get("guardian") ?? ABSENT_ROLE_POLICY;
  const scout = byRole.get("scout") ?? ABSENT_ROLE_POLICY;
  const mender = byRole.get("mender") ?? ABSENT_ROLE_POLICY;

  const policy: StrategyPolicy = {
    focus: normalizedFocus(guardian.focus.core, scout.focus.edge, mender.focus.link),
    formation: guardian.formation,
    engagementRadius: guardian.engagementRadius,
    movementStyle: guardian.movementStyle,
    entropy: guardian.entropy,
    pulseHealthThreshold: guardian.pulseHealthThreshold,
    interceptors: scout.interceptors,
    pursuitLimit: scout.pursuitLimit,
    risk: scout.risk,
    matchedSignals: [...new Set(signalsInRoleOrder)],
  };

  const instincts: Instinct[] = ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    description: ROLE_DESCRIPTIONS[role],
  }));

  return {
    ok: true,
    strategy: { source: combinedSource, policy, instincts, compiler: "local-prototype" },
  };
}
