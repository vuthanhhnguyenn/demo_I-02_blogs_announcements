import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminLockerControllerListLockersData } from '@/lib/api-real/types.gen';

import { LOCKER_LIST_DEFAULT_PAGE_SIZE } from '../_constants/constants';
import {
  LOCKER_SHAPE_TYPE_OPTIONS,
  type LockerShapeType,
} from '../_constants/locker-enum-labels.constants';

type LockerListQuery = NonNullable<AdminLockerControllerListLockersData['query']>;
export type LockerListSortKey = NonNullable<LockerListQuery['sort']>;

/** Sort keys `GET /admin/lockers` accepts that this table exposes (column id = sort key) */
export const LOCKER_LIST_SORT_KEYS: LockerListSortKey[] = [
  'locationCode',
  'shapeType',
  'optionName',
  'availableSlotCount',
];

const DEFAULT_SORT: LockerListSortKey = 'locationCode';

/**
 * URL state of the cabinet list. `storeId` is not URL state: it comes from the header store;
 * `undefined` (HQ / system on 全店舗) lists every store. Scoped roles always have a store.
 */
export function useLockersFilters(storeId: string | undefined) {
  const [filters, setFilters] = useQueryStates(
    {
      lockers_page: parseAsInteger.withDefault(1),
      lockers_limit: parseAsInteger.withDefault(LOCKER_LIST_DEFAULT_PAGE_SIZE),
      lockers_search: parseAsString.withDefault(''),
      lockers_shape: parseAsStringEnum<LockerShapeType>(
        LOCKER_SHAPE_TYPE_OPTIONS.map((o) => o.value),
      ),
      lockers_sort_by:
        parseAsStringEnum<LockerListSortKey>(LOCKER_LIST_SORT_KEYS).withDefault(DEFAULT_SORT),
      lockers_sort_order: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']).withDefault('asc'),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(
    filters.lockers_search,
    (value) => setFilters({ lockers_search: value || null, lockers_page: 1 }),
    { normalize: (value) => value.trim() },
  );

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      lockers_page: 1,
      lockers_limit: LOCKER_LIST_DEFAULT_PAGE_SIZE,
      lockers_search: null,
      lockers_shape: null,
      lockers_sort_by: DEFAULT_SORT,
      lockers_sort_order: 'asc',
    });
  };

  const queryParams: LockerListQuery = {
    storeId,
    page: filters.lockers_page,
    limit: filters.lockers_limit,
    q: filters.lockers_search || undefined,
    shapeType: filters.lockers_shape ?? undefined,
    sort: filters.lockers_sort_by,
    order: filters.lockers_sort_order,
    includeTotalAll: true,
  };

  return {
    filters,
    queryParams,
    searchInput,
    setSearchInput,
    setFilters,
    clearFilters,
    currentPage: filters.lockers_page,
    setCurrentPage: (page: number) => setFilters({ lockers_page: page }),
    pageSize: filters.lockers_limit,
    setPageSize: (limit: number) => setFilters({ lockers_limit: limit, lockers_page: 1 }),
    hasActiveFilters: filters.lockers_shape !== null || filters.lockers_search.length > 0,
  };
}
