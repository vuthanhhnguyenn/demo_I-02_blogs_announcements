'use client';

import { useMemo } from 'react';

import { formatISODateLocal } from '@/utils/date.util';
import { parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

export type ScheduleViewMode = 'day' | 'week' | 'list';
/** FR-001-a view tabs: 店舗別 / 自分のスケジュール / エリア別 */
export type ScheduleAxis = 'store' | 'my_schedule' | 'area';
export type ScheduleSortBy =
  | 'start_time'
  | 'lesson_name'
  | 'studio_name'
  | 'instructor_name'
  | 'booked_count'
  | 'status';

const VIEW_MODES: ScheduleViewMode[] = ['day', 'week', 'list'];
const AXES: ScheduleAxis[] = ['store', 'my_schedule', 'area'];
const SORT_ORDERS: ('asc' | 'desc')[] = ['asc', 'desc'];

function todayISO(): string {
  return formatISODateLocal(new Date());
}

function weekStartISO(from?: string): string {
  const d = from ? new Date(from) : new Date();
  const dow = d.getDay();
  const diff = (dow + 6) % 7; // Monday-first
  d.setDate(d.getDate() - diff);
  return formatISODateLocal(d);
}

interface UseLessonScheduleFiltersOptions {
  /** A Trainer has only 自分のスケジュール, whatever `axis` the URL carries */
  isTrainer?: boolean;
}

export function useLessonScheduleFilters({
  isTrainer = false,
}: UseLessonScheduleFiltersOptions = {}) {
  const [queryFilters, setFilters] = useQueryStates(
    {
      // No default here: an unset view follows the tab (see `filters` below)
      view: parseAsStringEnum<ScheduleViewMode>(VIEW_MODES),
      axis: parseAsStringEnum<ScheduleAxis>(AXES).withDefault('store'),
      date: parseAsString.withDefault(todayISO()),
      week_start: parseAsString.withDefault(weekStartISO()),
      store_id: parseAsString,
      // Real API ids (UUID) — the studio / trainer filters run client-side over the loaded window
      studio_id: parseAsString,
      instructor_id: parseAsString,
      // Y-15 area node of the エリア別 tab (GET /lesson-schedules/area-dashboard); its stores also
      // feed the 店舗別 tab's store picker while the header is on 全店舗
      area_id: parseAsString,
      sort_by: parseAsString.withDefault('start_time'),
      sort_order: parseAsStringEnum<'asc' | 'desc'>(SORT_ORDERS).withDefault('asc'),
    },
    { history: 'push', shallow: false },
  );

  // FR-002: 自分のスケジュール (指導者視点) opens as the weekly calendar of one's own sessions; the
  // other tabs open on the day. A view picked in the toolbar is kept in the URL and wins.
  const filters = useMemo(() => {
    const axis = isTrainer ? 'my_schedule' : queryFilters.axis;
    const view: ScheduleViewMode = queryFilters.view ?? (axis === 'my_schedule' ? 'week' : 'day');
    return { ...queryFilters, view };
  }, [queryFilters, isTrainer]);

  function setDate(date: string) {
    setFilters({ date, week_start: weekStartISO(date) });
  }

  function goToPrev() {
    if (filters.view === 'week') {
      const d = new Date(filters.week_start);
      d.setDate(d.getDate() - 7);
      const iso = formatISODateLocal(d);
      setFilters({ week_start: iso, date: iso });
    } else {
      const d = new Date(filters.date);
      d.setDate(d.getDate() - 1);
      setDate(formatISODateLocal(d));
    }
  }

  function goToNext() {
    if (filters.view === 'week') {
      const d = new Date(filters.week_start);
      d.setDate(d.getDate() + 7);
      const iso = formatISODateLocal(d);
      setFilters({ week_start: iso, date: iso });
    } else {
      const d = new Date(filters.date);
      d.setDate(d.getDate() + 1);
      setDate(formatISODateLocal(d));
    }
  }

  function goToToday() {
    const today = todayISO();
    setFilters({ date: today, week_start: weekStartISO(today) });
  }

  /** Inclusive `from` / `to` of the list window: the week in 週間, else the single day. */
  const dateWindow = (() => {
    if (filters.view !== 'week') return { from: filters.date, to: filters.date };
    const end = new Date(filters.week_start);
    end.setDate(end.getDate() + 6);
    return { from: filters.week_start, to: formatISODateLocal(end) };
  })();

  return {
    filters,
    setFilters,
    setDate,
    goToPrev,
    goToNext,
    goToToday,
    dateWindow,
  };
}
