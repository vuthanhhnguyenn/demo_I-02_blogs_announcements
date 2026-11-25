import type {
  AdminLessonScheduleControllerListSchedulesData,
  LessonRecurrenceListItemDto,
  LessonScheduleListItemDto,
  TrainerAssignedLessonDto,
  TrainerHistoryEntryDto,
} from '@/lib/api-real/types.gen';

import { HISTORY_FIELD_LABELS } from '../[id]/_constants/labels';
import { COACH_TYPE_LABELS, type CoachType } from './instructor-api.util';

/**
 * Trainer detail (API-109 #9 summary / #8 history, API-112 schedule and recurrence reads) — the
 * date window of 直近のスケジュール, the schedule / recurrence / lesson texts, and the 変更履歴 rows
 * rebuilt from the API's snapshots.
 */

// --- dates and times (the API's axis is the JST calendar day) ---

const JST_OFFSET_MS = 9 * 3_600_000;
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const parseDay = (day: string) => new Date(`${day}T00:00:00.000Z`);
const ymd = (date: Date) => date.toISOString().slice(0, 10);

/** Today's calendar date in JST (`yyyy-MM-dd`) */
export function jstTodayIso(now: Date = new Date()): string {
  return ymd(new Date(now.getTime() + JST_OFFSET_MS));
}

/** The JST wall-clock time now (`HH:mm:ss`), comparable with the API's `startTime` */
export function jstNowTime(now: Date = new Date()): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(11, 19);
}

/** `day` + n calendar months, clamped to the month's last day (Jan 31 + 1 → Feb 28/29) */
export function addCalendarMonthsIso(day: string, months: number): string {
  const d = parseDay(day);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return ymd(target);
}

/** `HH:mm:ss` → `H:mm` */
export function displayTime(time: string): string {
  const [hour, minute] = time.split(':');
  return `${Number(hour)}:${minute}`;
}

export function formatTimeRange(startTime: string, endTime: string | null | undefined): string {
  return endTime
    ? `${displayTime(startTime)}–${displayTime(endTime)}`
    : `${displayTime(startTime)}〜`;
}

/** `yyyy-MM-dd` → `M/D（曜）` */
export function formatScheduleDate(day: string): string {
  const d = parseDay(day);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEKDAY_LABELS[d.getUTCDay()]}）`;
}

/** `yyyy-MM-dd` → `yyyy/M/D` */
function formatSlashDate(day: string): string {
  const d = parseDay(day);
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** 0 = Sunday … 6 = Saturday, shown Monday first */
function weekdayLabels(days: readonly number[]): string[] {
  return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAY_LABELS[d]);
}

// --- 直近のスケジュール (FR-003, D8) ---

export const UPCOMING_WINDOW_MONTHS = 3;
export const UPCOMING_INLINE_COUNT = 5;
export const UPCOMING_PAGE_SIZE = 200;

type ScheduleListQuery = NonNullable<AdminLessonScheduleControllerListSchedulesData['query']>;

/**
 * The trainer's published, not cancelled sessions from today (JST) over the API's widest window
 * (today + 3 calendar months), ascending. No `storeId`: with `trainerId` the rows are every store in
 * the caller's read scope (API-112 v0.15).
 */
export function upcomingScheduleQuery(trainerId: string, today: string): ScheduleListQuery {
  return {
    trainerId,
    from: today,
    to: addCalendarMonthsIso(today, UPCOMING_WINDOW_MONTHS),
    isPublished: true,
    sort: 'scheduledDate',
    order: 'asc',
    limit: UPCOMING_PAGE_SIZE,
  };
}

/** FR-003: sessions starting from now — today's ones that already started are left out */
export function isUpcoming(
  schedule: Pick<LessonScheduleListItemDto, 'scheduledDate' | 'startTime'>,
  today: string,
  nowTime: string,
): boolean {
  return schedule.scheduledDate > today || schedule.startTime >= nowTime;
}

// --- 繰り返し設定 (D9) ---

const RECURRENCE_TYPE_LABELS: Record<LessonRecurrenceListItemDto['recurrenceType'], string> = {
  weekly: '毎週',
  biweekly: '隔週',
  monthly: '毎月',
};

/** An active rule that has not ended */
export function isCurrentRecurrence(rule: LessonRecurrenceListItemDto, today: string): boolean {
  return rule.isActive && (rule.endDate === null || rule.endDate >= today);
}

/** 「毎週 月・水」 */
export function recurrencePatternText(rule: LessonRecurrenceListItemDto): string {
  return `${RECURRENCE_TYPE_LABELS[rule.recurrenceType]} ${weekdayLabels(rule.daysOfWeek).join('・')}`;
}

/** 「2026/3/1 〜 2026/4/30」, 「2026/3/1 〜 12回」 or 「2026/3/1 〜」 */
export function recurrencePeriodText(rule: LessonRecurrenceListItemDto): string {
  const start = formatSlashDate(rule.startDate);
  if (rule.endDate) return `${start} 〜 ${formatSlashDate(rule.endDate)}`;
  if (rule.maxOccurrences) return `${start} 〜 ${rule.maxOccurrences}回`;
  return `${start} 〜`;
}

// --- 担当レッスン / 実績サマリー (D10, D11) ---

/** The rule's weekdays, or the weekday of a single session's date */
export function assignedLessonWeekdays(lesson: TrainerAssignedLessonDto): string[] {
  if (lesson.daysOfWeek && lesson.daysOfWeek.length > 0) return weekdayLabels(lesson.daysOfWeek);
  return [WEEKDAY_LABELS[parseDay(lesson.nextDate).getUTCDay()]];
}

/** The API's rates are ratios (0–1); the screens show whole percentages */
export function toPercent(rate: number | null): number | null {
  return rate === null ? null : Math.round(rate * 100);
}

// --- 変更履歴 (D12) ---

export interface InstructorHistoryRow {
  timestamp: string;
  user: string;
  field: string | null;
  before: string | null;
  after: string | null;
  isCreate: boolean;
}

/** §5.3 snapshot: the trainers row and its coach types (no derived fields) */
interface TrainerSnapshot {
  lastName?: string;
  firstName?: string;
  nickname?: string | null;
  lastNameRomanized?: string | null;
  firstNameRomanized?: string | null;
  middleNameRomanized?: string | null;
  bio?: string | null;
  careerHistory?: string | null;
  facePhotoS3Key?: string | null;
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
  minBookingHours?: number;
  isActive?: boolean;
  coachTypes?: string[];
  staffId?: string | null;
}

const EVENT_LABELS: Record<TrainerHistoryEntryDto['eventType'], string> = {
  created: '作成',
  updated: '更新',
  deleted: '無効化',
  restored: '有効化',
};

const blank = (value: string | null | undefined) => (value ? value : '（空欄）');
const joined = (parts: (string | null | undefined)[]) =>
  parts.filter((part): part is string => !!part && part.trim().length > 0).join(' ');

/** 最短受付期間, as the detail card words it */
export function leadHoursText(hours: number | undefined): string {
  if (hours === undefined) return '—';
  return hours === 0 ? '制限なし' : `${hours}時間前まで`;
}

const minutesText = (minutes: number | undefined) => (minutes === undefined ? '—' : `${minutes}分`);

function coachTypesText(types: string[] = []): string {
  return types.length === 0
    ? '（空欄）'
    : types.map((t) => COACH_TYPE_LABELS[t as CoachType] ?? t).join('、');
}

function diffSnapshots(
  older: TrainerSnapshot,
  newer: TrainerSnapshot,
  staffName: (staffId: string) => string,
): { field: string; before: string; after: string }[] {
  const diffs: { field: string; before: string; after: string }[] = [];
  const push = (field: string, before: string, after: string) => {
    if (before !== after) diffs.push({ field, before, after });
  };
  const staff = (id: string | null | undefined) => (id ? staffName(id) : '（なし）');

  push(
    HISTORY_FIELD_LABELS.name,
    joined([older.lastName, older.firstName]),
    joined([newer.lastName, newer.firstName]),
  );
  push(
    HISTORY_FIELD_LABELS.romanizedName,
    blank(joined([older.lastNameRomanized, older.firstNameRomanized, older.middleNameRomanized])),
    blank(joined([newer.lastNameRomanized, newer.firstNameRomanized, newer.middleNameRomanized])),
  );
  push(HISTORY_FIELD_LABELS.nickname, blank(older.nickname), blank(newer.nickname));
  push(
    HISTORY_FIELD_LABELS.coachTypes,
    coachTypesText(older.coachTypes),
    coachTypesText(newer.coachTypes),
  );
  push(HISTORY_FIELD_LABELS.bio, blank(older.bio), blank(newer.bio));
  push(HISTORY_FIELD_LABELS.careerHistory, blank(older.careerHistory), blank(newer.careerHistory));
  if ((older.facePhotoS3Key ?? null) !== (newer.facePhotoS3Key ?? null)) {
    diffs.push({
      field: HISTORY_FIELD_LABELS.facePhoto,
      before: older.facePhotoS3Key ? '設定あり' : '未設定',
      // A replaced photo is 設定あり on both sides: say it changed
      after: newer.facePhotoS3Key ? (older.facePhotoS3Key ? '変更' : '設定あり') : '未設定',
    });
  }
  push(
    HISTORY_FIELD_LABELS.minBookingHours,
    leadHoursText(older.minBookingHours),
    leadHoursText(newer.minBookingHours),
  );
  push(
    HISTORY_FIELD_LABELS.bufferBeforeMin,
    minutesText(older.bufferBeforeMin),
    minutesText(newer.bufferBeforeMin),
  );
  push(
    HISTORY_FIELD_LABELS.bufferAfterMin,
    minutesText(older.bufferAfterMin),
    minutesText(newer.bufferAfterMin),
  );
  push(HISTORY_FIELD_LABELS.staffId, staff(older.staffId), staff(newer.staffId));
  push(
    HISTORY_FIELD_LABELS.isActive,
    older.isActive === false ? '無効' : '有効',
    newer.isActive === false ? '無効' : '有効',
  );
  return diffs;
}

/** The staff ids a page of history names — their names are read separately (D12) */
export function historyStaffIds(items: TrainerHistoryEntryDto[]): string[] {
  const ids = new Set<string>();
  for (const item of items) {
    const staffId = (item.snapshot as TrainerSnapshot).staffId;
    if (staffId) ids.add(staffId);
  }
  return [...ids];
}

/**
 * Items arrive newest first; each is compared with the next (older) one. The page's last item is
 * compared with `olderThanPage` — the first item of the next page — so a page break never hides a
 * change (studios precedent).
 */
export function toInstructorHistoryRows(
  items: TrainerHistoryEntryDto[],
  olderThanPage: TrainerHistoryEntryDto | undefined,
  staffName: (staffId: string) => string,
): InstructorHistoryRow[] {
  const rows: InstructorHistoryRow[] = [];
  items.forEach((item, index) => {
    const base = { timestamp: item.changedAt, user: item.changedByName || '—' };
    if (item.eventType === 'created') {
      rows.push({ ...base, field: null, before: null, after: null, isCreate: true });
      return;
    }
    const older = (items[index + 1] ?? olderThanPage)?.snapshot as TrainerSnapshot | undefined;
    const diffs = older ? diffSnapshots(older, item.snapshot as TrainerSnapshot, staffName) : [];
    if (diffs.length === 0) {
      rows.push({
        ...base,
        field: null,
        before: null,
        after: EVENT_LABELS[item.eventType],
        isCreate: false,
      });
      return;
    }
    for (const diff of diffs) rows.push({ ...base, ...diff, isCreate: false });
  });
  return rows;
}
