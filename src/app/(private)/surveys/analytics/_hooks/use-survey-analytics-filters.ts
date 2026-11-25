import { REAL_MEMBER_TYPE_LABELS } from '@/app/(private)/members/_constants/constants';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { jstToday } from '@/utils/date.util';
import { addDays, endOfMonth, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import type { AdminQuestionnaireControllerAggregateData } from '@/lib/api-real/types.gen';

import {
  SURVEY_BRAND_GROUP_BY_URL_VALUE,
  SURVEY_BRAND_GROUP_URL_VALUES,
  type SurveyBrandGroupUrlValue,
} from '../../_constants/survey-brand-group';
import {
  SURVEY_ANALYTICS_GENDER_LABELS,
  SURVEY_ANALYTICS_TENURE_LABELS,
  type SurveyAnalyticsGender,
  type SurveyAnalyticsTenure,
  getSurveyAnalyticsEnrolledRange,
} from '../_utils/survey-analytics-tenure.util';

export const SURVEY_ANALYTICS_PERIOD_LABELS = {
  all: '全期間',
  current_month: '今月',
  last_month: '先月',
  last_3_months: '過去3ヶ月',
  last_6_months: '過去6ヶ月',
  last_1_year: '過去1年',
} as const;

export type SurveyAnalyticsPeriod = keyof typeof SURVEY_ANALYTICS_PERIOD_LABELS;

export type SurveyAnalyticsMemberType = keyof typeof REAL_MEMBER_TYPE_LABELS;

type AggregateQuery = NonNullable<AdminQuestionnaireControllerAggregateData['query']>;

export type SurveyAnalyticsFiltersState = {
  survey_id: string;
  period: SurveyAnalyticsPeriod;
  brand: SurveyBrandGroupUrlValue | null;
  store_id: string;
  member_type: SurveyAnalyticsMemberType | null;
  tenure: SurveyAnalyticsTenure;
  gender: SurveyAnalyticsGender | null;
};

/** Local-midnight instant of a day; the API rejects bare dates. */
function startOfLocalDay(date: Date) {
  return startOfDay(date).toISOString();
}

/** `from` inclusive / `to` exclusive (the API's bounds), as ISO instants. */
export function getSurveyAnalyticsPeriodRange(
  period: SurveyAnalyticsPeriod,
): Pick<AggregateQuery, 'from' | 'to'> | undefined {
  const today = new Date();
  const tomorrow = startOfLocalDay(addDays(today, 1));

  switch (period) {
    case 'current_month':
      return { from: startOfLocalDay(startOfMonth(today)), to: tomorrow };
    case 'last_month': {
      const lastMonth = subMonths(today, 1);
      return {
        from: startOfLocalDay(startOfMonth(lastMonth)),
        to: startOfLocalDay(addDays(endOfMonth(lastMonth), 1)),
      };
    }
    case 'last_3_months':
      return { from: startOfLocalDay(startOfMonth(subMonths(today, 2))), to: tomorrow };
    case 'last_6_months':
      return { from: startOfLocalDay(startOfMonth(subMonths(today, 5))), to: tomorrow };
    case 'last_1_year':
      return { from: startOfLocalDay(startOfMonth(subMonths(today, 11))), to: tomorrow };
    case 'all':
    default:
      return undefined;
  }
}

export function useSurveyAnalyticsFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      survey_id: parseAsString.withDefault(''),
      period: parseAsString.withDefault('all'),
      brand: parseAsStringEnum<SurveyBrandGroupUrlValue>([...SURVEY_BRAND_GROUP_URL_VALUES]),
      store_id: parseAsString.withDefault(''),
      member_type: parseAsStringEnum<SurveyAnalyticsMemberType>(
        Object.keys(REAL_MEMBER_TYPE_LABELS) as SurveyAnalyticsMemberType[],
      ),
      tenure: parseAsStringEnum<SurveyAnalyticsTenure>(
        Object.keys(SURVEY_ANALYTICS_TENURE_LABELS) as SurveyAnalyticsTenure[],
      ).withDefault('all'),
      gender: parseAsStringEnum<SurveyAnalyticsGender>(
        Object.keys(SURVEY_ANALYTICS_GENDER_LABELS) as SurveyAnalyticsGender[],
      ),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const updateFilter = <K extends keyof SurveyAnalyticsFiltersState>(
    key: K,
    value: SurveyAnalyticsFiltersState[K],
  ) => {
    setFilters({ [key]: value ?? null } as Parameters<typeof setFilters>[0]);
  };

  const clearFilters = () => {
    setFilters({
      survey_id: null,
      period: 'all',
      brand: null,
      store_id: null,
      member_type: null,
      tenure: 'all',
      gender: null,
    });
  };

  const hasActiveFilters =
    filters.survey_id.length > 0 ||
    filters.period !== 'all' ||
    filters.brand !== null ||
    filters.store_id.length > 0 ||
    filters.member_type !== null ||
    filters.tenure !== 'all' ||
    filters.gender !== null;

  // Same rule as the entry-exit screens: a specific header store is the effective store (and the
  // in-page 店舗 filter is locked to it); only the header's 全店舗 lets the in-page filter apply.
  const { currentStoreId } = useCurrentStore();
  const lockedStoreId = currentStoreId && currentStoreId !== ALL_STORES ? currentStoreId : '';
  const effectiveStoreId = lockedStoreId || filters.store_id;

  const periodRange = getSurveyAnalyticsPeriodRange(filters.period as SurveyAnalyticsPeriod);

  const enrolledRange = getSurveyAnalyticsEnrolledRange(filters.tenure, jstToday());

  // The aggregate pins one questionnaire by path; `survey_id` picks which one (see the page).
  const queryParams: AggregateQuery = {
    from: periodRange?.from,
    to: periodRange?.to,
    brandGroup: filters.brand ? SURVEY_BRAND_GROUP_BY_URL_VALUE[filters.brand] : undefined,
    storeId: effectiveStoreId || undefined,
    memberType: filters.member_type ?? undefined,
    gender: filters.gender ?? undefined,
    enrolledFrom: enrolledRange.enrolledFrom,
    enrolledTo: enrolledRange.enrolledTo,
  };

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    lockedStoreId,
    queryParams,
  };
}
