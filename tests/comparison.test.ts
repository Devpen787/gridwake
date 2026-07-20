import { describe, expect, it } from "vitest";
import {
  compareReceipts,
  deltaTone,
  formatReceiptShareText,
  formatSignedDelta,
} from "../src/game/comparison";
import type { RoundReceipt } from "../src/game/types";

const base: RoundReceipt = {
  engineVersion: "gridwake-local-v0.5",
  seed: 42,
  strategyHash: "AAA",
  ticks: 450,
  outcome: "grid-held",
  finalHealth: 70,
  trailRepairs: 3,
  interceptClears: 10,
  pulseClears: 6,
  peakThreat: 80,
  damageTaken: 30,
  instinctImpact: 68,
  gradeScore: 72,
  grade: "A",
  replayHash: "DEADBEEF",
};

describe("same-seed receipt comparison", () => {
  it("returns score, core, and instinct deltas for comparable attempts", () => {
    const current = {
      ...base,
      finalHealth: 76,
      instinctImpact: 65,
      gradeScore: 80,
      replayHash: "FEEDBEEF",
    };
    expect(compareReceipts(current, base)).toEqual([
      { key: "score", label: "SCORE", value: 8 },
      { key: "core", label: "CORE", value: 6 },
      { key: "instinct", label: "INSTINCT", value: -3 },
    ]);
  });

  it("does not compare different seeds or engine versions", () => {
    expect(compareReceipts({ ...base, seed: 43 }, base)).toEqual([]);
    expect(compareReceipts({ ...base, engineVersion: "gridwake-local-v0.6" }, base)).toEqual([]);
  });

  it("formats signed values and tones truthfully", () => {
    expect(formatSignedDelta(8)).toBe("+08");
    expect(formatSignedDelta(-4)).toBe("−04");
    expect(formatSignedDelta(0)).toBe("±00");
    expect(deltaTone(1)).toBe("positive");
    expect(deltaTone(-1)).toBe("negative");
    expect(deltaTone(0)).toBe("neutral");
  });

  it("builds a compact receipt with reproducibility fields", () => {
    const text = formatReceiptShareText(base);
    expect(text).toContain("A 72/100");
    expect(text).toContain("SEED 42");
    expect(text).toContain("REPLAY DEADBEEF");
  });
});
