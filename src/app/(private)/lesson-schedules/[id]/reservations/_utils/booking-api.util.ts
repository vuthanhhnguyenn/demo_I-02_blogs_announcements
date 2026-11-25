import type { QueryClient } from '@tanstack/react-query';

import { getApiErrorCode } from '@/lib/api-error.util';
import {
  adminLessonBookingControllerBookingStatsQueryKey,
  adminLessonBookingControllerGetSessionMemoQueryKey,
  adminLessonBookingControllerListQueryKey,
  adminLessonScheduleControllerGetScheduleQueryKey,
  adminLessonScheduleControllerListSchedulesQueryKey,
  adminLessonScheduleControllerScheduleHistoryQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { formatFullName } from '@/lib/utils';

/** API-113 / API-112 error codes the UI reacts to specifically (integration-plan.md D3, D11, D12). */
export const BOOKING_ERROR_CODE = {
  /** 404 — unknown schedule, or one outside the caller's scope (stores / Trainer's own) → `/403` */
  scheduleNotFound: 'E-LSC-001',
  /** 404 — no session memo on the schedule yet (normal state, not an error) */
  memoNotFound: 'E-LSB-030',
  /** 409 — POST when a memo already exists → retry as PATCH */
  memoAlreadyExists: 'E-LSB-031',
  /** 409 — PATCH / DELETE with a stale `expectedUpdatedAt` */
  memoStale: 'E-LSB-017',
  /** 403 — observer (or any role without the write / limited-profile permission) */
  forbidden: 'E-LSB-101',
  /** 409 — API-112 PATCH / cancel with a stale `expectedUpdatedAt` */
  scheduleStale: 'E-LSC-014',
  /** 422 — API-112 write without `changeReason` */
  changeReasonRequired: 'E-LSC-022',
} as const;

/** Reads `ErrorResponseDto.code` off a thrown API error; undefined for transport errors */
export function getBookingErrorCode(error: unknown): string | undefined {
  return getApiErrorCode(error);
}

/** `GET /admin/studios` takes at most 100 rows a page, so every page is read at that maximum. */
const LIST_PAGE_SIZE = 100;

/**
 * Every page of a list bounded by its scope (one store's studios), up to the last page.
 * `GET /admin/studios` defaults to 20 rows a page (its Swagger omits `page` / `limit`, the BE
 * zod accepts them), so one call — or a fixed number of pages — would silently drop the rest.
 * TODO: switch to `fetchAllPages` in `lesson-schedules/_utils/lesson-schedule-api.util.ts` once
 * FE !196 is merged.
 */
export async function fetchEveryPage<T>(
  fetchPage: (paging: {
    page: number;
    limit: number;
  }) => Promise<{ items: T[]; pagination: { totalPages: number } }>,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const data = await fetchPage({ page, limit: LIST_PAGE_SIZE });
    items.push(...data.items);
    if (page >= data.pagination.totalPages) return items;
  }
}

/**
 * Decision D14 — every booking write refreshes the list, the stats (header badge, grid,
 * 予約統計) and the schedule detail (`bookingSummary` feeds the API-112 dialogs).
 */
export function invalidateBookingQueries(queryClient: QueryClient, scheduleId: string): void {
  queryClient.invalidateQueries({ queryKey: adminLessonBookingControllerListQueryKey() });
  queryClient.invalidateQueries({
    queryKey: adminLessonBookingControllerBookingStatsQueryKey({ path: { scheduleId } }),
  });
  queryClient.invalidateQueries({
    queryKey: adminLessonScheduleControllerGetScheduleQueryKey({ path: { scheduleId } }),
  });
}

/** Every API-112 schedule write: the booking queries + schedule history + list screens. */
export function invalidateScheduleQueries(queryClient: QueryClient, scheduleId: string): void {
  invalidateBookingQueries(queryClient, scheduleId);
  queryClient.invalidateQueries({
    queryKey: adminLessonScheduleControllerScheduleHistoryQueryKey({ path: { scheduleId } }),
  });
  queryClient.invalidateQueries({ queryKey: adminLessonScheduleControllerListSchedulesQueryKey() });
}

/** Refetch the detail so a retry carries a fresh `expectedUpdatedAt`. */
export function refetchScheduleDetail(queryClient: QueryClient, scheduleId: string): void {
  queryClient.invalidateQueries({
    queryKey: adminLessonScheduleControllerGetScheduleQueryKey({ path: { scheduleId } }),
  });
}

export function invalidateSessionMemoQuery(queryClient: QueryClient, scheduleId: string): void {
  queryClient.invalidateQueries({
    queryKey: adminLessonBookingControllerGetSessionMemoQueryKey({ path: { scheduleId } }),
  });
}

/** 姓 名 from the admin members list, falling back to the member number. */
export function formatMemberName(member: {
  lastName: string | null;
  firstName: string | null;
  memberNumber: string;
}): string {
  return formatFullName(member.lastName, member.firstName) || member.memberNumber;
}
