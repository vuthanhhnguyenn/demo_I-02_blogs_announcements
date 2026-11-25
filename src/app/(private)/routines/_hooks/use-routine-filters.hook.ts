import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import { adminRoutineMasterControllerListCategoriesOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { AdminRoutineMasterControllerListData } from '@/lib/api-real/types.gen';

import {
  ROUTINE_DEFAULT_PAGE_SIZE,
  ROUTINE_PAGE_SIZE_OPTIONS,
} from '../_constants/routine.constants';

type RoutineQuery = NonNullable<AdminRoutineMasterControllerListData['query']>;

const PUBLISH_STATUS_VALUES = ['published', 'unpublished'] satisfies Array<
  NonNullable<RoutineQuery['publishStatus']>
>;

// API `keyword` max length; a longer one answers 400 E-VAL-001 (and the list would show its
// fetch-error state), so a longer term from the URL is cut to it.
export const ROUTINE_KEYWORD_MAX_LENGTH = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SORT_BY_VALUES = ['name', 'exerciseCount', 'publishStatus', 'updatedAt'] satisfies Array<
  NonNullable<RoutineQuery['sort']>
>;

export function useRoutineFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      rt_keyword: parseAsString.withDefault(''),
      rt_category: parseAsString,
      rt_status: parseAsStringEnum(PUBLISH_STATUS_VALUES),
      rt_sort_by: parseAsStringEnum(SORT_BY_VALUES),
      rt_sort_order: parseAsStringEnum(['asc', 'desc']),
      rt_page: parseAsInteger.withDefault(1),
      rt_page_size: parseAsInteger.withDefault(ROUTINE_DEFAULT_PAGE_SIZE),
    },
    { history: 'push', shallow: false },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.rt_keyword, (value) =>
    setFilters({ rt_keyword: value || null, rt_page: 1 }),
  );

  // An unknown `rt_category` falls back to 'all' instead of reaching the API (400 E-VAL-001):
  // it must be UUID-shaped, and once the categories are loaded it must be one of them.
  const { data: categoriesData } = useQuery({
    ...adminRoutineMasterControllerListCategoriesOptions(),
  });
  const categoryId =
    filters.rt_category &&
    UUID_PATTERN.test(filters.rt_category) &&
    (!categoriesData ||
      categoriesData.items.some((category) => category.id === filters.rt_category))
      ? filters.rt_category
      : null;

  const normalizedPageSize = ROUTINE_PAGE_SIZE_OPTIONS.includes(
    filters.rt_page_size as (typeof ROUTINE_PAGE_SIZE_OPTIONS)[number],
  )
    ? filters.rt_page_size
    : ROUTINE_DEFAULT_PAGE_SIZE;

  const queryParams: RoutineQuery = {
    keyword: filters.rt_keyword.slice(0, ROUTINE_KEYWORD_MAX_LENGTH) || undefined,
    categoryId: categoryId ?? undefined,
    publishStatus: filters.rt_status || undefined,
    sort: filters.rt_sort_by || undefined,
    order:
      filters.rt_sort_order === 'asc' || filters.rt_sort_order === 'desc'
        ? filters.rt_sort_order
        : undefined,
    page: filters.rt_page,
    limit: normalizedPageSize,
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      rt_keyword: null,
      rt_category: null,
      rt_status: null,
      rt_sort_by: null,
      rt_sort_order: null,
      rt_page: 1,
      rt_page_size: ROUTINE_DEFAULT_PAGE_SIZE,
    });
  };

  // FR-003: the keyword counts as an active condition too.
  const activeFilterCount = [
    filters.rt_keyword.length > 0,
    categoryId != null,
    filters.rt_status != null,
  ].filter(Boolean).length;

  return {
    filters: { ...filters, rt_category: categoryId },
    queryParams,
    searchInput,
    setSearchInput,
    setFilters,
    clearFilters,
    currentPage: filters.rt_page,
    setCurrentPage: (page: number) => setFilters({ rt_page: page }),
    setPageSize: (pageSize: number) => setFilters({ rt_page_size: pageSize, rt_page: 1 }),
    pageSize: normalizedPageSize,
    hasActiveFilters: activeFilterCount > 0,
    activeFilterCount,
  };
}
