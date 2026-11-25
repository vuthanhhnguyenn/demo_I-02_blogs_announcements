import { useCallback, useEffect, useState } from 'react';

import { API_PAGE_SIZE_OPTIONS } from '@/constants/app.constants';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminRelayControllerControllerListData } from '@/lib/api-real/types.gen';

import { CONTROLLER_STATUS_VALUES } from '../_constants/constants';

type ControllerQuery = NonNullable<AdminRelayControllerControllerListData['query']>;

/**
 * Sortable columns = the prototype's sortable columns ∩ API-104 §4.1 sort keys (D9). 装置ID /
 * 店舗コード / 設置場所 have no server-side key, so their headers are not sortable. `createdAt` has no
 * column: it is the default order (newest first) the list falls back to when no header is sorted.
 */
export const CONTROLLER_SORT_VALUES = [
  'createdAt',
  'name',
  'ipAddress',
  'firmwareVersion',
  'controlPortCount',
  'connectedDeviceCount',
  'status',
] satisfies Array<NonNullable<ControllerQuery['sort']>>;

/** API-104 clamps `limit` to 1–100; the prototype dropped 200 on 9/17 (D8). */
const CONTROLLER_LIMIT_VALUES: readonly number[] = API_PAGE_SIZE_OPTIONS;

export function useControllerFilters() {
  const { currentStoreId, isLoading: isStoreScopeLoading } = useCurrentStore();

  const [filters, setFilters] = useQueryStates(
    {
      controller_search: parseAsString.withDefault(''),
      controller_status: parseAsStringEnum([...CONTROLLER_STATUS_VALUES]),
      controller_sort_by: parseAsStringEnum(CONTROLLER_SORT_VALUES).withDefault('createdAt'),
      controller_sort_order: parseAsStringEnum(['asc', 'desc']).withDefault('desc'),
      controller_page: parseAsInteger.withDefault(1),
      controller_limit: parseAsInteger.withDefault(50),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  /**
   * BUG-E02-D-05 — a header scope switch is a new result set, so the list starts over on page 1
   * (the way every in-panel filter change already does). The switch is caught during render, so
   * not even the first request for the new store goes out with the old store's page; the URL is
   * then brought in line by the effect. While the store context is still resolving (restricted
   * roles), the scope only settles — it is not a user switch, and a deep-linked page is kept.
   */
  const [pageScope, setPageScope] = useState({ storeId: currentStoreId, resetPage: false });
  if (pageScope.storeId !== currentStoreId) {
    setPageScope({ storeId: currentStoreId, resetPage: !isStoreScopeLoading });
  }
  if (pageScope.resetPage && filters.controller_page === 1) {
    setPageScope({ storeId: pageScope.storeId, resetPage: false });
  }
  useEffect(() => {
    if (pageScope.resetPage && filters.controller_page !== 1) {
      void setFilters({ controller_page: 1 });
    }
  }, [pageScope.resetPage, filters.controller_page, setFilters]);
  const currentPage = pageScope.resetPage ? 1 : filters.controller_page;

  // Keyword is trimmed before it reaches the URL and the request: a whitespace-only box is not a
  // search condition, and `"  "` would otherwise land in both the query string and `q`.
  const { searchInput, setSearchInput } = useDebouncedUrlSearch(
    filters.controller_search,
    (value) => setFilters({ controller_search: value.trim() || null, controller_page: 1 }),
  );
  const searchTerm = filters.controller_search.trim();

  /**
   * The controller panel of the prototype has no in-panel 店舗 filter — unlike the connected
   * equipment panel — so the header store selector alone decides the scope, and the 店舗コード
   * column disappears while a single store is selected (`showStoreColumn`).
   */
  const isAllStoresScope = currentStoreId === ALL_STORES;

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      controller_search: null,
      controller_status: null,
      controller_page: 1,
    });
  };

  // Stable identities: the list page keeps `setCurrentPage` in an effect dependency list.
  const setCurrentPage = useCallback(
    (page: number) => setFilters({ controller_page: page }),
    [setFilters],
  );
  const setPageSize = useCallback(
    (limit: number) => setFilters({ controller_limit: limit, controller_page: 1 }),
    [setFilters],
  );

  const normalizedLimit = CONTROLLER_LIMIT_VALUES.includes(filters.controller_limit)
    ? filters.controller_limit
    : 50;

  const queryParams: ControllerQuery = {
    q: searchTerm || undefined,
    storeId: isAllStoresScope ? undefined : currentStoreId,
    status: filters.controller_status || undefined,
    sort: filters.controller_sort_by,
    order: filters.controller_sort_order,
    page: currentPage,
    limit: normalizedLimit,
  };

  const activeFilterCount = filters.controller_status != null ? 1 : 0;

  return {
    filters,
    queryParams,
    searchInput,
    setSearchInput,
    setFilters,
    clearFilters,
    showStoreColumn: isAllStoresScope,
    currentPage,
    setCurrentPage,
    setPageSize,
    pageSize: normalizedLimit,
    hasActiveFilters: searchTerm.length > 0 || activeFilterCount > 0,
    activeFilterCount,
  };
}
