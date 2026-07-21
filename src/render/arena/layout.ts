import { GRID_COLUMNS, GRID_ROWS } from "../../game/types";

export type ArenaLayout = Readonly<{
  cell: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  viewWidth: number;
  viewHeight: number;
}>;

export function layoutFor(viewWidth: number, viewHeight: number): ArenaLayout {
  // Prefer filling the available viewport so roles stay readable and the
  // frozen result battlefield is not crushed into a tiny centered strip.
  const padX = Math.max(10, Math.min(40, viewWidth * 0.045));
  const padY = Math.max(12, Math.min(56, viewHeight * 0.06));
  const usableWidth = Math.max(200, viewWidth - padX * 2);
  const usableHeight = Math.max(160, viewHeight - padY * 2);
  const cell = Math.max(9, Math.min(usableWidth / GRID_COLUMNS, usableHeight / GRID_ROWS));
  const width = cell * GRID_COLUMNS;
  const height = cell * GRID_ROWS;
  return {
    cell,
    width,
    height,
    originX: (viewWidth - width) / 2,
    originY: (viewHeight - height) / 2,
    viewWidth,
    viewHeight,
  };
}

export function pxX(layout: ArenaLayout, x: number): number {
  return layout.originX + x * layout.cell + layout.cell / 2;
}

export function pxY(layout: ArenaLayout, y: number): number {
  return layout.originY + y * layout.cell + layout.cell / 2;
}
