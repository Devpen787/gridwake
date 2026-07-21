import { beforeAll, beforeEach, describe, expect, it } from "vitest";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => { map.delete(key); },
    setItem: (key: string, value: string) => { map.set(key, value); },
  };
}

beforeAll(() => {
  (globalThis as { window?: unknown }).window = { localStorage: memoryStorage() };
});
import {
  CAMPAIGN_LEVELS,
  campaignProgress,
  campaignSummary,
  nextLevel,
  starsFor,
} from "../src/game/campaign";
import {
  careerStats,
  clearRounds,
  loadRounds,
  recordRound,
  type StoredRound,
} from "../src/game/records";
import type { RoundReceipt } from "../src/game/types";

function receipt(overrides: Partial<RoundReceipt> = {}): RoundReceipt {
  return {
    engineVersion: "test",
    seed: 1234,
    strategyHash: "abcd",
    ticks: 450,
    outcome: "grid-held",
    finalHealth: 80,
    trailRepairs: 2,
    interceptClears: 10,
    manualClears: 0,
    pulseClears: 4,
    peakThreat: 40,
    damageTaken: 20,
    instinctImpact: 75,
    gradeScore: 72,
    grade: "A",
    replayHash: `hash-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

function stored(overrides: Partial<StoredRound> = {}): StoredRound {
  return {
    at: Date.now(),
    seed: 1,
    levelId: null,
    mode: "solo",
    source: "Hold the core.",
    outcome: "grid-held",
    grade: "A",
    score: 70,
    finalHealth: 80,
    instinctImpact: 70,
    interceptClears: 8,
    trailRepairs: 1,
    pulseClears: 3,
    manualClears: 0,
    peakThreat: 40,
    replayHash: `r-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

describe("operator records", () => {
  beforeEach(() => {
    clearRounds();
  });

  it("archives rounds and reads them back", () => {
    recordRound(receipt(), { source: "Hold the core.", levelId: null, mode: "solo" });
    const rounds = loadRounds();
    expect(rounds).toHaveLength(1);
    expect(rounds[0].score).toBe(72);
    expect(rounds[0].source).toBe("Hold the core.");
  });

  it("does not archive the identical resolved round twice", () => {
    const same = receipt({ replayHash: "fixed-hash" });
    recordRound(same, { source: "Hold.", levelId: null, mode: "solo" });
    const second = recordRound(same, { source: "Hold.", levelId: null, mode: "solo" });
    expect(loadRounds()).toHaveLength(1);
    expect(second.isFirstRound).toBe(true);
  });

  it("flags a personal best only when a prior score on the seed is beaten", () => {
    const first = recordRound(receipt({ gradeScore: 50, replayHash: "a" }), {
      source: "s", levelId: null, mode: "solo",
    });
    expect(first.isPersonalBest).toBe(false);
    const improved = recordRound(receipt({ gradeScore: 90, replayHash: "b" }), {
      source: "s", levelId: null, mode: "solo",
    });
    expect(improved.isPersonalBest).toBe(true);
    expect(improved.previousBestScore).toBe(50);
  });

  it("computes streaks, hold rate, and rank from history", () => {
    const history = [
      stored({ outcome: "grid-held", score: 60 }),
      stored({ outcome: "core-lost", score: 20, grade: "D" }),
      stored({ outcome: "grid-held", score: 74 }),
      stored({ outcome: "grid-held", score: 88, grade: "S" }),
    ];
    const stats = careerStats(history);
    expect(stats.rounds).toBe(4);
    expect(stats.held).toBe(3);
    expect(stats.currentStreak).toBe(2);
    expect(stats.bestStreak).toBe(2);
    expect(stats.bestScore).toBe(88);
    expect(stats.bestGrade).toBe("S");
    expect(stats.rank).toBe("TACTICIAN");
    expect(stats.nextRank).toBe("ARCHITECT");
  });
});

describe("campaign ladder", () => {
  beforeEach(() => {
    clearRounds();
  });

  it("locks every level after the first until the previous grid is held", () => {
    const progress = campaignProgress([]);
    expect(progress[0].unlocked).toBe(true);
    expect(progress.slice(1).every((entry) => !entry.unlocked)).toBe(true);
  });

  it("unlocks the next level once the previous one is held", () => {
    const held = stored({ levelId: CAMPAIGN_LEVELS[0].id, outcome: "grid-held", score: 60 });
    const progress = campaignProgress([held]);
    expect(progress[1].unlocked).toBe(true);
    expect(progress[2].unlocked).toBe(false);
    expect(nextLevel([held], CAMPAIGN_LEVELS[0])?.id).toBe(CAMPAIGN_LEVELS[1].id);
  });

  it("awards stars for holding, beating par, and an S grade", () => {
    const level = CAMPAIGN_LEVELS[0];
    expect(starsFor(level, null)).toBe(0);
    expect(starsFor(level, stored({ outcome: "core-lost" }))).toBe(0);
    expect(starsFor(level, stored({ outcome: "grid-held", score: level.parScore - 1, grade: "B" }))).toBe(1);
    expect(starsFor(level, stored({ outcome: "grid-held", score: level.parScore + 5, grade: "A" }))).toBe(2);
    expect(starsFor(level, stored({ outcome: "grid-held", score: 95, grade: "S" }))).toBe(3);
  });

  it("summarizes ladder completion", () => {
    const rounds = [
      stored({ levelId: CAMPAIGN_LEVELS[0].id, outcome: "grid-held", score: 90, grade: "S" }),
      stored({ levelId: CAMPAIGN_LEVELS[1].id, outcome: "grid-held", score: CAMPAIGN_LEVELS[1].parScore, grade: "A" }),
    ];
    const summary = campaignSummary(rounds);
    expect(summary.cleared).toBe(2);
    expect(summary.total).toBe(CAMPAIGN_LEVELS.length);
    expect(summary.stars).toBe(5);
  });

  it("keeps every campaign seed and duration deterministic and distinct", () => {
    const seeds = new Set(CAMPAIGN_LEVELS.map((level) => level.seed));
    expect(seeds.size).toBe(CAMPAIGN_LEVELS.length);
    for (const level of CAMPAIGN_LEVELS) {
      expect(level.maxTicks).toBe(level.seconds * 10);
      expect(level.seconds).toBeGreaterThanOrEqual(45);
      expect(level.seconds).toBeLessThanOrEqual(60);
    }
  });
});
