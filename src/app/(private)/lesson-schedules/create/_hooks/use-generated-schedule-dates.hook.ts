import { useMemo } from 'react';
import { type Control, useWatch } from 'react-hook-form';

import { DAY_OF_WEEK_LABELS } from '../_constants/constants';
import type { LessonScheduleFormValues } from '../_schemas/lesson-schedule-form.schema';
import { type HolidayChainHit, isStoreClosure, useHolidayChain } from './use-holiday-chain.hook';

export interface GeneratedScheduleDate {
  isoDate: string;
  date: string;
  dow: string;
  time: string;
  /** Falls on a store closure (店舗休業日) and is generated anyway (skip_holidays off) */
  conflict: boolean;
}

const DAY_MS = 86_400_000;
/** The API refuses an until_date rule above 500 sessions (E-VAL-001) — expanded one past it */
export const MAX_UNTIL_DATE_OCCURRENCES = 500;
/**
 * A count rule is expanded until its quota is met, like the backend (`COUNT_GUARD_MONTHS`); this
 * only stops a pattern that never fills it (e.g. every session on a closed day, skipped)
 */
const COUNT_GUARD_MONTHS = 600;
/** Skipped closed days push a count rule's last session later — read the calendar this much further */
const COUNT_SKIP_MARGIN_MONTHS = 12;
/** An `unlimited` rule is generated up to today (JST) + 3 calendar months */
const UNLIMITED_HORIZON_MONTHS = 3;

function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` + n calendar months, clamped to the month's last day (2026-11-30 + 3 → 2027-02-28). */
function addCalendarMonths(day: string, months: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

interface ExpandInput {
  startDate: string;
  endDate: string;
  limit: number;
  recurrenceType: NonNullable<LessonScheduleFormValues['repeat_type']>;
  daysOfWeek: number[];
  skipHolidays: boolean;
  chainHit: (day: string) => HolidayChainHit | null;
}

/**
 * Same walk as the backend's `expandOccurrences` (API-112 §6.6) over UTC dates:
 * - biweekly keeps the parity of `floor(epochMs / week)` relative to the start date's,
 * - monthly keeps the start date's weekday AND its position in the month (e.g. 2nd Monday),
 * - with skip_holidays a holiday-chain date is dropped without counting toward the limit.
 */
function expandOccurrences(input: ExpandInput): { day: string; hit: HolidayChainHit | null }[] {
  const out: { day: string; hit: HolidayChainHit | null }[] = [];
  const anchor = new Date(`${input.startDate}T00:00:00Z`);
  const end = new Date(`${input.endDate}T00:00:00Z`);
  const anchorWeek = Math.floor(anchor.getTime() / (7 * DAY_MS));
  const days = input.recurrenceType === 'monthly' ? [anchor.getUTCDay()] : input.daysOfWeek;

  for (
    let cursor = new Date(anchor);
    cursor <= end && out.length < input.limit;
    cursor = new Date(cursor.getTime() + DAY_MS)
  ) {
    if (!days.includes(cursor.getUTCDay())) continue;
    if (input.recurrenceType === 'biweekly') {
      const week = Math.floor(cursor.getTime() / (7 * DAY_MS));
      if ((week - anchorWeek) % 2 !== 0) continue;
    }
    if (input.recurrenceType === 'monthly') {
      if (Math.ceil(cursor.getUTCDate() / 7) !== Math.ceil(anchor.getUTCDate() / 7)) continue;
    }
    const day = cursor.toISOString().slice(0, 10);
    const hit = input.chainHit(day);
    if (input.skipHolidays && hit) continue;
    out.push({ day, hit });
  }
  return out;
}

/**
 * The dates the form will create, with their holiday-chain status — the 実施予定日 preview, the
 * 休業日 warnings and the instructor-conflict probe all read this. A 単発 schedule yields its
 * one date; 繰り返し follows the backend's expansion, since the API offers no preview. The whole
 * series is computed — its total and last date never depend on how much of it the list shows —
 * except an `unlimited` rule, whose series is open-ended: only up to today + 3 months is created
 * (and shown), topped up monthly by BAT-038.
 */
export function useScheduleDatePlan(control: Control<LessonScheduleFormValues>) {
  const [
    scheduleMode,
    singleDate,
    recurringStartDate,
    startTime,
    repeatType,
    daysOfWeekRaw,
    endCondition,
    endDate,
    endCount,
    skipHolidays,
    storeId,
  ] = useWatch({
    control,
    name: [
      'schedule_mode',
      'date',
      'start_date',
      'start_time',
      'repeat_type',
      'days_of_week',
      'end_condition',
      'end_date',
      'end_count',
      'skip_holidays',
      'store_id',
    ],
  });

  const days = useMemo(() => daysOfWeekRaw ?? [], [daysOfWeekRaw]);
  const recurrenceType = repeatType ?? 'weekly';
  const countLimit =
    endCondition === 'by_count'
      ? endCount === undefined || endCount === null
        ? 12
        : Number(endCount)
      : 0;

  // A count rule's last session, ignoring closed days — how far its calendar must be read
  const countRawLastDate = useMemo(() => {
    if (scheduleMode !== 'recurring' || endCondition !== 'by_count' || !recurringStartDate) {
      return '';
    }
    if (days.length === 0 && recurrenceType !== 'monthly') return '';
    const raw = expandOccurrences({
      startDate: recurringStartDate,
      endDate: addCalendarMonths(recurringStartDate, COUNT_GUARD_MONTHS),
      limit: countLimit,
      recurrenceType,
      daysOfWeek: days,
      skipHolidays: false,
      chainHit: () => null,
    });
    return raw[raw.length - 1]?.day ?? '';
  }, [scheduleMode, endCondition, recurringStartDate, days, recurrenceType, countLimit]);

  // The window the holiday chain must cover
  const windowFrom = scheduleMode === 'single' ? (singleDate ?? '') : (recurringStartDate ?? '');
  const windowTo = (() => {
    if (!windowFrom) return '';
    if (scheduleMode === 'single') return windowFrom;
    if (endCondition === 'by_date') return endDate ?? '';
    if (endCondition === 'by_count') {
      if (!countRawLastDate) return '';
      return skipHolidays
        ? addCalendarMonths(countRawLastDate, COUNT_SKIP_MARGIN_MONTHS)
        : countRawLastDate;
    }
    return addCalendarMonths(todayJst(), UNLIMITED_HORIZON_MONTHS);
  })();

  const {
    chainHit,
    hasStoreCalendar,
    isError: isCalendarError,
    refetch: refetchCalendar,
  } = useHolidayChain(storeId, windowFrom, windowTo);

  const dates = useMemo<GeneratedScheduleDate[]>(() => {
    if (scheduleMode !== 'recurring' || !recurringStartDate || !windowTo) return [];
    if (days.length === 0 && recurrenceType !== 'monthly') return [];

    return expandOccurrences({
      startDate: recurringStartDate,
      // A count rule runs until its quota is met (skipped closed days push it later)
      endDate:
        endCondition === 'by_count'
          ? addCalendarMonths(recurringStartDate, COUNT_GUARD_MONTHS)
          : windowTo,
      // One past the until_date cap, so the preview can say the API will refuse it
      limit: endCondition === 'by_count' ? countLimit : MAX_UNTIL_DATE_OCCURRENCES + 1,
      recurrenceType,
      daysOfWeek: days,
      skipHolidays: !!skipHolidays,
      chainHit,
    }).map(({ day, hit }) => {
      const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
      return {
        isoDate: day,
        date: day.replaceAll('-', '/'),
        dow: DAY_OF_WEEK_LABELS[dow],
        time: startTime || '--:--',
        conflict: isStoreClosure(hit),
      };
    });
  }, [
    scheduleMode,
    recurringStartDate,
    windowTo,
    days,
    recurrenceType,
    endCondition,
    countLimit,
    skipHolidays,
    startTime,
    chainHit,
  ]);

  const singleDateIsClosure =
    scheduleMode === 'single' && !!singleDate && isStoreClosure(chainHit(singleDate));

  return { dates, singleDateIsClosure, hasStoreCalendar, isCalendarError, refetchCalendar };
}
