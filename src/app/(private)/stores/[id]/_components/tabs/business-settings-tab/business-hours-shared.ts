import { TEXTAREA_MAX_LENGTH } from '@/constants/app.constants';
import { formatISODateLocal } from '@/utils/date.util';
import { maxLengthMessage } from '@/utils/validation.util';

import type {
  BusinessHourDto,
  StoreBusinessExceptionDto,
  StoreBusinessHourDto,
} from '@/lib/api-real/types.gen';

import type { BusinessHourDay } from '../../../../_schemas/store-form.schema';
import { WEEKDAY_TO_API } from '../../../../_utils/store-api.util';

export const DAY_LABELS: Record<BusinessHourDay, string> = {
  mon: '月曜日',
  tue: '火曜日',
  wed: '水曜日',
  thu: '木曜日',
  fri: '金曜日',
  sat: '土曜日',
  sun: '日曜日',
  holiday: '祝日',
};

export const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holiday'] as const;

/**
 * Deny tooltip for the 特別営業日 and 臨時休業日 affordances — the prototype names the calendar
 * rather than falling back to the generic "no permission" copy (`store-detail.tsx` L1319, L1376).
 */
export const CALENDAR_EDIT_DENY_TOOLTIP = '営業カレンダー編集の権限がありません';

/** The weekly default set, exactly as `GET …/business-hours` returns it (decision D1) */
export type WeeklyHours = StoreBusinessHourDto[];

/**
 * One calendar exception row. 特別営業日 and 臨時休業 are the same resource on the real API and
 * are told apart by `exceptionType` on the client — decision D10, research R4.
 */
export type BusinessException = StoreBusinessExceptionDto;
export type ExceptionKind = BusinessException['exceptionType'];

/** Screen name of each exception kind (research R4: 特別営業日 = `short_hours`) */
export const EXCEPTION_KIND_LABELS: Record<ExceptionKind, string> = {
  short_hours: '特別営業日',
  closed: '臨時休業日',
};

// --- 祝日の扱い (research R3) -----------------------------------------------------------------

/**
 * 祝日の扱い (FR-029f). The contract has no mode field, so the mode is encoded in the presence of
 * the `holiday` row (research R3): no row = 曜日どおり, a closed row = 休業, an open row = 営業.
 */
export type HolidayMode = 'weekday' | 'open' | 'closed';

export const HOLIDAY_MODE_LABELS: Record<HolidayMode, string> = {
  weekday: '曜日どおり',
  open: '営業',
  closed: '休業',
};

export const HOLIDAY_MODE_ORDER: HolidayMode[] = ['weekday', 'open', 'closed'];

export const holidayRowOf = (rows: WeeklyHours) => rows.find((row) => row.dayOfWeek === 'holiday');

export function holidayModeOf(holidayRow: StoreBusinessHourDto | undefined): HolidayMode {
  if (!holidayRow) return 'weekday';
  return holidayRow.isClosed ? 'closed' : 'open';
}

// --- Calendar classification (research R5) --------------------------------------------------

/** How the store trades on one date — Y-02 v6 FR-005 「営業/休業の判定ルール（優先順位）」 */
export type DayClass =
  | 'temporary_closed'
  | 'special_open'
  | 'holiday_open'
  | 'holiday_closed'
  | 'regular_closed'
  | 'holiday_label_only'
  | 'open';

type ClassifyDayContext = {
  /** The weekly set as the API returns it (the `holiday` row, if any, is ignored here) */
  weekly: WeeklyHours;
  /** The 祝日 override row; absent = 曜日どおり (research R3) */
  holidayRow: StoreBusinessHourDto | undefined;
  /** Public-holiday dates (`YYYY-MM-DD`) */
  holidays: { has: (dateText: string) => boolean };
  /** Calendar exceptions keyed by `YYYY-MM-DD` — at most one per date (FR-029b) */
  exceptions: ReadonlyMap<string, ExceptionKind>;
};

/**
 * Classifies one date, highest precedence first (FR-024a):
 * ① a 個別日設定 — 臨時休業日 / 特別営業日;
 * ② a holiday, only when 祝日の扱い overrides it — 営業 / 休業;
 * ③ the weekday row — 定休日, otherwise open.
 * A holiday at 曜日どおり follows its weekday and only earns the 祝日 label. Only one exception may
 * exist per date, so ① needs no ordering of its own — port of V0 `resolveCalendarDay` (L437-L452).
 */
export function classifyDay(date: Date, context: ClassifyDayContext): DayClass {
  const dateText = formatISODateLocal(date);
  const exception = context.exceptions.get(dateText);
  if (exception === 'closed') return 'temporary_closed';
  if (exception === 'short_hours') return 'special_open';

  const isHoliday = context.holidays.has(dateText);
  const holidayMode = holidayModeOf(context.holidayRow);
  if (isHoliday && holidayMode === 'open') return 'holiday_open';
  if (isHoliday && holidayMode === 'closed') return 'holiday_closed';

  const weekdayRow = context.weekly.find(
    (row) => row.dayOfWeek === WEEKDAY_TO_API[getDayKey(date)],
  );
  if (weekdayRow?.isClosed) return 'regular_closed';
  return isHoliday ? 'holiday_label_only' : 'open';
}

// --- Weekly hours draft -----------------------------------------------------------------------

/**
 * The editable weekly set: always eight rows (a day the store never configured is materialised)
 * plus the 祝日の扱い, which is not a field of any row.
 */
export type WeeklyHoursDraft = {
  rows: WeeklyHours;
  holidayMode: HolidayMode;
};

/**
 * A weekday the store has never configured has no row at all (未設定, API-083 §7.2); it is
 * materialised open with empty times and 定休日 unticked, so the Sheet shows exactly what was
 * registered and agrees with the calendar (Y-02 Bug No.20). A missing 祝日 row is 曜日どおり,
 * materialised open with empty times so that switching to 営業 asks for them.
 */
export function toWeeklyHoursDraft(serverHours: WeeklyHours): WeeklyHoursDraft {
  const rows = DAY_ORDER.map((day): StoreBusinessHourDto => {
    const dayOfWeek = WEEKDAY_TO_API[day];
    const row = serverHours.find((entry) => entry.dayOfWeek === dayOfWeek);
    if (row) return { ...row };
    return {
      dayOfWeek,
      openTime: null,
      closeTime: null,
      staffStartTime: null,
      staffEndTime: null,
      isClosed: false,
    };
  });
  return { rows, holidayMode: holidayModeOf(holidayRowOf(serverHours)) };
}

/** Whether a draft row takes part in the save (the 祝日 row only when 祝日の扱い overrides) */
const isSavedRow = (row: StoreBusinessHourDto, holidayMode: HolidayMode) =>
  row.dayOfWeek !== 'holiday' || holidayMode !== 'weekday';

/**
 * A weekday left 未設定 — neither time entered and 定休日 unticked. It is not an error and is not
 * sent: a day absent from the `PUT` stays 未設定 (API-083 §8). The 祝日 row is governed by
 * 祝日の扱い instead.
 */
export const isUnsetRow = (row: StoreBusinessHourDto) =>
  row.dayOfWeek !== 'holiday' && !row.isClosed && !row.openTime && !row.closeTime;

/** Whether a draft row trades that day — a closed weekday and 祝日 = 休業 do not */
const isTradingRow = (row: StoreBusinessHourDto, holidayMode: HolidayMode) =>
  row.dayOfWeek === 'holiday' ? holidayMode === 'open' : !row.isClosed;

/** In the draft, `null` on both staff ends means 常駐なし; an emptied input is `''` */
export const isUnstaffed = (row: StoreBusinessHourDto) =>
  row.staffStartTime === null && row.staffEndTime === null;

/**
 * Days of the draft that cannot be saved, split by the Sheet that shows the message:
 * a trading day without both times (FR-029, the API's 422 `E-STR-003`), and a staffed day whose
 * window is missing an end (the API requires `staffEndTime` whenever `staffStartTime` is set).
 */
export function weeklyHourErrors(draft: WeeklyHoursDraft): {
  missingHours: Set<StoreBusinessHourDto['dayOfWeek']>;
  /** Y-02 Bug No.8 — a trading day whose close is not after its open (FR-005, the API's E-STR-003) */
  reversedHours: Set<StoreBusinessHourDto['dayOfWeek']>;
  incompleteStaffWindow: Set<StoreBusinessHourDto['dayOfWeek']>;
  /** A staffed window whose end is not after its start (BUG-U4-06); outside opening hours is fine */
  reversedStaffWindow: Set<StoreBusinessHourDto['dayOfWeek']>;
} {
  const missingHours = new Set<StoreBusinessHourDto['dayOfWeek']>();
  const reversedHours = new Set<StoreBusinessHourDto['dayOfWeek']>();
  const incompleteStaffWindow = new Set<StoreBusinessHourDto['dayOfWeek']>();
  const reversedStaffWindow = new Set<StoreBusinessHourDto['dayOfWeek']>();
  for (const row of draft.rows) {
    if (
      !isSavedRow(row, draft.holidayMode) ||
      !isTradingRow(row, draft.holidayMode) ||
      isUnsetRow(row)
    ) {
      continue;
    }
    if (!row.openTime || !row.closeTime) missingHours.add(row.dayOfWeek);
    // "HH:MM" strings compare correctly as text
    else if (row.closeTime <= row.openTime) reversedHours.add(row.dayOfWeek);
    if (!isUnstaffed(row) && (!row.staffStartTime || !row.staffEndTime)) {
      incompleteStaffWindow.add(row.dayOfWeek);
    }
    // "HH:MM" strings compare correctly as text
    if (
      !isUnstaffed(row) &&
      row.staffStartTime &&
      row.staffEndTime &&
      row.staffEndTime <= row.staffStartTime
    ) {
      reversedStaffWindow.add(row.dayOfWeek);
    }
  }
  return { missingHours, reversedHours, incompleteStaffWindow, reversedStaffWindow };
}

/**
 * The `PUT …/business-hours` body (research R3): 曜日どおり omits the 祝日 row, so the set is
 * seven rows; a 未設定 weekday is omitted (API-083 §8); a non-trading row carries no times and no
 * staff window.
 */
export function toReplaceBusinessHoursItems(draft: WeeklyHoursDraft): BusinessHourDto[] {
  return draft.rows
    .filter((row) => isSavedRow(row, draft.holidayMode) && !isUnsetRow(row))
    .map((row) => {
      const trading = isTradingRow(row, draft.holidayMode);
      const staffed = trading && Boolean(row.staffStartTime) && Boolean(row.staffEndTime);
      return {
        dayOfWeek: row.dayOfWeek,
        isClosed: !trading,
        openTime: trading ? row.openTime || null : null,
        closeTime: trading ? row.closeTime || null : null,
        staffStartTime: staffed ? row.staffStartTime : null,
        staffEndTime: staffed ? row.staffEndTime : null,
      };
    });
}

// --- Exception days ---------------------------------------------------------------------------

/**
 * The kind already registered on `date`, other than the row being edited, or `null`.
 *
 * 特別営業日 and 臨時休業 are one resource, and Y-02 v6 「個別日設定の重複制約」 allows a single
 * exception per date across both kinds (FR-029b).
 */
export function conflictingExceptionKind(
  date: string,
  exceptions: BusinessException[],
  editingId: string | null,
): ExceptionKind | null {
  return (
    exceptions.find((entry) => entry.date === date && entry.id !== editingId)?.exceptionType ?? null
  );
}

export const exceptionConflictMessage = (kindLabel: string) =>
  `この日はすでに${kindLabel}が登録されています。既存の設定を編集または削除してください`;

/** `reason` stays within the shared free-text limit */
export const reasonError = (reason: string) =>
  reason.trim().length > TEXTAREA_MAX_LENGTH ? maxLengthMessage('理由', TEXTAREA_MAX_LENGTH) : null;

export const sortByDate = (entries: BusinessException[]) =>
  [...entries].sort((a, b) => a.date.localeCompare(b.date));

// --- Dates ------------------------------------------------------------------------------------

/** `YYYY-MM-DD` → `YYYY/MM/DD`. A pure string reformat rather than `formatDateYYYYMMDD`, which
 * would parse the date-only text as UTC midnight and could shift the day. To format a `Date`,
 * use `formatISODateLocal` from `@/utils/date.util`.
 */
export const toDisplayDate = (dateText: string) => dateText.replaceAll('-', '/');

/** `YYYY-MM-DD` → a local-midnight `Date` (again avoiding the UTC parse of date-only text) */
export const fromDateText = (dateText: string) => {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const buildMonthDays = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: Array<Date | null> = [];

  for (let i = 0; i < startWeekday; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDate; day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
};

export const getDayKey = (date: Date): BusinessHourDay => {
  const map: Record<number, BusinessHourDay> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  };
  return map[date.getDay()];
};
