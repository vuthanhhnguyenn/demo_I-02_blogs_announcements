import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

import type { LessonScheduleDetailDto } from '@/lib/api-real/types.gen';

type ScheduleDateTime = Pick<LessonScheduleDetailDto, 'scheduledDate' | 'startTime' | 'endTime'>;

/** `scheduledDate` (YYYY-MM-DD) + `startTime` (HH:mm) → local ISO-like string the date utils accept. */
export function scheduleStartIso(schedule: ScheduleDateTime): string {
  return `${schedule.scheduledDate}T${schedule.startTime}:00`;
}

export function scheduleEndIso(schedule: ScheduleDateTime): string {
  return `${schedule.scheduledDate}T${schedule.endTime}:00`;
}

/** e.g. 10月27日（火） */
export function formatScheduleDateLong(schedule: ScheduleDateTime): string {
  try {
    return format(new Date(scheduleStartIso(schedule)), 'M月d日（E）', { locale: ja });
  } catch {
    return schedule.scheduledDate;
  }
}

/** e.g. 2026/10/27(火) */
export function formatScheduleDateShort(schedule: ScheduleDateTime): string {
  try {
    return format(new Date(scheduleStartIso(schedule)), 'yyyy/M/d(E)', { locale: ja });
  } catch {
    return schedule.scheduledDate;
  }
}

/** e.g. 10:00〜11:00 — the API already carries HH:mm strings. */
export function formatScheduleTimeRange(schedule: ScheduleDateTime, separator = '〜'): string {
  return `${schedule.startTime}${separator}${schedule.endTime}`;
}

/** reserved + pending — the bookings a schedule write cascades to / notifies (attended are left alone). */
export function liveBookingCount(
  schedule: Pick<LessonScheduleDetailDto, 'bookingSummary'>,
): number {
  const { reserved, pending } = schedule.bookingSummary;
  return reserved + pending;
}

/** 姓 名 for every assigned trainer, in display order, joined with 「・」 (screen spec FR-007-01); empty string when none. */
export function formatTrainerNames(schedule: Pick<LessonScheduleDetailDto, 'trainerRows'>): string {
  return schedule.trainerRows.map((t) => `${t.lastName} ${t.firstName}`.trim()).join('・');
}
