import { TICK_RATE } from "./types";
import { bestRoundForLevel, type StoredRound } from "./records";

/**
 * Campaign ladder: eight named grids with fixed seeds, escalating round
 * lengths, and par scores. A level is only a (seed, duration) pair handed to
 * the deterministic engine — the ladder itself never touches simulation state.
 */

export type CampaignLevel = Readonly<{
  id: string;
  index: number;
  name: string;
  seed: number;
  seconds: number;
  maxTicks: number;
  parScore: number;
  brief: string;
  hint: string;
}>;

function level(
  index: number,
  id: string,
  name: string,
  seed: number,
  seconds: number,
  parScore: number,
  brief: string,
  hint: string,
): CampaignLevel {
  return { id, index, name, seed: seed >>> 0, seconds, maxTicks: seconds * TICK_RATE, parScore, brief, hint };
}

export const CAMPAIGN_LEVELS: readonly CampaignLevel[] = [
  level(0, "first-light", "FIRST LIGHT", 0x1f83d21b, 45, 55,
    "A calm grid. Corruption seeps in from scattered boundary cells.",
    "A tight ring with two interceptors holds this one. Say what you want guarded."),
  level(1, "twin-front", "TWIN FRONT", 0x4be29a7d, 45, 60,
    "Two opposing edges press at once. Split attention or hold the middle.",
    "Try naming a target: the nearest breach, or the highest-pressure sector."),
  level(2, "slow-tide", "SLOW TIDE", 0x77aa10c9, 50, 60,
    "Five extra seconds. The surge phase lasts longer than you think.",
    "Pursuit costs time. 'Do not chase' keeps your lights near the core late."),
  level(3, "the-vice", "THE VICE", 0x9c0ffee5, 50, 65,
    "Corruption clusters hard. Pressure builds in one sector, then snaps.",
    "Send interceptors to the densest sector, and hold your Pulse for the snap."),
  level(4, "long-watch", "LONG WATCH", 0xb00d1ce5, 55, 65,
    "Fifty-five seconds of patience. Early aggression leaves the core naked.",
    "Phase conditions work: hold during probe, engage during surge."),
  level(5, "broken-ring", "BROKEN RING", 0xd3adb33f, 55, 70,
    "Trails fray fast here. A squad that never links never repairs.",
    "The mender repairs where two trails cross. Ask for linked movement."),
  level(6, "the-flood", "THE FLOOD", 0xe1e7a009, 60, 70,
    "A full minute. The collapse phase alone outlasts most strategies.",
    "Set an explicit Pulse threshold and keep one guardian anchored, always."),
  level(7, "terminal-surge", "TERMINAL SURGE", 0xfaded511, 60, 75,
    "The final grid. Everything accelerates. Nothing forgives.",
    "Layer conditions: a probe posture, a surge response, a collapse retreat."),
];

export type LevelProgress = Readonly<{
  level: CampaignLevel;
  unlocked: boolean;
  held: boolean;
  bestScore: number | null;
  bestGrade: StoredRound["grade"] | null;
  stars: 0 | 1 | 2 | 3;
  beatPar: boolean;
}>;

export function levelById(id: string | null): CampaignLevel | null {
  if (id === null) return null;
  return CAMPAIGN_LEVELS.find((entry) => entry.id === id) ?? null;
}

export function starsFor(level: CampaignLevel, best: StoredRound | null): 0 | 1 | 2 | 3 {
  if (!best || best.outcome !== "grid-held") return 0;
  if (best.grade === "S") return 3;
  if (best.score >= level.parScore) return 2;
  return 1;
}

export function campaignProgress(rounds: readonly StoredRound[]): readonly LevelProgress[] {
  let previousHeld = true;
  return CAMPAIGN_LEVELS.map((entry) => {
    const best = bestRoundForLevel(rounds, entry.id);
    const held = best !== null && best.outcome === "grid-held";
    const unlocked = previousHeld;
    previousHeld = held;
    return {
      level: entry,
      unlocked,
      held,
      bestScore: best?.score ?? null,
      bestGrade: best?.grade ?? null,
      stars: starsFor(entry, best),
      beatPar: best !== null && best.outcome === "grid-held" && best.score >= entry.parScore,
    };
  });
}

export function nextLevel(rounds: readonly StoredRound[], current: CampaignLevel): CampaignLevel | null {
  const progress = campaignProgress(rounds);
  const following = progress[current.index + 1];
  return following?.unlocked ? following.level : null;
}

export function campaignSummary(rounds: readonly StoredRound[]): Readonly<{
  cleared: number;
  total: number;
  stars: number;
  maxStars: number;
}> {
  const progress = campaignProgress(rounds);
  return {
    cleared: progress.filter((entry) => entry.held).length,
    total: progress.length,
    stars: progress.reduce((sum, entry) => sum + entry.stars, 0),
    maxStars: progress.length * 3,
  };
}
