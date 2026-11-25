import {
  LOCKER_SHAPE_GRID,
  type LockerOrderType,
  type LockerShapeType,
} from '../_constants/locker-enum-labels.constants';

/**
 * E-01 FR-003: slot numbers are auto-assigned from the shape and numbering pattern.
 * `slotStartNumber` defaults to 1 on the API (API-100 v0.13) and the form does not expose it.
 */
export const LOCKER_SLOT_START_NUMBER = 1;

/** `slotCode` is the number zero-padded to 3 digits (API-100 §6.1) */
export function formatSlotCode(num: number): string {
  return String(num).padStart(3, '0');
}

export function formatSlotId(prefix: string, num: number): string {
  return `${prefix}-${formatSlotCode(num)}`;
}

/** 「A-001〜A-027」 — composed client-side from `locationCode` + `slotStartNumber` + `slotCount` */
export function formatLockerSlotRange(prefix: string, startNum: number, slotCount: number): string {
  if (slotCount <= 0) return '—';
  return `${formatSlotId(prefix, startNum)}〜${formatSlotId(prefix, startNum + slotCount - 1)}`;
}

/**
 * 位置 as staff read it: 段 counted from the floor (1段目 = bottom row), 列 from the left.
 * `rowIndex` is 0 at the top row (API-100 §6.1), so the 段 is flipped against the row count.
 */
export function formatLockerSlotPosition(
  rowCount: number,
  rowIndex: number,
  columnIndex: number,
): string {
  return `${rowCount - rowIndex}段目 ${columnIndex + 1}列目`;
}

export type LockerSlotPosition = {
  /** 「A-001」 */
  slotLabel: string;
  /** 「001」 — matches the API's `slotCode` once the cabinet is created */
  slotCode: string;
  /** 0-based, 0 = top row */
  rowIndex: number;
  /** 0-based, 0 = left column */
  columnIndex: number;
  isBottomRow: boolean;
};

/**
 * The cells of a cabinet in numbering order. Mirrors the BE generator
 * (`contracts-svc` `locker.service.ts`, API-100 §6.1 ORDER_TYPE_ITERATOR) so the preview shows the
 * same slot codes the API will create.
 */
function orderedCells(orderType: LockerOrderType, rows: number, cols: number) {
  const cells: { row: number; col: number }[] = [];
  switch (orderType) {
    case 'top_right_to_top_left':
      for (let r = 0; r < rows; r++)
        for (let c = cols - 1; c >= 0; c--) cells.push({ row: r, col: c });
      break;
    case 'top_left_to_bottom_left':
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) cells.push({ row: r, col: c });
      break;
    case 'top_right_to_bottom_right':
      for (let c = cols - 1; c >= 0; c--)
        for (let r = 0; r < rows; r++) cells.push({ row: r, col: c });
      break;
    case 'top_left_to_top_right':
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ row: r, col: c });
      break;
  }
  return cells;
}

export function buildLockerSlotPositions(
  prefix: string,
  shapeType: LockerShapeType,
  orderType: LockerOrderType,
  startNum: number,
): LockerSlotPosition[] {
  const { rows, cols } = LOCKER_SHAPE_GRID[shapeType];
  return orderedCells(orderType, rows, cols).map((cell, index) => ({
    slotLabel: formatSlotId(prefix, startNum + index),
    slotCode: formatSlotCode(startNum + index),
    rowIndex: cell.row,
    columnIndex: cell.col,
    isBottomRow: cell.row === rows - 1,
  }));
}
