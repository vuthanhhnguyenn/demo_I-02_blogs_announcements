import { formatISODateLocal } from '@/utils/date.util';
import { addDays, subMonths } from 'date-fns';

/** 入会後経過期間 (FR-S006) — URL value → label, in the prototype's order. */
export const SURVEY_ANALYTICS_TENURE_LABELS = {
  all: '入会後全期間',
  within_3_months: '入会後〜3ヶ月',
  from_3_to_6_months: '入会後3〜6ヶ月',
  from_6_months_to_1_year: '入会後6ヶ月〜1年',
  over_1_year: '入会後1年以上',
} as const;

export type SurveyAnalyticsTenure = keyof typeof SURVEY_ANALYTICS_TENURE_LABELS;

/** 性別 (FR-S006) — URL value = the API's `members.gender`; other / prefer_not_to_say are not offered. */
export const SURVEY_ANALYTICS_GENDER_LABELS = {
  male: '男性',
  female: '女性',
} as const;

export type SurveyAnalyticsGender = keyof typeof SURVEY_ANALYTICS_GENDER_LABELS;

export interface SurveyAnalyticsEnrolledRange {
  enrolledFrom?: string;
  enrolledTo?: string;
}

/**
 * 入会後経過期間 → the API's 入会日 range (YYYY-MM-DD, `enrolledTo` inclusive), measured back from
 * `today` (the JST calendar day, a local-midnight `Date` — see `jstToday`) in calendar months.
 *
 * Bucket convention (not yet confirmed by the PO): the buckets are contiguous and do not overlap —
 * a bucket's `enrolledTo` is the day before the next newer bucket's `enrolledFrom`, so a member
 * who enrolled exactly 3 months ago counts as 3〜6ヶ月, not 〜3ヶ月.
 */
export function getSurveyAnalyticsEnrolledRange(
  tenure: SurveyAnalyticsTenure,
  today: Date,
): SurveyAnalyticsEnrolledRange {
  const ago = (months: number) => subMonths(today, months);
  const iso = (date: Date) => formatISODateLocal(date);
  const dayBefore = (date: Date) => iso(addDays(date, -1));

  switch (tenure) {
    case 'within_3_months':
      return { enrolledFrom: iso(ago(3)) };
    case 'from_3_to_6_months':
      return { enrolledFrom: iso(ago(6)), enrolledTo: dayBefore(ago(3)) };
    case 'from_6_months_to_1_year':
      return { enrolledFrom: iso(ago(12)), enrolledTo: dayBefore(ago(6)) };
    case 'over_1_year':
      return { enrolledTo: dayBefore(ago(12)) };
    case 'all':
    default:
      return {};
  }
}
