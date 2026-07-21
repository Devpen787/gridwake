import { describe, expect, it } from "vitest";
import { arenaClipRect, clipLineSegment, pointInRect } from "../src/render/arena/clipping";

const rect = arenaClipRect(0, 0, 100, 80, 0);

describe("arena line clipping", () => {
  it("keeps a fully inside segment", () => {
    expect(clipLineSegment({ x1: 10, y1: 10, x2: 40, y2: 50 }, rect)).toEqual({
      x1: 10, y1: 10, x2: 40, y2: 50,
    });
  });

  it("rejects a fully outside segment", () => {
    expect(clipLineSegment({ x1: -20, y1: -10, x2: -5, y2: -2 }, rect)).toBeNull();
  });

  it("clips a segment crossing the right edge", () => {
    const clipped = clipLineSegment({ x1: 50, y1: 40, x2: 150, y2: 40 }, rect);
    expect(clipped).not.toBeNull();
    expect(clipped!.x1).toBeCloseTo(50);
    expect(clipped!.x2).toBeCloseTo(100);
    expect(clipped!.y2).toBeCloseTo(40);
  });

  it("clips a diagonal crossing two edges", () => {
    const clipped = clipLineSegment({ x1: -20, y1: -20, x2: 120, y2: 100 }, rect);
    expect(clipped).not.toBeNull();
    expect(pointInRect({ x: clipped!.x1, y: clipped!.y1 }, rect)).toBe(true);
    expect(pointInRect({ x: clipped!.x2, y: clipped!.y2 }, rect)).toBe(true);
  });

  it("handles a zero-length inside point as a degenerate segment", () => {
    expect(clipLineSegment({ x1: 25, y1: 25, x2: 25, y2: 25 }, rect)).toEqual({
      x1: 25, y1: 25, x2: 25, y2: 25,
    });
  });

  it("rejects a zero-length outside point", () => {
    expect(clipLineSegment({ x1: -5, y1: -5, x2: -5, y2: -5 }, rect)).toBeNull();
  });

  it("builds an inset arena clip rect", () => {
    const inset = arenaClipRect(10, 20, 200, 100, 2);
    expect(inset).toEqual({ left: 12, top: 22, right: 208, bottom: 118 });
  });
});
