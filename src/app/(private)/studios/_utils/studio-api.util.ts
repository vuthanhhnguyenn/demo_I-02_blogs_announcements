import type { QueryClient } from '@tanstack/react-query';

import { BRAND_ENUM_LABELS, type BrandEnumValue } from '@/components/common/brand-badge';

import {
  adminStudioControllerDetailQueryKey,
  adminStudioControllerHistoryQueryKey,
  adminStudioControllerLinkedLessonsQueryKey,
  adminStudioControllerListQueryKey,
  adminStudioControllerUtilizationQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AdminStudioControllerListData,
  StudioListItemDto,
  StudioSeatDto,
} from '@/lib/api-real/types.gen';
import { lazyQueryIds } from '@/lib/query-id.util';

/**
 * Studio master (API-110) — the one hand-written seam between the `/studios` screens and the real
 * API: enum maps, the list query, time and layout conversions, error codes and cache invalidation.
 */

export type ApiStudioType = StudioListItemDto['studioType'];
/** The screens' own studio-type vocabulary (badges, form, filters) */
export type StudioKind = 'studio-lesson' | 'pt' | 'body-care';

export const STUDIO_KIND_BY_TYPE: Record<ApiStudioType, StudioKind> = {
  studio: 'studio-lesson',
  personal_training: 'pt',
  body_care: 'body-care',
};

export const STUDIO_TYPE_BY_KIND: Record<StudioKind, ApiStudioType> = {
  'studio-lesson': 'studio',
  pt: 'personal_training',
  'body-care': 'body_care',
};

/** The five API brands (`stores.brand`) for the brand filter */
export const STUDIO_BRAND_OPTIONS = (Object.keys(BRAND_ENUM_LABELS) as BrandEnumValue[]).map(
  (value) => ({ value, label: BRAND_ENUM_LABELS[value] }),
);

// --- list ---

export const STUDIO_PAGE_SIZE = 50;

type ListQuery = NonNullable<AdminStudioControllerListData['query']>;

/**
 * Table column → API `sort`. Ids are UUID v7, so creation order is id order. 店舗名 has no API
 * sort key: stores live in another service.
 */
// TODO(round2) B1: add `store_name` once the API sorts by store name (FR-001-03).
export const SORT_KEY_BY_COLUMN: Partial<Record<string, ListQuery['sort']>> = {
  id: 'createdAt',
  name: 'name',
  studio_type: 'studioType',
  capacity: 'capacity',
};

export interface StudioListParams {
  search: string;
  store_id: string;
  studio_type: string;
  brand: string;
  status: string;
  sort_by: string;
  sort_order: string;
  page: number;
}

/**
 * The list's URL state → the API query. `scopeStoreId` is the header's store (null on 全店舗);
 * a specific header store wins, and the filter's store applies only on 全店舗.
 */
export function toStudioListQuery(
  params: StudioListParams,
  scopeStoreId: string | null,
): ListQuery {
  const storeId = scopeStoreId || params.store_id || undefined;
  return {
    page: params.page,
    limit: STUDIO_PAGE_SIZE,
    sort: SORT_KEY_BY_COLUMN[params.sort_by] ?? 'createdAt',
    order: params.sort_order === 'desc' ? 'desc' : 'asc',
    ...(params.search ? { q: params.search } : {}),
    ...(storeId ? { storeId } : {}),
    ...(params.studio_type in STUDIO_TYPE_BY_KIND
      ? { studioType: STUDIO_TYPE_BY_KIND[params.studio_type as StudioKind] }
      : {}),
    ...(params.brand in BRAND_ENUM_LABELS ? { brand: params.brand as BrandEnumValue } : {}),
    ...(params.status ? { isActive: params.status === 'active' } : {}),
  };
}

// --- time ---

/** `HH:mm:ss` → `H:mm` (the screens show `9:00-22:00`) */
export function displayTime(time: string): string {
  const [hour, minute] = time.split(':');
  return `${Number(hour)}:${minute}`;
}

export function formatHours(startTime: string, endTime: string): string {
  return `${displayTime(startTime)}-${displayTime(endTime)}`;
}

/** The form's `HH:mm~HH:mm` → the API's `HH:mm:ss` pair */
export function splitOperatingHours(value: string): { startTime: string; endTime: string } {
  const [start, end] = value.split('~');
  return { startTime: `${start}:00`, endTime: `${end}:00` };
}

/** The API's `HH:mm:ss` pair → the form's `HH:mm~HH:mm` */
export function joinOperatingHours(startTime: string, endTime: string): string {
  return `${startTime.slice(0, 5)}~${endTime.slice(0, 5)}`;
}

// --- layout ---

export type LayoutCellKind = 'normal_seat' | 'equipment_seat' | 'fixed_object' | 'empty';

export const CELL_KIND_BY_SEAT_TYPE: Record<StudioSeatDto['seatType'], LayoutCellKind> = {
  normal: 'normal_seat',
  equipment: 'equipment_seat',
  structure: 'fixed_object',
  empty: 'empty',
};

export const SEAT_TYPE_BY_CELL_KIND: Record<LayoutCellKind, StudioSeatDto['seatType']> = {
  normal_seat: 'normal',
  equipment_seat: 'equipment',
  fixed_object: 'structure',
  empty: 'empty',
};

/** One grid cell as the layout preview / editor draw it */
export interface StudioLayoutCell {
  x: number;
  y: number;
  kind: LayoutCellKind;
  /** The saved seat's id — kept across edits so bookings stay on it */
  seatId?: string;
  seatNumber?: string;
  label?: string;
  /** Reserved / pending bookings holding the seat on a schedule from today */
  activeBookingCount?: number;
}

export function seatToLayoutCell(seat: StudioSeatDto): StudioLayoutCell {
  return {
    x: seat.columnIndex,
    y: seat.rowIndex,
    kind: CELL_KIND_BY_SEAT_TYPE[seat.seatType],
    seatId: seat.id,
    seatNumber: seat.seatNumber ?? undefined,
    label: seat.displayLabel ?? undefined,
    activeBookingCount: seat.activeBookingCount ?? 0,
  };
}

// --- errors ---

/** Studio error codes the UI reacts to specifically (API-110 §9) */
export const STUDIO_ERROR_CODE = {
  /** 404 — unknown, deleted or outside the caller's store scope */
  notFound: 'E-STD-001',
  /** 404 — the image is not under this studio */
  imageNotFound: 'E-STD-003',
  /** 409 — DELETE while a non-cancelled schedule from today uses the studio */
  inUse: 'E-STD-004',
  /** 409 — a change future schedules / bookings would not survive */
  editBlocked: 'E-STD-005',
  /** 422 — invalid operating window, or `expectedUpdatedAt` is stale */
  invalidOrStale: 'E-STD-006',
  /** 409 — a removed / re-typed seat is held by a booking */
  seatHeld: 'E-STD-009',
  /** 403 — role not allowed */
  forbidden: 'E-STD-101',
} as const;

// --- cache ---

const parameterisedStudioQueryIds = lazyQueryIds(() => [
  adminStudioControllerDetailQueryKey({ path: { studioId: '' } }),
  adminStudioControllerHistoryQueryKey({ path: { studioId: '' } }),
  adminStudioControllerLinkedLessonsQueryKey({ path: { studioId: '' } }),
  adminStudioControllerUtilizationQueryKey({
    path: { studioId: '' },
    query: { from: '', to: '' },
  }),
]);

/** Everything a studio write can change on screen: every list, and any studio's detail reads */
export function invalidateStudioQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: adminStudioControllerListQueryKey() });
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const [key] = query.queryKey as [{ _id?: unknown } | undefined];
      return typeof key?._id === 'string' && parameterisedStudioQueryIds().has(key._id);
    },
  });
}
