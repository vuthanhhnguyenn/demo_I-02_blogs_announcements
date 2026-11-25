import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';

/**
 * The 入会期間 / 最終来館日 filters are relative presets on screen but absolute date
 * bounds on the wire: the API takes `enrolledFrom`/`enrolledTo` and
 * `lastEntryFrom`/`lastEntryTo` only, and expands nothing on its own
 * (backend design answer 2026-08-10, QA01 §2.3). These helpers do that expansion.
 */

const toApiDate = (date: Date): string => format(date, 'yyyy-MM-dd');

export type EnrolledRange = { enrolledFrom?: string; enrolledTo?: string };

/** 入会期間: 今月 / 先月 / 今年 / 昨年 → an inclusive [from, to] join-date window. */
export function joinPeriodToRange(preset: string | null, today: Date = new Date()): EnrolledRange {
  switch (preset) {
    case 'this_month':
      return {
        enrolledFrom: toApiDate(startOfMonth(today)),
        enrolledTo: toApiDate(endOfMonth(today)),
      };
    case 'last_month': {
      const lastMonth = subMonths(today, 1);
      return {
        enrolledFrom: toApiDate(startOfMonth(lastMonth)),
        enrolledTo: toApiDate(endOfMonth(lastMonth)),
      };
    }
    case 'this_year':
      return {
        enrolledFrom: toApiDate(startOfYear(today)),
        enrolledTo: toApiDate(endOfYear(today)),
      };
    case 'last_year': {
      const lastYear = subYears(today, 1);
      return {
        enrolledFrom: toApiDate(startOfYear(lastYear)),
        enrolledTo: toApiDate(endOfYear(lastYear)),
      };
    }
    default:
      return {};
  }
}

export type LastEntryRange = {
  lastEntryFrom?: string;
  lastEntryTo?: string;
  includeNeverEntered?: boolean;
};

/**
 * 最終来館日 presets → last-entry bounds.
 *
 * The 「直近…」 buckets are a lower bound (visited since the cutoff); the
 * 「…来館なし」 buckets are an upper bound (last visit on or before the cutoff) and
 * must also send `includeNeverEntered`, since a member who has never entered has
 * `lastEntryAt === null` and would otherwise drop out of a bounded result even
 * though they carry the highest churn risk (A-01 FR-001).
 *
 * Day counts follow the prototype's own thresholds (21 / 30 days) — neither SPEC
 * FR-001 nor the API contract fixes a cutoff for the labels.
 */
export function lastVisitToRange(preset: string | null, today: Date = new Date()): LastEntryRange {
  switch (preset) {
    case 'within_1w':
      return { lastEntryFrom: toApiDate(subDays(today, 7)) };
    case 'within_2w':
      return { lastEntryFrom: toApiDate(subDays(today, 14)) };
    case 'over_3w':
      return { lastEntryTo: toApiDate(subDays(today, 21)), includeNeverEntered: true };
    case 'over_1m':
      return { lastEntryTo: toApiDate(subDays(today, 30)), includeNeverEntered: true };
    default:
      return {};
  }
}
