import { PAGE_SIZE } from '@/constants/app.constants';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminOptionSetControllerListData } from '@/lib/api-real/types.gen';

import {
  OPTION_DISCOUNT_STATUS_LABELS,
  OPTION_DISCOUNT_TYPE_LABELS,
  type OptionSetDiscountType,
  type OptionSetStatus,
} from '../_constants/constants';

type OptionSetsQuery = NonNullable<AdminOptionSetControllerListData['query']>;
type OptionSetsSortBy = NonNullable<OptionSetsQuery['sort']>;

/**
 * The API's `sort` enum — qa-196 settled that only セット割名 and 割引額 are sortable. Parsing the
 * query string against it drops a stale bookmark (`id` / `discount_type` / `status`) instead of
 * 400-ing the list.
 */
const OPTION_SET_SORT_KEYS: OptionSetsSortBy[] = ['name', 'discountValue'];

export type OptionDiscountFiltersState = {
  page: number;
  search: string;
  discount_type: OptionSetDiscountType | null;
  status: OptionSetStatus | null;
  /** `null` = the API's default order (name ASC). */
  sort_by: OptionSetsSortBy | null;
  sort_order: 'asc' | 'desc';
};

export function useOptionDiscountFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      search: parseAsString.withDefault(''),
      discount_type: parseAsStringEnum(
        Object.keys(OPTION_DISCOUNT_TYPE_LABELS) as OptionSetDiscountType[],
      ),
      status: parseAsStringEnum(Object.keys(OPTION_DISCOUNT_STATUS_LABELS) as OptionSetStatus[]),
      sort_by: parseAsStringEnum<OptionSetsSortBy>(OPTION_SET_SORT_KEYS),
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

  const updateFilter = <K extends keyof OptionDiscountFiltersState>(
    key: K,
    value: OptionDiscountFiltersState[K],
  ) => {
    setFilters({ [key]: value ?? null, page: 1 } as Parameters<typeof setFilters>[0]);
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      search: null,
      discount_type: null,
      status: null,
      sort_by: null,
      sort_order: 'asc',
    });
  };

  const hasActiveFilters =
    filters.discount_type !== null || filters.status !== null || filters.search.length > 0;

  const queryParams: OptionSetsQuery = {
    page: filters.page,
    limit: PAGE_SIZE,
    keyword: filters.search || undefined,
    discountType: filters.discount_type ?? undefined,
    isActive: filters.status ? filters.status === 'active' : undefined,
    // `order` is ignored without `sort`, so it only rides along with one.
    ...(filters.sort_by ? { sort: filters.sort_by, order: filters.sort_order } : {}),
  };

  return {
    searchInput,
    setSearchInput,
    filters,
    updateFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
    queryParams,
    currentPage: filters.page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    pageSize: PAGE_SIZE,
  };
}
