import { GRID_COLUMNS, GRID_ROWS, type Point } from "./types";

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function cellKey(x: number, y: number): string {
  return `${x}:${y}`;
}

export function parseCellKey(key: string): Point {
  const [x, y] = key.split(":").map(Number);
  return { x, y };
}

export function isInsideGrid(x: number, y: number): boolean {
  return x >= 0 && x < GRID_COLUMNS && y >= 0 && y < GRID_ROWS;
}

export function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function lcgNext(state: number): number {
  return (Math.imul(1_664_525, state >>> 0) + 1_013_904_223) >>> 0;
}

export function hashText(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function hashEvent(previous: number, event: string): number {
  return hashText(`${previous.toString(16)}|${event}`);
}

export function hexHash(value: number): string {
  return value.toString(16).padStart(8, "0");
}

export function sectorForPoint(point: Point): number {
  const column = Math.min(3, Math.floor((point.x / GRID_COLUMNS) * 4));
  const row = Math.min(1, Math.floor((point.y / GRID_ROWS) * 2));
  return row * 4 + column;
}

export function sectorCenter(sector: number): Point {
  const column = sector % 4;
  const row = Math.floor(sector / 4);
  return {
    x: Math.floor(((column + 0.5) * GRID_COLUMNS) / 4),
    y: Math.floor(((row + 0.5) * GRID_ROWS) / 2),
  };
}

