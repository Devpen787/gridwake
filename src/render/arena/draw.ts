import type { FillInput, Graphics, StrokeStyle } from "pixi.js";

type StrokeOptions = Partial<StrokeStyle> & {
  color?: number;
  width?: number;
  alpha?: number;
};

/**
 * Pixi v8 leaves the active path cursor at (0,0) after stroking many shapes
 * (getLastPoint has no case for circle/rect/poly). Calling beginPath() before
 * each independent stroke prevents full-screen diagonals from the origin.
 */
export function resetGraphics(graphics: Graphics): void {
  graphics.clear();
  graphics.beginPath();
}

export function strokeSegment(
  graphics: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: StrokeOptions,
): void {
  graphics.beginPath();
  graphics.moveTo(x1, y1).lineTo(x2, y2).stroke(style);
}

export function strokePoly(
  graphics: Graphics,
  points: number[],
  close: boolean,
  style: StrokeOptions,
  fill?: FillInput,
): void {
  graphics.beginPath();
  const path = graphics.poly(points, close);
  if (fill) path.fill(fill);
  path.stroke(style);
}
