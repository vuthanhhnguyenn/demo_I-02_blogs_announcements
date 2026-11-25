import { useEffect, useRef } from 'react';

import { REAL_MEMBER_TYPE_LABELS } from '@/app/(private)/members/_constants/constants';
import { API_PAGE_SIZE_OPTIONS, PAGE_SIZE } from '@/constants/app.constants';
import { useAuthUser } from '@/contexts/auth-user.context';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminQuestionnaireResponseControllerListCrossResponsesData } from '@/lib/api-real/types.gen';

import { UserRole } from '@/types/permission.type';

import { SURVEY_FILTER_CATEGORIES, type SurveyFilterCategory } from '../../_constants/constants';
import {
  SURVEY_BRAND_GROUP_BY_URL_VALUE,
  SURVEY_BRAND_GROUP_URL_VALUES,
  type SurveyBrandGroupUrlValue,
} from '../../_constants/survey-brand-group';

export type SurveyResponsesFiltersState = {
  page: number;
  limit: number;
  search: string;
  survey_id: string;
  period_from: string;
  period_to: string;
  brand: SurveyBrandGroupUrlValue | null;
  store_id: string;
  template_type: SurveyFilterCategory | null;
  member_type: SurveyResponseMemberType | null;
};

export type SurveyResponseMemberType = keyof typeof REAL_MEMBER_TYPE_LABELS;

type ResponsesQuery = NonNullable<
  AdminQuestionnaireResponseControllerListCrossResponsesData['query']
>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `nameQuery` is capped at 100 characters by the API. */
export const SURVEY_RESPONSES_SEARCH_MAX_LENGTH = 100;

/** `yyyy/MM/dd` (picker) → local-midnight ISO instant; the API rejects bare dates. */
function toInstant(value: string, addDays = 0): string | undefined {
  const [y, m, d] = value.split('/').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(new Date(y, m - 1, d).getTime() + addDays * DAY_MS).toISOString();
}

export function useSurveyResponsesFilters() {
  const [urlFilters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(PAGE_SIZE),
      search: parseAsString.withDefault(''),
      survey_id: parseAsString.withDefault(''),
      period_from: parseAsString.withDefault(''),
      period_to: parseAsString.withDefault(''),
      brand: parseAsStringEnum<SurveyBrandGroupUrlValue>([...SURVEY_BRAND_GROUP_URL_VALUES]),
      store_id: parseAsString.withDefault(''),
      template_type: parseAsStringEnum<SurveyFilterCategory>([...SURVEY_FILTER_CATEGORIES]),
      member_type: parseAsStringEnum<SurveyResponseMemberType>(
        Object.keys(REAL_MEMBER_TYPE_LABELS) as SurveyResponseMemberType[],
      ),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  // A Trainer cannot filter by member attributes: the backend refuses `brandGroup` / `memberType` for
  // that role (403 E-AUTH-100 — auth-svc resolves them and denies a trainer), so the two filters are
  // hidden and any value carried in the URL is ignored rather than sent.
  const { hasRole } = useAuthUser();
  const canFilterByMemberAttributes = !hasRole([UserRole.Trainer]);
  const filters = canFilterByMemberAttributes
    ? urlFilters
    : { ...urlFilters, brand: null, member_type: null };

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.search, (value) =>
    // A whitespace-only term is no search: it must not reach the API (or show the banner).
    setFilters({ search: value.trim() || null, page: 1 }),
  );

  const updateFilter = <K extends keyof SurveyResponsesFiltersState>(
    key: K,
    value: SurveyResponsesFiltersState[K],
  ) => {
    setFilters({ [key]: value ?? null, page: 1 } as Parameters<typeof setFilters>[0]);
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      limit: PAGE_SIZE,
      search: null,
      period_from: null,
      period_to: null,
      brand: null,
      store_id: null,
      template_type: null,
      member_type: null,
    });
  };

  const searchTerm = filters.search.trim();

  // Same rule as the entry-exit screens: a specific header store is the effective store (and the
  // in-page 店舗 filter is locked to it); only the header's 全店舗 lets the in-page filter apply.
  const { currentStoreId } = useCurrentStore();
  const lockedStoreId = currentStoreId && currentStoreId !== ALL_STORES ? currentStoreId : '';
  const effectiveStoreId = lockedStoreId || filters.store_id;

  // Switching the header store re-scopes the list, so it starts again from page 1.
  const previousScopeRef = useRef(lockedStoreId);
  useEffect(() => {
    if (previousScopeRef.current === lockedStoreId) return;
    previousScopeRef.current = lockedStoreId;
    if (filters.page !== 1) void setFilters({ page: 1 });
  }, [lockedStoreId, filters.page, setFilters]);

  const hasActiveFilters =
    searchTerm.length > 0 ||
    filters.survey_id.length > 0 ||
    filters.period_from.length > 0 ||
    filters.period_to.length > 0 ||
    filters.brand !== null ||
    filters.store_id.length > 0 ||
    filters.template_type !== null ||
    filters.member_type !== null;

  // `to` is an exclusive bound while the picker's end date is inclusive, hence +1 day.
  const filterQuery: Omit<ResponsesQuery, 'page' | 'limit'> = {
    nameQuery: searchTerm || undefined,
    questionnaireId: filters.survey_id || undefined,
    from: filters.period_from ? toInstant(filters.period_from) : undefined,
    to: filters.period_to ? toInstant(filters.period_to, 1) : undefined,
    brandGroup: filters.brand ? SURVEY_BRAND_GROUP_BY_URL_VALUE[filters.brand] : undefined,
    storeId: effectiveStoreId || undefined,
    category: filters.template_type ?? undefined,
    memberType: filters.member_type ?? undefined,
  };
  // `includeTotalAll` feeds the banner's 「全 N 件中」 and belongs to the page query only: the CSV export
  // reuses `filterQuery` and the server rejects the flag there. The baseline is the whole table within the
  // caller's role scope (every optional filter reset, `survey_id` included — CONV-001 §3.4.1).
  // A bookmarked ?limit=500 or ?page=0 would be a 400 from the API: fall back to the defaults.
  const limit = (API_PAGE_SIZE_OPTIONS as readonly number[]).includes(filters.limit)
    ? filters.limit
    : PAGE_SIZE;
  const page = Math.max(1, filters.page);

  const queryParams: ResponsesQuery = {
    page,
    limit,
    includeTotalAll: true,
    ...filterQuery,
  };

  return {
    searchInput,
    setSearchInput,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    lockedStoreId,
    searchTerm,
    canFilterByMemberAttributes,
    queryParams,
    filterQuery,
    currentPage: page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    pageSize: limit,
    setPageSize: (nextLimit: number) => setFilters({ limit: nextLimit, page: 1 }),
  };
}
