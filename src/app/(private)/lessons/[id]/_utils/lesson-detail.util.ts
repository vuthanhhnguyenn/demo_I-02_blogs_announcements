import { ALL_STORES } from '@/contexts/current-store.context';

import type {
  AdminLessonScheduleControllerListSchedulesData,
  LessonRecurrenceListItemDto,
  LessonScheduleListItemDto,
} from '@/lib/api-real/types.gen';

import {
  RECURRENCE_TYPE_LABELS,
  WEEKDAY_DISPLAY_ORDER,
  WEEKDAY_LABELS,
} from '../_constants/constants';

/**
 * Detail-only helpers for the lesson content detail screen (API-111 detail + API-112 schedules).
 * Formatting only — the DTOs are consumed directly by the cards.
 */

type ListSchedulesQuery = NonNullable<AdminLessonScheduleControllerListSchedulesData['query']>;

/** The 直近のスケジュール window: `from` = today (JST), `to` = today + 3 calendar months. */
export interface UpcomingScheduleWindow {
  from: string;
  to: string;
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const pad2 = (n: number): string => String(n).padStart(2, '0');

function toIsoDate(year: number, monthIndex: number, day: number): string {
  // Date.UTC normalises a month index past December into the next year.
  const date = new Date(Date.UTC(year, monthIndex, day));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/**
 * API-112 caps a list window at `from` + 3 calendar months (E-VAL-001 beyond it), so `to` is
 * clamped to the last day of the target month (11/30 → 2/28, never 3/2).
 */
export function getUpcomingScheduleWindow(now: Date = new Date()): UpcomingScheduleWindow {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jst.getUTCFullYear();
  const month = jst.getUTCMonth();
  const day = jst.getUTCDate();
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 4, 0)).getUTCDate();
  return {
    from: toIsoDate(year, month, day),
    to: toIsoDate(year, month + 3, Math.min(day, lastDayOfTargetMonth)),
  };
}

/**
 * The store whose sessions the 直近のスケジュール card lists. API-112 §4.1 needs a `storeId` on the
 * store view (400 E-VAL-001 without it), so: a store-specific lesson → its own store (its sessions
 * are only held there); a brand-wide lesson → the store picked in the header; neither (a brand-wide
 * lesson while the header is on 全店舗) → `null`, and the card asks for a store instead of calling.
 */
export function scheduleStoreId(
  lessonStoreId: string | null,
  currentStoreId: string,
): string | null {
  if (lessonStoreId) return lessonStoreId;
  return currentStoreId && currentStoreId !== ALL_STORES ? currentStoreId : null;
}

/**
 * Booked seats against `capacity`. `bookingCount` counts every live booking, trials included
 * (API-112 v0.11); on an `additive` schedule the trial seats sit on top of `capacity`, so they are
 * left out of the n/定員 figure there.
 */
export function seatBookingCount(
  session: Pick<
    LessonScheduleListItemDto,
    'bookingCount' | 'trialBookingCount' | 'trialCapacityMode'
  >,
): number {
  return session.trialCapacityMode === 'additive'
    ? session.bookingCount - session.trialBookingCount
    : session.bookingCount;
}

/** API-112 list query for the lesson's upcoming, non-cancelled sessions at one store, soonest first. */
export function upcomingSchedulesQuery(
  lessonId: string,
  storeId: string,
  window: UpcomingScheduleWindow,
  limit: number,
): ListSchedulesQuery {
  return {
    lessonId,
    storeId,
    from: window.from,
    to: window.to,
    sort: 'scheduledDate',
    order: 'asc',
    limit,
  };
}

/** `HH:mm` + minutes → `HH:mm` (wraps past midnight). */
export function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(mins)) return time;
  const total = (((hours * 60 + mins + minutes) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/** `10:00–11:00` — the session time range as the mock rendered it. */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
}

/** `YYYY-MM-DD` → `YYYY/MM/DD` without a Date round trip (no timezone shift). */
function formatIsoDateSlash(isoDate: string): string {
  return isoDate.replaceAll('-', '/');
}

/** 「毎週 月・水」 — cadence + weekdays, Monday first. */
export function formatRecurrenceDays(
  recurrence: Pick<LessonRecurrenceListItemDto, 'recurrenceType' | 'daysOfWeek'>,
): string {
  const days = WEEKDAY_DISPLAY_ORDER.filter((day) => recurrence.daysOfWeek.includes(day)).map(
    (day) => WEEKDAY_LABELS[day],
  );
  const cadence = RECURRENCE_TYPE_LABELS[recurrence.recurrenceType] ?? '';
  return days.length > 0 ? `${cadence} ${days.join('・')}` : cadence;
}

/** The series period: `2026/04/01–2026/09/30`, `2026/04/01〜（全12回）` or `2026/04/01〜`. */
export function formatRecurrencePeriod(
  recurrence: Pick<
    LessonRecurrenceListItemDto,
    'startDate' | 'endType' | 'endDate' | 'maxOccurrences'
  >,
): string {
  const start = formatIsoDateSlash(recurrence.startDate);
  if (recurrence.endType === 'until_date' && recurrence.endDate) {
    return `${start}–${formatIsoDateSlash(recurrence.endDate)}`;
  }
  if (recurrence.endType === 'count' && recurrence.maxOccurrences != null) {
    return `${start}〜（全${recurrence.maxOccurrences}回）`;
  }
  return `${start}〜`;
}
