import { useCallback } from 'react';

import { API_PAGE_SIZE_OPTIONS } from '@/constants/app.constants';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import { adminStoreControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { AdminConnectedDeviceControllerListData } from '@/lib/api-real/types.gen';

type EquipmentQuery = NonNullable<AdminConnectedDeviceControllerListData['query']>;

// API-103 list `deviceType` does not take gate_tablet yet, so 入退館タブレット is not a filter option.
export const EQUIPMENT_FILTER_TYPE_VALUES = [
  'entry_gate',
  'exit_gate',
  'area_door',
  'hydrogen_water',
  'body_composition',
  'tanning',
  'protein',
  'other',
] satisfies Array<NonNullable<EquipmentQuery['deviceType']>>;

export type EquipmentFilterType = (typeof EQUIPMENT_FILTER_TYPE_VALUES)[number];

const EQUIPMENT_STATUS_VALUES = [
  'normal',
  'abnormal',
  'under_maintenance',
  'discarded',
] satisfies Array<NonNullable<EquipmentQuery['status']>>;

/**
 * Sortable columns = the prototype's sortable columns ∩ API-103 §5.2 sort keys (D9). 接続機器ID /
 * 店舗 / 紐づき契約種別 have no server-side key, so their headers are not sortable. `createdAt` has no
 * column: it is the default order (newest first) the list falls back to when no header is sorted.
 */
export const EQUIPMENT_SORT_VALUES = [
  'createdAt',
  'deviceType',
  'name',
  'serialNumber',
  'ipAddress',
  'macAddress',
  'location',
  'installedOn',
  'status',
  'authMethod',
] satisfies Array<NonNullable<EquipmentQuery['sort']>>;

/** API-103 rejects a `q` longer than this with 400 E-VAL-001 (BUG-E02-A-04). */
export const EQUIPMENT_SEARCH_MAX_LENGTH = 100;

/** API-103 caps `limit` at 100; the prototype dropped 200 on 9/17 (D8). */
const EQUIPMENT_LIMIT_VALUES: readonly number[] = API_PAGE_SIZE_OPTIONS;

/** The only status the screen can be deep-linked into (SR-004). */
const EQUIPMENT_PINNED_FILTER_VALUES = ['abnormal'] satisfies Array<
  NonNullable<EquipmentQuery['status']>
>;

export function useEquipmentFilters() {
  const { currentStoreId, restrictedStores, canSelectAllStores } = useCurrentStore();

  const [filters, setFilters] = useQueryStates(
    {
      equipment_search: parseAsString.withDefault(''),
      equipment_store_id: parseAsString,
      equipment_type: parseAsStringEnum(EQUIPMENT_FILTER_TYPE_VALUES),
      equipment_status: parseAsStringEnum(EQUIPMENT_STATUS_VALUES),
      /**
       * Entry state for the 異常 deep link (SR-004). While it is set the 状態 filter is pinned to
       * 異常: the in-panel select cannot move it and `条件をクリア` does not release it. Only the
       * chip's dismiss action clears the param.
       */
      equipment_filter: parseAsStringEnum(EQUIPMENT_PINNED_FILTER_VALUES),
      equipment_sort_by: parseAsStringEnum(EQUIPMENT_SORT_VALUES).withDefault('createdAt'),
      equipment_sort_order: parseAsStringEnum(['asc', 'desc']).withDefault('desc'),
      equipment_page: parseAsInteger.withDefault(1),
      equipment_limit: parseAsInteger.withDefault(50),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  // Keyword is trimmed before it reaches the URL and the request: a whitespace-only box is not a
  // search condition, and `"  "` would otherwise land in both the query string and `q`.
  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.equipment_search, (value) =>
    setFilters({ equipment_search: value.trim() || null, equipment_page: 1 }),
  );
  // A hand-edited URL can still carry an over-long keyword past the input's maxLength.
  const searchTerm = filters.equipment_search.trim().slice(0, EQUIPMENT_SEARCH_MAX_LENGTH);

  /**
   * The prototype only renders the in-panel 店舗 filter when the header scope is 全店舗 AND the
   * user can actually reach more than one store; otherwise the header selector alone decides
   * the scope. `restrictedStores` is empty for the roles that may pick 全店舗.
   */
  const isAllStoresScope = currentStoreId === ALL_STORES;
  const showStoreFilter = isAllStoresScope && (canSelectAllStores || restrictedStores.length >= 2);

  // Header scope wins over the in-panel filter (prototype: effectiveStoreName).
  const effectiveStoreId = isAllStoresScope
    ? (filters.equipment_store_id ?? undefined)
    : currentStoreId;

  /**
   * 異常 deep-link entry state (SR-004): the status filter is pinned to 異常, the in-panel select
   * cannot override it, and `条件をクリア` deliberately leaves the pin in force.
   */
  const isAbnormalPinned = filters.equipment_filter === 'abnormal';
  const effectiveStatus = isAbnormalPinned
    ? ('abnormal' as const)
    : (filters.equipment_status ?? undefined);

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      equipment_search: null,
      equipment_store_id: null,
      equipment_type: null,
      // The pinned 異常 restriction survives 条件をクリア; only the chip's X releases it.
      equipment_status: isAbnormalPinned ? filters.equipment_status : null,
      equipment_page: 1,
    });
  };

  const releaseAbnormalPin = () => setFilters({ equipment_filter: null, equipment_page: 1 });

  /**
   * Name behind the in-panel 店舗 condition, for the filter-result banner summary. Shares its
   * cache entry with the filter panel's own lookup, so this costs no extra request.
   */
  const { data: selectedStore } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: filters.equipment_store_id ?? '' } }),
    enabled: showStoreFilter && !!filters.equipment_store_id,
  });
  const selectedStoreName = filters.equipment_store_id ? selectedStore?.name : undefined;

  // Stable identities: the list page keeps `setCurrentPage` in an effect dependency list.
  const setCurrentPage = useCallback(
    (page: number) => setFilters({ equipment_page: page }),
    [setFilters],
  );
  const setPageSize = useCallback(
    (limit: number) => setFilters({ equipment_limit: limit, equipment_page: 1 }),
    [setFilters],
  );

  const normalizedLimit = EQUIPMENT_LIMIT_VALUES.includes(filters.equipment_limit)
    ? filters.equipment_limit
    : 50;

  const queryParams: EquipmentQuery = {
    q: searchTerm || undefined,
    // Omitted under 全店舗 with no in-panel 店舗: API-103 then lists every store in the caller's
    // scope (PO Q4).
    storeId: effectiveStoreId,
    deviceType: filters.equipment_type || undefined,
    status: effectiveStatus,
    sort: filters.equipment_sort_by,
    order: filters.equipment_sort_order,
    page: filters.equipment_page,
    limit: normalizedLimit,
    // §0.3 — the filter-result banner's 全N件 baseline (D10).
    includeTotalAll: true,
  };

  const activeFilterCount = [
    showStoreFilter && filters.equipment_store_id != null,
    filters.equipment_type != null,
    // The pin counts as an active 状態 condition, exactly as the prototype seeds the select to 異常.
    isAbnormalPinned || filters.equipment_status != null,
  ].filter(Boolean).length;

  return {
    filters,
    queryParams,
    searchInput,
    setSearchInput,
    setFilters,
    clearFilters,
    showStoreFilter,
    /**
     * 店舗 is a table column only under the 全店舗 header scope: inside a single store every row
     * would repeat the same value, so the prototype drops the column entirely (as 010-d03 does).
     */
    showStoreColumn: isAllStoresScope,
    isAbnormalPinned,
    releaseAbnormalPin,
    selectedStoreName,
    currentPage: filters.equipment_page,
    setCurrentPage,
    setPageSize,
    pageSize: normalizedLimit,
    hasActiveFilters: searchTerm.length > 0 || activeFilterCount > 0,
    activeFilterCount,
  };
}
