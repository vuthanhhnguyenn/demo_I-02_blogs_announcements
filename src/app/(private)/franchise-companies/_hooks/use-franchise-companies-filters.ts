import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminFcCompanyControllerListData } from '@/lib/api-real/types.gen';

import {
  FRANCHISE_COMPANY_DEFAULT_PAGE_SIZE,
  FRANCHISE_COMPANY_DEFAULT_SORT,
  FRANCHISE_COMPANY_MAX_PAGE_SIZE,
  FRANCHISE_COMPANY_MIN_PAGE,
  FRANCHISE_COMPANY_SEARCH_MAX_LENGTH,
  FRANCHISE_COMPANY_SORT_BY_VALUES,
  FRANCHISE_COMPANY_SORT_KEY,
  FRANCHISE_COMPANY_STATUS_FILTER_VALUES,
  type FcCompanySortBy,
  type FcCompanyStatusFilter,
  type FcSelectableManagementType,
  MANAGEMENT_TYPE_SELECTABLE_VALUES,
} from '../_constants/constants';

export type FranchiseCompaniesFiltersState = {
  page: number;
  limit: number;
  search: string;
  managementType: FcSelectableManagementType | null;
  status: FcCompanyStatusFilter | null;
  sortBy: FcCompanySortBy;
  sortOrder: 'asc' | 'desc';
};

type ListQuery = NonNullable<AdminFcCompanyControllerListData['query']>;

export function useFranchiseCompaniesFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(FRANCHISE_COMPANY_DEFAULT_PAGE_SIZE),
      search: parseAsString.withDefault(''),
      managementType: parseAsStringEnum<FcSelectableManagementType>([
        ...MANAGEMENT_TYPE_SELECTABLE_VALUES,
      ]),
      status: parseAsStringEnum<FcCompanyStatusFilter>([...FRANCHISE_COMPANY_STATUS_FILTER_VALUES]),
      sortBy: parseAsStringEnum<FcCompanySortBy>([...FRANCHISE_COMPANY_SORT_BY_VALUES]).withDefault(
        FRANCHISE_COMPANY_DEFAULT_SORT.sortBy,
      ),
      sortOrder: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']).withDefault(
        FRANCHISE_COMPANY_DEFAULT_SORT.sortOrder,
      ),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(
    filters.search,
    (value) => setFilters({ search: value || null, page: 1 }),
    // API `keyword` maxLength 100 — keep the URL inside the contract too
    { normalize: (value) => value.slice(0, FRANCHISE_COMPANY_SEARCH_MAX_LENGTH) },
  );

  const updateFilter = <K extends keyof FranchiseCompaniesFiltersState>(
    key: K,
    value: FranchiseCompaniesFiltersState[K],
  ) => {
    setFilters({ [key]: value ?? null, page: 1 } as Parameters<typeof setFilters>[0]);
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      limit: FRANCHISE_COMPANY_DEFAULT_PAGE_SIZE,
      search: null,
      managementType: null,
      status: null,
      sortBy: null,
      sortOrder: null,
    });
  };

  // A hand-edited URL is clamped to what the list endpoint accepts instead of a 400:
  // `keyword` maxLength 100, `page` minimum 1
  const search = filters.search.slice(0, FRANCHISE_COMPANY_SEARCH_MAX_LENGTH);
  const page = Math.max(FRANCHISE_COMPANY_MIN_PAGE, Math.trunc(filters.page));

  const hasActiveFilters =
    search.length > 0 || filters.managementType !== null || filters.status !== null;

  // D5: a stale `?limit=200` URL is clamped to the API max
  const limit = Math.min(Math.max(filters.limit, 1), FRANCHISE_COMPANY_MAX_PAGE_SIZE);

  const queryParams: ListQuery = {
    page,
    limit,
    keyword: search || undefined,
    managementType: filters.managementType ?? undefined,
    isActive: filters.status === null ? undefined : filters.status === 'active',
    sort: FRANCHISE_COMPANY_SORT_KEY[filters.sortBy],
    order: filters.sortOrder,
  };

  return {
    searchInput,
    setSearchInput,
    filters: { ...filters, search, page },
    updateFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
    queryParams,
    currentPage: page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    /** Out-of-range page → last valid page; replaces the history entry so Back is not trapped */
    clampCurrentPage: (lastPage: number) => setFilters({ page: lastPage }, { history: 'replace' }),
    pageSize: limit,
    setPageSize: (nextLimit: number) => setFilters({ limit: nextLimit, page: 1 }),
  };
}
