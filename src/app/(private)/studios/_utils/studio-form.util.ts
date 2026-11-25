import type {
  CreateStudioRequestDto,
  StudioDetailDto,
  StudioSeatInputDto,
  UpdateStudioRequestDto,
} from '@/lib/api-real/types.gen';

import type { LayoutCell, SpaceLayout, StudioFormValues } from '../_components/studio-form.schema';
import {
  SEAT_TYPE_BY_CELL_KIND,
  STUDIO_KIND_BY_TYPE,
  STUDIO_TYPE_BY_KIND,
  joinOperatingHours,
  seatToLayoutCell,
  splitOperatingHours,
} from './studio-api.util';

/**
 * Studio create / edit (API-110 #1 / #4 / #10) — form values ↔ request bodies, and the seat grid
 * of the layout editor ↔ the API's seats.
 */

/** The editor's options (FR-006-03); an API grid is rounded up to the next one */
export const LAYOUT_ROW_OPTIONS = [2, 3, 4, 5] as const;
export const LAYOUT_COLUMN_OPTIONS = [6, 8, 10] as const;

const roundUp = (value: number, options: readonly number[]) => options.find((o) => o >= value);

export interface StudioFormDefaults {
  defaultValues: Partial<StudioFormValues>;
  /** The stored grid is larger than the editor can show (5 × 10): the layout is not editable here */
  layoutLocked: boolean;
}

export function studioToFormValues(detail: StudioDetailDto): StudioFormDefaults {
  const { rows, cols } = detail.gridSize;
  let layout: SpaceLayout | undefined;
  let layoutLocked = false;
  if (detail.seats.length > 0 && rows > 0 && cols > 0) {
    const editorRows = roundUp(rows, LAYOUT_ROW_OPTIONS);
    const editorCols = roundUp(cols, LAYOUT_COLUMN_OPTIONS);
    if (editorRows === undefined || editorCols === undefined) {
      layoutLocked = true;
    } else {
      layout = { rows: editorRows, columns: editorCols, cells: detail.seats.map(seatToLayoutCell) };
    }
  }

  return {
    defaultValues: {
      storeId: detail.storeId,
      name: detail.name,
      studioType: STUDIO_KIND_BY_TYPE[detail.studioType],
      operatingHours: joinOperatingHours(detail.startTime, detail.endTime),
      capacity: detail.capacity,
      bufferValue: detail.bufferCapacity,
      equipmentNotes: detail.equipment ?? '',
      internalNotes: detail.description ?? '',
      status: detail.isActive ? 'active' : 'inactive',
      images: [...detail.images]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((image) => ({
          id: image.id,
          imageId: image.id,
          s3Key: image.imageS3Key,
          url: image.url ?? '',
        })),
      layout,
    },
    layoutLocked,
  };
}

const orNull = (text: string | undefined) => (text?.trim() ? text : null);

export function formValuesToCreateBody(values: StudioFormValues): CreateStudioRequestDto {
  return {
    storeId: values.storeId,
    name: values.name,
    studioType: STUDIO_TYPE_BY_KIND[values.studioType],
    capacity: values.capacity,
    bufferCapacity: values.bufferValue,
    ...splitOperatingHours(values.operatingHours),
    equipment: orNull(values.equipmentNotes),
    description: orNull(values.internalNotes),
    isActive: values.status === 'active',
    images: values.images.map((image, displayOrder) => ({ imageS3Key: image.s3Key, displayOrder })),
  };
}

/**
 * The studio row's changed fields (§7.2) under the optimistic lock, or null when none changed.
 * The store is immutable (§6.2 #1) and never sent.
 */
export function formValuesToPatchBody(
  values: StudioFormValues,
  original: StudioDetailDto,
): UpdateStudioRequestDto | null {
  const { startTime, endTime } = splitOperatingHours(values.operatingHours);
  const next = {
    name: values.name,
    studioType: STUDIO_TYPE_BY_KIND[values.studioType],
    capacity: values.capacity,
    bufferCapacity: values.bufferValue,
    startTime,
    endTime,
    equipment: orNull(values.equipmentNotes),
    description: orNull(values.internalNotes),
    isActive: values.status === 'active',
  };
  const body: UpdateStudioRequestDto = {};
  for (const key of Object.keys(next) as (keyof typeof next)[]) {
    if (next[key] !== original[key]) Object.assign(body, { [key]: next[key] });
  }
  if (Object.keys(body).length === 0) return null;
  return { ...body, expectedUpdatedAt: original.updatedAt };
}

/** Every cell of the editor grid, keyed by position (missing cells are 未使用) */
export function fullGrid(layout: SpaceLayout): LayoutCell[] {
  const byPosition = new Map(layout.cells.map((cell) => [`${cell.x},${cell.y}`, cell]));
  const cells: LayoutCell[] = [];
  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.columns; x++) {
      cells.push(byPosition.get(`${x},${y}`) ?? { x, y, kind: 'empty' });
    }
  }
  return cells;
}

/**
 * The editor grid → the §7.5 body: the whole grid, 未使用 cells included, so it round-trips as
 * drawn. A grid with no seat at all clears the layout (`[]`).
 */
export function layoutToSeatInputs(layout: SpaceLayout | undefined): StudioSeatInputDto[] {
  if (!layout) return [];
  const cells = fullGrid(layout);
  if (cells.every((cell) => cell.kind === 'empty')) return [];
  return cells.map((cell) => ({
    rowIndex: cell.y,
    columnIndex: cell.x,
    seatType: SEAT_TYPE_BY_CELL_KIND[cell.kind],
    ...(cell.kind === 'normal_seat' ? { seatNumber: cell.seatNumber ?? null } : {}),
    displayLabel:
      cell.kind === 'equipment_seat' || cell.kind === 'fixed_object' ? (cell.label ?? null) : null,
  }));
}

/** Whether the grid would save differently from what is stored */
export function layoutChanged(layout: SpaceLayout | undefined, original: StudioDetailDto): boolean {
  const key = (seats: StudioSeatInputDto[]) =>
    seats
      .filter((s) => s.seatType !== 'empty')
      .map(
        (s) =>
          `${s.rowIndex}:${s.columnIndex}:${s.seatType}:${s.seatNumber ?? ''}:${s.displayLabel ?? ''}`,
      )
      .sort()
      .join('|');
  const stored = original.seats.map((seat) => ({
    rowIndex: seat.rowIndex,
    columnIndex: seat.columnIndex,
    seatType: seat.seatType,
    seatNumber: seat.seatNumber,
    displayLabel: seat.displayLabel,
  }));
  return key(layoutToSeatInputs(layout)) !== key(stored);
}

/**
 * The number a newly placed 通常席 gets (Clarifications 2026-10-14): one past the highest numeric
 * seat number on the grid, so existing seats keep theirs.
 */
export function nextSeatNumber(cells: LayoutCell[]): string {
  const taken = new Set(cells.flatMap((cell) => (cell.seatNumber ? [cell.seatNumber] : [])));
  let next =
    Math.max(0, ...[...taken].map((n) => Number(n)).filter((n) => Number.isInteger(n))) + 1;
  while (taken.has(String(next))) next++;
  return String(next);
}
