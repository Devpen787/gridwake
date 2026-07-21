/** Pure arena AABB clipping helpers (Cohen–Sutherland). */

export type ClipRect = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
}>;

export type ClipPoint = Readonly<{ x: number; y: number }>;

export type ClipSegment = Readonly<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}>;

const INSIDE = 0;
const LEFT = 1;
const RIGHT = 2;
const BOTTOM = 4;
const TOP = 8;

function outCode(x: number, y: number, rect: ClipRect): number {
  let code = INSIDE;
  if (x < rect.left) code |= LEFT;
  else if (x > rect.right) code |= RIGHT;
  if (y < rect.top) code |= TOP;
  else if (y > rect.bottom) code |= BOTTOM;
  return code;
}

export function pointInRect(point: ClipPoint, rect: ClipRect): boolean {
  return (
    point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom
  );
}

/** Returns null when the segment lies entirely outside the rect. */
export function clipLineSegment(
  segment: ClipSegment,
  rect: ClipRect,
): ClipSegment | null {
  let { x1, y1, x2, y2 } = segment;
  let code1 = outCode(x1, y1, rect);
  let code2 = outCode(x2, y2, rect);

  for (let guard = 0; guard < 8; guard += 1) {
    if ((code1 | code2) === 0) return { x1, y1, x2, y2 };
    if ((code1 & code2) !== 0) return null;

    const codeOut = code1 !== 0 ? code1 : code2;
    let x = 0;
    let y = 0;
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (codeOut & TOP) {
      x = x1 + (dx * (rect.top - y1)) / (dy || 1e-9);
      y = rect.top;
    } else if (codeOut & BOTTOM) {
      x = x1 + (dx * (rect.bottom - y1)) / (dy || 1e-9);
      y = rect.bottom;
    } else if (codeOut & RIGHT) {
      y = y1 + (dy * (rect.right - x1)) / (dx || 1e-9);
      x = rect.right;
    } else {
      y = y1 + (dy * (rect.left - x1)) / (dx || 1e-9);
      x = rect.left;
    }

    if (codeOut === code1) {
      x1 = x;
      y1 = y;
      code1 = outCode(x1, y1, rect);
    } else {
      x2 = x;
      y2 = y;
      code2 = outCode(x2, y2, rect);
    }
  }
  return null;
}

export function arenaClipRect(
  originX: number,
  originY: number,
  width: number,
  height: number,
  inset = 0.5,
): ClipRect {
  return {
    left: originX + inset,
    top: originY + inset,
    right: originX + width - inset,
    bottom: originY + height - inset,
  };
}
