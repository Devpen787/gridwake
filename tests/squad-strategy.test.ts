import { describe, expect, it } from "vitest";
import { strategyHash } from "../src/game/strategy";
import { composeSquadStrategy } from "../src/multiplayer/squadStrategy";
import type { LaunchContribution } from "../src/multiplayer/types";

function contribution(role: LaunchContribution["role"], source: string): LaunchContribution {
  return { memberId: `member-${role}`, displayName: role.toUpperCase(), role, source };
}

function composed(contributions: readonly LaunchContribution[]) {
  const result = composeSquadStrategy(contributions, contributions.map((item) => `${item.role}: ${item.source}`).join(" "));
  if (!result.ok) throw new Error(result.error.message);
  return result.strategy;
}

describe("per-role squad composition", () => {
  it("keeps the guardian's no-chase out of the scout's pursuit", () => {
    const strategy = composed([
      contribution("guardian", "Circle the core tightly and do not chase."),
      contribution("scout", "Hunt threats at the edges and chase for 6 cells."),
    ]);
    expect(strategy.policy.pursuitLimit).toBe(6);
    expect(strategy.policy.formation).toBe("ring");
  });

  it("keeps the scout's formation words out of the guardian's shape", () => {
    const strategy = composed([
      contribution("guardian", "Hold a disciplined ring around the light."),
      contribution("scout", "Spread wide and intercept everything with all three units."),
    ]);
    expect(strategy.policy.formation).toBe("ring");
    expect(strategy.policy.movementStyle).toBe("disciplined");
    expect(strategy.policy.interceptors).toBe(3);
  });

  it("gives the guardian the pulse threshold and radius", () => {
    const strategy = composed([
      contribution("guardian", "Guard the core within 7 cells. Pulse below 60%."),
      contribution("scout", "Intercept and pulse below 20%."),
    ]);
    expect(strategy.policy.engagementRadius).toBe(7);
    expect(strategy.policy.pulseHealthThreshold).toBe(60);
  });

  it("uses documented defaults for absent roles", () => {
    const strategy = composed([
      contribution("guardian", "Circle the light."),
      contribution("scout", "Intercept threats and return."),
    ]);
    // Mender absent: link focus falls to the balanced default share.
    expect(strategy.policy.focus.core + strategy.policy.focus.edge + strategy.policy.focus.link).toBe(100);
    expect(strategy.instincts.map((instinct) => instinct.role)).toEqual(["guardian", "scout", "mender"]);
  });

  it("normalizes focus to exactly 100 across role-owned axes", () => {
    const strategy = composed([
      contribution("guardian", "Protect the core, guard the ring, circle the light and hold."),
      contribution("scout", "Scout the weakest edges wide."),
      contribution("mender", "Link together, reinforce every ally trail and repair crossings."),
    ]);
    const { core, edge, link } = strategy.policy.focus;
    expect(core + edge + link).toBe(100);
    expect(link).toBeGreaterThan(0);
  });

  it("is deterministic: identical contributions produce an identical strategy hash", () => {
    const contributions = [
      contribution("guardian", "Circle the core."),
      contribution("scout", "Hunt the edges."),
      contribution("mender", "Reinforce ally trails."),
    ];
    const left = composed(contributions);
    const right = composed(contributions);
    expect(strategyHash(left)).toBe(strategyHash(right));
    expect(left).toEqual(right);
  });

  it("reports the failing member instead of throwing", () => {
    const result = composeSquadStrategy(
      [
        contribution("guardian", "Circle the core."),
        contribution("scout", "Be brave, little sparks."),
      ],
      "guardian: Circle the core. scout: Be brave, little sparks.",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.memberId).toBe("member-scout");
      expect(result.error.message).toMatch(/Describe movement or protection/);
    }
  });
});
