import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import type { AdminLockerSlotOpsControllerListPendingReleaseData } from '@/lib/api-real/types.gen';

import { LOCKER_LIST_DEFAULT_PAGE_SIZE } from '../../_constants/constants';
import type { LockerPendingCsvQuery } from '../../_hooks/use-locker-server-csv-export.hook';

type LockerPendingQuery = NonNullable<AdminLockerSlotOpsControllerListPendingReleaseData['query']>;
export type LockerPendingSortKey = NonNullable<LockerPendingQuery['sort']>;

/** Sort keys `GET /admin/locker-slots/pending-release` accepts (column id = sort key) */
export const LOCKER_PENDING_SORT_KEYS: LockerPendingSortKey[] = [
  'slotCode',
  'lockerLocationCode',
  'memberName',
  'cancellationDate',
  'daysSincePendingRelease',
  'releaseDate',
];

const DEFAULT_SORT: LockerPendingSortKey = 'releaseDate';

/**
 * URL state of the pending-release tab (FR-008: store / location / 解約日 From–To).
 * Dates are kept as `YYYY-MM-DD`, the wire format. With no store picked the header store is sent:
 * manager / staff / observer must pass `storeId` (API-101 §4.1 / §8.1), and only 全店舗 omits it.
 * TODO(round3) R304: free-text search (`locker_pending_search`) removed — FR-008 does not define it
 * and the API has no `q`.
 */
export function useLockerPendingSlotsFilters() {
  const { currentStoreId, isLoading: isStoreLoading } = useCurrentStore();
  const headerStoreId =
    currentStoreId && currentStoreId !== ALL_STORES ? currentStoreId : undefined;

  const [filters, setFilters] = useQueryStates(
    {
      locker_pending_page: parseAsInteger.withDefault(1),
      locker_pending_limit: parseAsInteger.withDefault(LOCKER_LIST_DEFAULT_PAGE_SIZE),
      locker_pending_store_id: parseAsString,
      locker_pending_location_id: parseAsString,
      locker_pending_cancel_from: parseAsString.withDefault(''),
      locker_pending_cancel_to: parseAsString.withDefault(''),
      locker_pending_sort_by:
        parseAsStringEnum<LockerPendingSortKey>(LOCKER_PENDING_SORT_KEYS).withDefault(DEFAULT_SORT),
      locker_pending_sort_order: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']).withDefault(
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
      locker_pending_page: 1,
      locker_pending_limit: LOCKER_LIST_DEFAULT_PAGE_SIZE,
      locker_pending_store_id: null,
      locker_pending_location_id: null,
      locker_pending_cancel_from: null,
      locker_pending_cancel_to: null,
      locker_pending_sort_by: DEFAULT_SORT,
      locker_pending_sort_order: 'asc',
    });
  };

  const exportQueryParams: LockerPendingCsvQuery = {
    storeId: filters.locker_pending_store_id || headerStoreId,
    lockerLocationId: filters.locker_pending_location_id || undefined,
    cancellationDateFrom: filters.locker_pending_cancel_from || undefined,
    cancellationDateTo: filters.locker_pending_cancel_to || undefined,
  };

  const queryParams: LockerPendingQuery = {
    ...exportQueryParams,
    page: filters.locker_pending_page,
    limit: filters.locker_pending_limit,
    sort: filters.locker_pending_sort_by,
    order: filters.locker_pending_sort_order,
    includeTotalAll: true,
  };

  const activeFilterCount = [
    filters.locker_pending_store_id !== null,
    filters.locker_pending_location_id !== null,
    filters.locker_pending_cancel_from.length > 0,
    filters.locker_pending_cancel_to.length > 0,
  ].filter(Boolean).length;

  return {
    storeId: exportQueryParams.storeId,
    isStoreLoading,
    filters,
    queryParams,
    exportQueryParams,
    setFilters,
    clearFilters,
    currentPage: filters.locker_pending_page,
    setCurrentPage: (page: number) => setFilters({ locker_pending_page: page }),
    pageSize: filters.locker_pending_limit,
    setPageSize: (limit: number) =>
      setFilters({ locker_pending_limit: limit, locker_pending_page: 1 }),
    hasActiveFilters: activeFilterCount > 0,
    activeFilterCount,
  };
}
