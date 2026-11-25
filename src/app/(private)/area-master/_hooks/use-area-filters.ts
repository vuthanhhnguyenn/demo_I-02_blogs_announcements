import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminAreaControllerListData } from '@/lib/api-real/types.gen';

import {
  AREA_BRAND_GROUPS,
  AREA_DEFAULT_PAGE_SIZE,
  AREA_PAGE_SIZE_OPTIONS,
  type AreaBrandGroup,
} from '../_constants/area.constants';

type AreaListQuery = NonNullable<AdminAreaControllerListData['query']>;

/**
 * URL filter state of the area list: keyword (エリア名・備考), brand group and paging, all applied
 * server-side. The brand filter is independent of the header store, like the other brand lists.
 */
export function useAreaFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      query: parseAsString.withDefault(''),
      brand: parseAsStringEnum<AreaBrandGroup>([...AREA_BRAND_GROUPS]),
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(AREA_DEFAULT_PAGE_SIZE),
    },
    { history: 'push', shallow: false },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.query, (value) =>
    setFilters({ query: value || null, page: 1 }),
  );

  const pageSize = (AREA_PAGE_SIZE_OPTIONS as readonly number[]).includes(filters.limit)
    ? filters.limit
    : AREA_DEFAULT_PAGE_SIZE;

  const queryParams: AreaListQuery = {
    keyword: filters.query || undefined,
    brandGroup: filters.brand ?? undefined,
    page: filters.page,
    limit: pageSize,
    includeTotalAll: true,
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ query: null, brand: null, page: 1 });
  };

  return {
    searchInput,
    setSearchInput,
    brand: filters.brand,
    setBrand: (brand: AreaBrandGroup | null) => setFilters({ brand, page: 1 }),
    currentPage: filters.page,
    setCurrentPage: (page: number) => setFilters({ page }),
    pageSize,
    setPageSize: (limit: number) => setFilters({ limit, page: 1 }),
    hasActiveConditions: filters.query !== '' || filters.brand !== null,
    keyword: filters.query,
    queryParams,
    clearFilters,
  };
}
