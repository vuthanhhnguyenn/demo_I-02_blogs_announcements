import type { LessonRecurrenceDetailDto } from '@/lib/api-real/types.gen';

type RecurrenceType = LessonRecurrenceDetailDto['recurrenceType'];

/** API-112 `recurrenceType` → 繰り返し prefix. Drift from the DTO enum fails `tsc` here. */
const RECURRENCE_TYPE_LABELS: Record<RecurrenceType, string> = {
  weekly: '毎週',
  biweekly: '隔週',
  monthly: '毎月',
};

/** `daysOfWeek` uses 0 = Sunday … 6 = Saturday; the label lists Monday first, Sunday last. */
const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: '日',
  1: '月',
  2: '火',
  3: '水',
  4: '木',
  5: '金',
  6: '土',
};
const DAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** 繰り返し row of the lesson info card — e.g. 「毎週 月・水・金・土・日」 (spec FR-007 lesson info card). */
export function formatRecurrenceLabel(
  recurrence: Pick<LessonRecurrenceDetailDto, 'recurrenceType' | 'daysOfWeek'>,
): string {
  const prefix = RECURRENCE_TYPE_LABELS[recurrence.recurrenceType] ?? '繰り返し';
  const days = DAY_DISPLAY_ORDER.filter((day) => recurrence.daysOfWeek.includes(day)).map(
    (day) => DAY_OF_WEEK_LABELS[day],
  );
  return days.length > 0 ? `${prefix} ${days.join('・')}` : prefix;
}
