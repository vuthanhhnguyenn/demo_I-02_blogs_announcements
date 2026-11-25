import { API_PAGE_SIZE_OPTIONS } from '@/constants/app.constants';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminQuestionnaireControllerListData } from '@/lib/api-real/types.gen';

import {
  SURVEY_DEFAULT_PAGE_SIZE,
  SURVEY_FILTER_CATEGORIES,
  SURVEY_SORT_FIELDS,
  SURVEY_SORT_PARAMS,
  type SurveyFilterCategory,
  type SurveyRealStatus,
  type SurveySortField,
} from '../_constants/constants';
import {
  SURVEY_BRAND_GROUP_BY_URL_VALUE,
  SURVEY_BRAND_GROUP_URL_VALUES,
  type SurveyBrandGroupUrlValue,
} from '../_constants/survey-brand-group';

const SURVEY_STATUSES: SurveyRealStatus[] = ['active', 'inactive'];

export type SurveysFiltersState = {
  page: number;
  limit: number;
  search: string;
  type: SurveyFilterCategory | null;
  brand: SurveyBrandGroupUrlValue | null;
  status: SurveyRealStatus | null;
  /** `null` = no sort picked: the list sends no `sort` / `order` (API default: newest first). */
  sort_by: SurveySortField | null;
  sort_order: 'asc' | 'desc';
};

export function useSurveysFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(SURVEY_DEFAULT_PAGE_SIZE),
      search: parseAsString.withDefault(''),
      type: parseAsStringEnum<SurveyFilterCategory>([...SURVEY_FILTER_CATEGORIES]),
      // Brand GROUP; an unknown value (e.g. a bookmarked ?brand=joyfit24) parses to null and is ignored.
      brand: parseAsStringEnum<SurveyBrandGroupUrlValue>([...SURVEY_BRAND_GROUP_URL_VALUES]),
      status: parseAsStringEnum<SurveyRealStatus>(SURVEY_STATUSES),
      sort_by: parseAsStringEnum<SurveySortField>(SURVEY_SORT_FIELDS),
      sort_order: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']).withDefault('asc'),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.search, (value) =>
    setFilters({ search: value || null, page: 1 }),
  );

  const updateFilter = <K extends keyof SurveysFiltersState>(
    key: K,
    value: SurveysFiltersState[K],
  ) => {
    setFilters({ [key]: value ?? null, page: 1 } as Parameters<typeof setFilters>[0]);
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      search: null,
      type: null,
      brand: null,
      status: null,
    });
  };

  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.type !== null ||
    filters.brand !== null ||
    filters.status !== null;

  // A bookmarked ?limit=500 or ?page=0 would be a 400 from the API: fall back to the defaults.
  const limit = (API_PAGE_SIZE_OPTIONS as readonly number[]).includes(filters.limit)
    ? filters.limit
    : SURVEY_DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page);

  const queryParams: NonNullable<AdminQuestionnaireControllerListData['query']> = {
    page,
    limit,
    nameQuery: filters.search || undefined,
    category: filters.type ?? undefined,
    brandGroup: filters.brand ? SURVEY_BRAND_GROUP_BY_URL_VALUE[filters.brand] : undefined,
    status: filters.status ?? undefined,
    sort: filters.sort_by ? SURVEY_SORT_PARAMS[filters.sort_by] : undefined,
    order: filters.sort_by ? filters.sort_order : undefined,
    // Baseline for the banner's 「全 N 件中」: the unfiltered survey count (pagination.totalAllItems).
    includeTotalAll: true,
  };

  return {
    searchInput,
    setSearchInput,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    queryParams,
    currentPage: page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    pageSize: limit,
    setPageSize: (nextLimit: number) => setFilters({ limit: nextLimit, page: 1 }),
  };
}
