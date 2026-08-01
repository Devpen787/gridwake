import { describe, expect, it } from "vitest";
import { displacePoint, tunnelGridMotion, type GridField } from "../src/render/arena/layers/grid";

describe("phosphor grid field", () => {
  it("pulls mid-ring points gently toward the core bowl", () => {
    const field: GridField = {
      pulse: null,
      bowlAmp: 12,
      coreX: 100,
      coreY: 100,
      bowlRadius: 80,
    };
    const sample = displacePoint(140, 100, field);
    expect(sample.x).toBeLessThan(140);
    expect(sample.x).toBeGreaterThan(128);
    expect(sample.y).toBe(100);
  });

  it("leaves far-field points alone", () => {
    const field: GridField = {
      pulse: null,
      bowlAmp: 12,
      coreX: 100,
      coreY: 100,
      bowlRadius: 80,
    };
    const sample = displacePoint(400, 100, field);
    expect(sample.x).toBe(400);
    expect(sample.y).toBe(100);
  });

  it("moves tunnel columns left and resets seamlessly on each cell advance", () => {
    expect(tunnelGridMotion(0, 0, 20)).toEqual({ offsetX: -0, columnPhase: 0 });
    expect(tunnelGridMotion(3, 0, 20)).toEqual({ offsetX: -10, columnPhase: 0 });
    expect(tunnelGridMotion(6, 1, 20)).toEqual({ offsetX: -0, columnPhase: 1 });
  });
});
