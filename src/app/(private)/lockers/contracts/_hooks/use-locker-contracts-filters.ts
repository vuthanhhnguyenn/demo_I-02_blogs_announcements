import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import type { AdminLockerContractsControllerListData } from '@/lib/api-real/types.gen';

import { LOCKER_LIST_DEFAULT_PAGE_SIZE } from '../../_constants/constants';
import {
  LOCKER_CONTRACT_SLOT_STATUS_OPTIONS,
  LOCKER_OPTION_STATUS_OPTIONS,
  type LockerContractSlotStatus,
  type LockerOptionStatus,
} from '../../_constants/locker-enum-labels.constants';
import type { LockerContractsCsvQuery } from '../../_hooks/use-locker-server-csv-export.hook';

type LockerContractsQuery = NonNullable<AdminLockerContractsControllerListData['query']>;
export type LockerContractsSortKey = NonNullable<LockerContractsQuery['sort']>;

/** Sort keys `GET /admin/locker-contracts` accepts (column id = sort key) */
export const LOCKER_CONTRACTS_SORT_KEYS: LockerContractsSortKey[] = [
  'slotCode',
  'memberName',
  'optionName',
  'contractedAt',
  'cancellationDate',
  'createdAt',
];

const DEFAULT_SORT: LockerContractsSortKey = 'slotCode';

/**
 * URL state of the contract list tab. The store comes from the header store (omitted under
 * 全店舗 — HQ may list every store, API-101 §4.2).
 * TODO(round3) R304: free-text search (`locker_contracts_search`) removed — the spec does not define
 * it and `GET /admin/locker-contracts` has no `q`.
 */
export function useLockerContractsFilters() {
  const { currentStoreId, isLoading: isStoreLoading } = useCurrentStore();
  const storeId = currentStoreId && currentStoreId !== ALL_STORES ? currentStoreId : undefined;

  const [filters, setFilters] = useQueryStates(
    {
      locker_contracts_page: parseAsInteger.withDefault(1),
      locker_contracts_limit: parseAsInteger.withDefault(LOCKER_LIST_DEFAULT_PAGE_SIZE),
      /** `optionId` of a locker fee option (契約種類) */
      locker_contracts_option_id: parseAsString,
      locker_contracts_status: parseAsStringEnum<LockerOptionStatus>(
        LOCKER_OPTION_STATUS_OPTIONS.map((o) => o.value),
      ),
      /** スロット状態 (`slotStatus`, API-101 §4.2): `in_use` | `pending_release` */
      locker_contracts_slot_status: parseAsStringEnum<LockerContractSlotStatus>(
        LOCKER_CONTRACT_SLOT_STATUS_OPTIONS.map((o) => o.value),
      ),
      locker_contracts_sort_by: parseAsStringEnum<LockerContractsSortKey>(
        LOCKER_CONTRACTS_SORT_KEYS,
      ).withDefault(DEFAULT_SORT),
      locker_contracts_sort_order: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']).withDefault(
        'asc',
      ),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const clearFilters = () => {
    setFilters({
      locker_contracts_page: 1,
      locker_contracts_limit: LOCKER_LIST_DEFAULT_PAGE_SIZE,
      locker_contracts_option_id: null,
      locker_contracts_status: null,
      locker_contracts_slot_status: null,
      locker_contracts_sort_by: DEFAULT_SORT,
      locker_contracts_sort_order: 'asc',
    });
  };

  const exportQueryParams: LockerContractsCsvQuery = {
    storeId,
    optionId: filters.locker_contracts_option_id || undefined,
    optionStatus: filters.locker_contracts_status ?? undefined,
    slotStatus: filters.locker_contracts_slot_status ?? undefined,
    sort: filters.locker_contracts_sort_by,
    order: filters.locker_contracts_sort_order,
  };

  const queryParams: LockerContractsQuery = {
    ...exportQueryParams,
    page: filters.locker_contracts_page,
    limit: filters.locker_contracts_limit,
    includeTotalAll: true,
  };

  const activeFilterCount = [
    filters.locker_contracts_option_id !== null,
    filters.locker_contracts_status !== null,
    filters.locker_contracts_slot_status !== null,
  ].filter(Boolean).length;

  return {
    storeId,
    isStoreLoading,
    filters,
    queryParams,
    exportQueryParams,
    setFilters,
    clearFilters,
    currentPage: filters.locker_contracts_page,
    setCurrentPage: (page: number) => setFilters({ locker_contracts_page: page }),
    pageSize: filters.locker_contracts_limit,
    setPageSize: (limit: number) =>
      setFilters({ locker_contracts_limit: limit, locker_contracts_page: 1 }),
    hasActiveFilters: activeFilterCount > 0,
    activeFilterCount,
  };
}
