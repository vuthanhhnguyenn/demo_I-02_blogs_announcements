import { formatISODateLocal } from '@/utils/date.util';
import { type QueryClient, queryOptions } from '@tanstack/react-query';

import {
  adminLessonScheduleControllerAreaDashboardQueryKey,
  adminLessonScheduleControllerFromHereImpactQueryKey,
  adminLessonScheduleControllerGetRecurrenceQueryKey,
  adminLessonScheduleControllerGetScheduleQueryKey,
  adminLessonScheduleControllerListSchedulesQueryKey,
  adminLessonScheduleControllerScheduleHistoryQueryKey,
  adminLessonScheduleControllerStoreDashboardQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { AdminLessonScheduleManagementApi112 } from '@/lib/api-real/sdk.gen';
import type {
  AdminLessonScheduleControllerListSchedulesData,
  LessonRecurrenceDetailDto,
  LessonScheduleDashboardAlertItemDto,
  LessonScheduleListItemDto,
  UpdateSchedulesFromHereRequestDto,
} from '@/lib/api-real/types.gen';
import { lazyQueryIds } from '@/lib/query-id.util';

export type LessonScheduleListQuery = NonNullable<
  AdminLessonScheduleControllerListSchedulesData['query']
>;
export type LessonScheduleAlertType = LessonScheduleDashboardAlertItemDto['alertTypes'][number];
export type LessonScheduleStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

/** Lesson-schedule error codes the UI reacts to specifically (integration-plan.md decision D6) */
export const LESSON_SCHEDULE_ERROR_CODE = {
  /** 404 — the schedule does not exist */
  notFound: 'E-LSC-001',
  /** 422 — the schedule is cancelled and can no longer be edited */
  cancelled: 'E-LSC-013',
  /** 409 — `expectedUpdatedAt` is older than the row (someone else saved first) */
  staleUpdate: 'E-LSC-014',
  /** 422 — 以降すべて on a one-off schedule */
  notInRecurrence: 'E-LSC-017',
  /** 422 — `changeReason` missing */
  changeReasonRequired: 'E-LSC-022',
} as const;

/** Reads `ErrorResponseDto.code` off a thrown API error; undefined for transport errors */
export function getLessonScheduleErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Lists — every page, not just the first
// ---------------------------------------------------------------------------

/** The lists read whole take at most 100 rows a page, so every page is read at that maximum. */
export const LIST_PAGE_SIZE = 100;

export interface ListPaging {
  page: number;
  limit: number;
}

interface PagedList<T> {
  items: T[];
  pagination: { totalPages: number };
}

/**
 * Walks every page of a paginated admin list, up to the last one — one `limit` page, or a fixed
 * number of pages, silently drops the rest (k.iwaki on FE !200). Only for lists bounded by what
 * they are scoped to: one store's studios / templates, a date window's holidays, exceptions and
 * schedules. Lists that grow with the company (stores, trainers, lessons) are searched on the
 * server and read on scroll instead.
 */
export async function fetchAllPages<T>(
  fetchPage: (paging: ListPaging) => Promise<PagedList<T>>,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const data = await fetchPage({ page, limit: LIST_PAGE_SIZE });
    items.push(...data.items);
    if (page >= data.pagination.totalPages) return items;
  }
}

/**
 * Query options reading every page of a list into one array. The key extends the generated list
 * key, so invalidating that key refreshes this query too.
 */
export const allPagesQueryOptions = <T>(
  listKey: readonly unknown[],
  fetchPage: (paging: ListPaging, signal: AbortSignal) => Promise<PagedList<T>>,
) =>
  queryOptions({
    queryKey: [...listKey, 'all-pages'],
    queryFn: ({ signal }) => fetchAllPages((paging) => fetchPage(paging, signal)),
  });

/**
 * The calendar views need every schedule in the window (day or week), not one page, so the
 * pages are walked inside a single query.
 */
export const lessonScheduleAllPagesOptions = (query: LessonScheduleListQuery) =>
  allPagesQueryOptions<LessonScheduleListItemDto>(
    adminLessonScheduleControllerListSchedulesQueryKey({ query }),
    async (paging, signal) =>
      (
        await AdminLessonScheduleManagementApi112.adminLessonScheduleControllerListSchedules({
          query: { ...query, ...paging },
          signal,
          throwOnError: true,
        })
      ).data,
  );

/**
 * These query keys require their params (query or path), so they are matched by the generated
 * operation id (`queryKey[0]._id`) instead of a key prefix.
 */
const parameterisedQueryIds = lazyQueryIds(() => [
  adminLessonScheduleControllerStoreDashboardQueryKey({ query: { storeId: '' } }),
  adminLessonScheduleControllerAreaDashboardQueryKey({ query: { areaId: '' } }),
  adminLessonScheduleControllerGetScheduleQueryKey({ path: { scheduleId: '' } }),
  adminLessonScheduleControllerScheduleHistoryQueryKey({ path: { scheduleId: '' } }),
  adminLessonScheduleControllerGetRecurrenceQueryKey({ path: { recurrenceId: '' } }),
  adminLessonScheduleControllerFromHereImpactQueryKey({ path: { scheduleId: '' } }),
]);

/**
 * Everything a schedule write can change on screen: list windows, both dashboards, the
 * schedule detail + history, the recurrence detail and the from-here impact counts.
 */
export function invalidateLessonScheduleQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: adminLessonScheduleControllerListSchedulesQueryKey(),
  });
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const [key] = query.queryKey as [{ _id?: unknown } | undefined];
      return typeof key?._id === 'string' && parameterisedQueryIds().has(key._id);
    },
  });
}

/** Last day the list accepts for a window starting at `from` (`to` ≤ from + 3 calendar months). */
export function threeMonthsLater(from: string): string {
  const d = new Date(`${from}T00:00:00`);
  d.setMonth(d.getMonth() + 3);
  d.setDate(d.getDate() - 1);
  return formatISODateLocal(d);
}

/**
 * TODO(round2) B7: `GET /admin/trainers` and `GET /admin/studios` accept `page` / `limit`
 * (zod, max 100, default 20) but the Swagger omits them, so the generated query types have no
 * `page` / `limit`. This is the one cast until the backend documents them.
 */
export function withPaging<T extends object>(query: T, paging: ListPaging): T {
  return { ...query, ...paging } as T;
}

// ---------------------------------------------------------------------------
// Schedule change (dashboard modal) — PATCH {id} / POST {id}/update-from-here
// ---------------------------------------------------------------------------

interface ScheduleChangeInput {
  startTime: string;
  /** Replacement for the primary trainer, or `null` to keep the current set */
  newTrainerId: string | null;
  reason: string;
}

/** The update-from-here body with the lock the PATCH requires (API-112 §7.6) — fits both scopes */
type ScheduleChangeBody = UpdateSchedulesFromHereRequestDto & { expectedUpdatedAt: string };

/**
 * One body for both scopes: `UpdateSchedulesFromHereRequestDto` is a subset of the PATCH body.
 * Only changed fields are sent; the end time is not — the server derives it from the lesson
 * length (API-112), and `expectedUpdatedAt` always rides along (required on the PATCH since
 * API-112 §7.6) so a concurrent save is 409 E-LSC-014 instead of a silent overwrite. The modal changes one instructor, so it replaces the
 * PRIMARY trainer and keeps any co-trainers (a session may have several — FR v7).
 */
export function toScheduleChangeBody(
  schedule: LessonScheduleListItemDto,
  input: ScheduleChangeInput,
): ScheduleChangeBody {
  const body: ScheduleChangeBody = {
    changeReason: input.reason.trim(),
    expectedUpdatedAt: schedule.updatedAt,
  };
  if (input.startTime !== schedule.startTime) body.startTime = input.startTime;
  if (input.newTrainerId) {
    const [, ...coTrainers] = schedule.trainerIds;
    body.trainerIds = [input.newTrainerId, ...coTrainers.filter((id) => id !== input.newTrainerId)];
  }
  return body;
}

// ---------------------------------------------------------------------------
// Display helpers for LessonScheduleListItemDto
// ---------------------------------------------------------------------------

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** `YYYY-MM-DDTHH:mm` of the current moment in JST — schedule dates/times are store-local (JST). */
function nowJstKey(): string {
  return new Date(Date.now() + JST_OFFSET_MS).toISOString().slice(0, 16);
}

/** The API has no status field — it is derived from `isCancelled` and the JST clock. */
export function getScheduleStatus(item: LessonScheduleListItemDto): LessonScheduleStatus {
  if (item.isCancelled) return 'cancelled';
  const now = nowJstKey();
  if (now >= `${item.scheduledDate}T${item.endTime}`) return 'completed';
  if (now >= `${item.scheduledDate}T${item.startTime}`) return 'in_progress';
  return 'scheduled';
}

/** One-to-one rows (personal training / body care) hold a single member. */
export function isOneToOneLesson(item: Pick<LessonScheduleListItemDto, 'lessonType'>): boolean {
  return item.lessonType === 'personal_training' || item.lessonType === 'body_care';
}

/** Trainer names in assignment order, joined for one line (empty names dropped). */
export function formatTrainerNames(item: Pick<LessonScheduleListItemDto, 'trainerNames'>): string {
  return item.trainerNames.filter(Boolean).join('、');
}

/**
 * Timeline title. A one-to-one row shows the booked member, like the prototype's
 * 「パーソナル：渡辺様」; an empty slot keeps the lesson name.
 */
export function getScheduleTitle(item: LessonScheduleListItemDto): string {
  const memberName = item.personalBooking?.memberDisplayName;
  if (isOneToOneLesson(item) && memberName) return `パーソナル：${memberName}様`;
  return item.lessonName;
}

/** The prototype's payment tag on a one-to-one row: 月次プラン / 都度60分 / 体験. */
export function getPersonalPaymentLabel(item: LessonScheduleListItemDto): string | null {
  if (!isOneToOneLesson(item) || !item.personalBooking) return null;
  switch (item.personalBooking.paymentType) {
    case 'monthly_plan':
      return '月次プラン';
    case 'per_use':
      return item.durationMinutes ? `都度${item.durationMinutes}分` : '都度';
    case 'trial':
      return '体験';
    default:
      return null;
  }
}

const ALERT_TYPE_LABEL: Record<
  Exclude<LessonScheduleAlertType, 'late_cancellation_surge'>,
  string
> = {
  trainer_unassigned: 'インストラクター未確定',
  studio_inactive: 'スタジオ利用停止中',
};

/** 要対応 alert text for one schedule (store dashboard `alerts.items[]`). */
export function formatScheduleAlert(alert: LessonScheduleDashboardAlertItemDto): string {
  return alert.alertTypes
    .map((type) =>
      type === 'late_cancellation_surge'
        ? `直前キャンセル多発(${alert.lateCancellationCount ?? 0}件)`
        : ALERT_TYPE_LABEL[type],
    )
    .join('・');
}

const DAY_OF_WEEK_LABEL = ['日', '月', '火', '水', '木', '金', '土'];
const RECURRENCE_TYPE_LABEL: Record<LessonRecurrenceDetailDto['recurrenceType'], string> = {
  weekly: '毎週',
  biweekly: '隔週',
  monthly: '毎月',
};

/** 「毎週 月・水」 from a recurrence (`daysOfWeek` is 0 = Sunday … 6 = Saturday). */
export function formatRecurrencePattern(
  recurrence: Pick<LessonRecurrenceDetailDto, 'recurrenceType' | 'daysOfWeek'>,
): string {
  const days = [...recurrence.daysOfWeek]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) // Monday first
    .map((d) => DAY_OF_WEEK_LABEL[d] ?? '')
    .join('・');
  return `${RECURRENCE_TYPE_LABEL[recurrence.recurrenceType]} ${days}`.trim();
}

/** Fill rate (0.0–1.0, nullable) as a whole percentage. */
export function toPercent(rate: number | null | undefined): number | null {
  return rate === null || rate === undefined ? null : Math.round(rate * 100);
}

/** `HH:mm` + minutes → `HH:mm` (same-day; the change dialog previews the server-derived end). */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m + minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Minutes between two `HH:mm` times of the same day. */
export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}
