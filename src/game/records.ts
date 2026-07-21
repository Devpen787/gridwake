import type { RoundReceipt } from "./types";

/**
 * Local operator record: every resolved round is archived in localStorage so
 * the player accumulates a career (bests, streaks, rank) across sessions.
 * Records are display-only — they never feed back into the simulation.
 */

export type StoredRound = Readonly<{
  at: number;
  seed: number;
  levelId: string | null;
  mode: "solo" | "room";
  source: string;
  outcome: "grid-held" | "core-lost";
  grade: RoundReceipt["grade"];
  score: number;
  finalHealth: number;
  instinctImpact: number;
  interceptClears: number;
  trailRepairs: number;
  pulseClears: number;
  manualClears: number;
  peakThreat: number;
  replayHash: string;
}>;

export type CareerStats = Readonly<{
  rounds: number;
  held: number;
  holdRate: number;
  bestScore: number;
  bestGrade: RoundReceipt["grade"] | null;
  currentStreak: number;
  bestStreak: number;
  recentScores: readonly number[];
  averageRecent: number;
  rank: string;
  nextRank: string | null;
  nextRankHint: string | null;
}>;

export type RecordOutcome = Readonly<{
  record: StoredRound;
  isPersonalBest: boolean;
  isFirstRound: boolean;
  previousBestScore: number | null;
  career: CareerStats;
}>;

const STORAGE_KEY = "gridwake.records.v1";
const MAX_STORED_ROUNDS = 200;

const GRADE_ORDER: Record<RoundReceipt["grade"], number> = { S: 4, A: 3, B: 2, C: 1, D: 0 };

type RankTier = Readonly<{ name: string; requiredHolds: number; requiredBest: number }>;

const RANK_TIERS: readonly RankTier[] = [
  { name: "DRIFTER", requiredHolds: 0, requiredBest: 0 },
  { name: "OPERATOR", requiredHolds: 1, requiredBest: 35 },
  { name: "TACTICIAN", requiredHolds: 3, requiredBest: 55 },
  { name: "ARCHITECT", requiredHolds: 6, requiredBest: 70 },
  { name: "WARDEN", requiredHolds: 10, requiredBest: 85 },
  { name: "GRIDMASTER", requiredHolds: 16, requiredBest: 92 },
];

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isStoredRound(value: unknown): value is StoredRound {
  if (typeof value !== "object" || value === null) return false;
  const round = value as Record<string, unknown>;
  return (
    typeof round.at === "number"
    && typeof round.seed === "number"
    && typeof round.score === "number"
    && typeof round.grade === "string"
    && (round.outcome === "grid-held" || round.outcome === "core-lost")
  );
}

export function loadRounds(): readonly StoredRound[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredRound);
  } catch {
    return [];
  }
}

function persistRounds(rounds: readonly StoredRound[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(rounds.slice(-MAX_STORED_ROUNDS)));
  } catch {
    // Storage full or blocked — records silently stay session-only.
  }
}

export function clearRounds(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Ignore blocked storage.
  }
}

export function careerStats(rounds: readonly StoredRound[]): CareerStats {
  const held = rounds.filter((round) => round.outcome === "grid-held").length;
  const bestScore = rounds.reduce((best, round) => Math.max(best, round.score), 0);
  const bestGrade = rounds.reduce<RoundReceipt["grade"] | null>(
    (best, round) => (best === null || GRADE_ORDER[round.grade] > GRADE_ORDER[best] ? round.grade : best),
    null,
  );

  let currentStreak = 0;
  for (let index = rounds.length - 1; index >= 0; index -= 1) {
    if (rounds[index].outcome !== "grid-held") break;
    currentStreak += 1;
  }
  let bestStreak = 0;
  let run = 0;
  for (const round of rounds) {
    run = round.outcome === "grid-held" ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
  }

  const recentScores = rounds.slice(-20).map((round) => round.score);
  const averageRecent = recentScores.length === 0
    ? 0
    : Math.round(recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length);

  let rank = RANK_TIERS[0];
  let next: RankTier | null = null;
  for (const tier of RANK_TIERS) {
    if (held >= tier.requiredHolds && bestScore >= tier.requiredBest) {
      rank = tier;
    } else if (next === null) {
      next = tier;
    }
  }
  const nextRankHint = next === null
    ? null
    : held < next.requiredHolds
      ? `HOLD ${next.requiredHolds - held} MORE GRID${next.requiredHolds - held === 1 ? "" : "S"}`
      : `REACH SCORE ${next.requiredBest}`;

  return {
    rounds: rounds.length,
    held,
    holdRate: rounds.length === 0 ? 0 : Math.round((held / rounds.length) * 100),
    bestScore,
    bestGrade,
    currentStreak,
    bestStreak,
    recentScores,
    averageRecent,
    rank: rank.name,
    nextRank: next?.name ?? null,
    nextRankHint,
  };
}

export function bestScoreForSeed(rounds: readonly StoredRound[], seed: number): number | null {
  const scores = rounds.filter((round) => round.seed === seed).map((round) => round.score);
  return scores.length === 0 ? null : Math.max(...scores);
}

export function bestRoundForLevel(rounds: readonly StoredRound[], levelId: string): StoredRound | null {
  let best: StoredRound | null = null;
  for (const round of rounds) {
    if (round.levelId !== levelId) continue;
    if (
      best === null
      || round.score > best.score
      || (round.score === best.score && round.outcome === "grid-held" && best.outcome !== "grid-held")
    ) {
      best = round;
    }
  }
  return best;
}

export function recordRound(
  receipt: RoundReceipt,
  context: Readonly<{ source: string; levelId: string | null; mode: "solo" | "room"; at?: number }>,
): RecordOutcome {
  const existing = loadRounds();

  // Idempotence: a re-render of the result screen (React StrictMode, remount)
  // must not archive the identical resolved round twice.
  const last = existing[existing.length - 1];
  if (last && last.replayHash === receipt.replayHash && last.seed === receipt.seed) {
    const before = existing.slice(0, -1);
    const priorBest = bestScoreForSeed(before, receipt.seed);
    return {
      record: last,
      isPersonalBest: priorBest !== null && last.score > priorBest,
      isFirstRound: before.length === 0,
      previousBestScore: priorBest,
      career: careerStats(existing),
    };
  }

  const previousBestScore = bestScoreForSeed(existing, receipt.seed);

  const record: StoredRound = {
    at: context.at ?? Date.now(),
    seed: receipt.seed,
    levelId: context.levelId,
    mode: context.mode,
    source: context.source,
    outcome: receipt.outcome,
    grade: receipt.grade,
    score: receipt.gradeScore,
    finalHealth: receipt.finalHealth,
    instinctImpact: receipt.instinctImpact,
    interceptClears: receipt.interceptClears,
    trailRepairs: receipt.trailRepairs,
    pulseClears: receipt.pulseClears,
    manualClears: receipt.manualClears,
    peakThreat: receipt.peakThreat,
    replayHash: receipt.replayHash,
  };

  const all = [...existing, record];
  persistRounds(all);

  return {
    record,
    isPersonalBest: previousBestScore !== null && receipt.gradeScore > previousBestScore,
    isFirstRound: existing.length === 0,
    previousBestScore,
    career: careerStats(all),
  };
}
