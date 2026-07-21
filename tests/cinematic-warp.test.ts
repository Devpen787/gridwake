import { describe, expect, it } from "vitest";
import {
  coreBowlPull,
  coreBowlZ,
  defaultWarpParams,
  pulseWellZ,
  sampleWarp,
} from "../src/render/cinematic/warp";

describe("cinematic warp field", () => {
  it("depresses the core bowl relative to the far field", () => {
    const core = coreBowlZ(15, 9, 2.4);
    const far = coreBowlZ(1, 1, 2.4);
    expect(core).toBeLessThan(far);
    expect(core).toBeLessThan(0);
  });

  it("pulls mid-ring cells inward toward the core", () => {
    const pull = coreBowlPull(20, 9, 0.95);
    expect(pull.x).toBeLessThan(0);
    expect(Math.abs(pull.x)).toBeGreaterThan(0.02);
    expect(Math.abs(pull.x)).toBeLessThan(1.2);
  });

  it("creates a pulse well near the ring", () => {
    const onRing = pulseWellZ(18.3, 9, 15, 9, 6, 1, 2);
    const far = pulseWellZ(0, 0, 15, 9, 6, 1, 2);
    expect(onRing).toBeLessThan(0);
    expect(Math.abs(onRing)).toBeGreaterThan(Math.abs(far));
  });

  it("zeroes warp under reduced motion", () => {
    const sample = sampleWarp(15, 9, 30, 18, defaultWarpParams(true));
    expect(sample.z).toBe(0);
    expect(sample.x).toBe(15);
    expect(sample.y).toBe(9);
  });
});
