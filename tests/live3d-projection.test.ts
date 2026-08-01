import { describe, expect, it } from "vitest";
import { CORE_X, CORE_Y, GRID_COLUMNS, GRID_ROWS } from "../src/game/types";
import { projectArenaPoint } from "../src/render/live3d/LiveArenaScene";

describe("live 3D arena projection", () => {
  it("keeps the core at the world origin in both camera modes", () => {
    expect(projectArenaPoint({ x: CORE_X, y: CORE_Y }, "bastion")).toEqual({ x: 0, y: 0.46, z: 0 });
    expect(projectArenaPoint({ x: CORE_X, y: CORE_Y }, "tunnel")).toEqual({ x: 0, y: 0.46, z: -0 });
  });

  it("turns incoming tunnel columns into depth and rows into lateral lanes", () => {
    const near = projectArenaPoint({ x: CORE_X + 2, y: CORE_Y }, "tunnel");
    const far = projectArenaPoint({ x: CORE_X + 10, y: CORE_Y }, "tunnel");
    const upperLane = projectArenaPoint({ x: CORE_X + 2, y: CORE_Y - 4 }, "tunnel");
    const lowerLane = projectArenaPoint({ x: CORE_X + 2, y: CORE_Y + 4 }, "tunnel");
    expect(far.z).toBeLessThan(near.z);
    expect(upperLane.x).toBeLessThan(0);
    expect(lowerLane.x).toBeGreaterThan(0);
  });

  it("projects every simulation corner into finite world coordinates", () => {
    for (const mode of ["bastion", "tunnel"] as const) {
      for (const point of [
        { x: 0, y: 0 },
        { x: GRID_COLUMNS - 1, y: 0 },
        { x: 0, y: GRID_ROWS - 1 },
        { x: GRID_COLUMNS - 1, y: GRID_ROWS - 1 },
      ]) {
        const projected = projectArenaPoint(point, mode);
        expect(Number.isFinite(projected.x)).toBe(true);
        expect(Number.isFinite(projected.y)).toBe(true);
        expect(Number.isFinite(projected.z)).toBe(true);
      }
    }
  });
});
