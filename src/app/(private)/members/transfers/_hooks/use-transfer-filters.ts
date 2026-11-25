import { useEffect, useRef } from 'react';

import { PAGE_SIZE } from '@/constants/app.constants';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import type { AdminTransferControllerListData } from '@/lib/api-real/types.gen';

import { joinPeriodToRange } from '../../_utils/filter-ranges';
import {
  TRANSFER_APPLICATION_STATUS_LABELS,
  TRANSFER_APPLIED_PERIOD_OPTIONS,
  TRANSFER_AUTO_OPTIONS,
  TRANSFER_BRAND_FILTER_TO_API,
  TRANSFER_BRAND_LABELS,
  type TransferApplicationStatus,
  type TransferBrandFilter,
} from '../_constants/constants';

type AppliedPeriod = 'this_month' | 'last_month' | 'this_year';
type AutoTransfer = 'eligible' | 'excluded';

export type TransferListQuery = NonNullable<AdminTransferControllerListData['query']>;

export type TransferFilters = {
  page: number;
  pageSize: number;
  status: TransferApplicationStatus | null;
  from_store_id: string | null;
  to_store_id: string | null;
  brand: TransferBrandFilter | null;
  applied_period: AppliedPeriod | null;
  auto_transfer: AutoTransfer | null;
};

const TRANSFER_STATUS_VALUES = Object.keys(
  TRANSFER_APPLICATION_STATUS_LABELS,
) as TransferApplicationStatus[];

export function useTransferFilters() {
  const { currentStoreId, isLoading: isStoreScopeLoading } = useCurrentStore();

  // URL keys are unchanged from the mock era; only their mapping onto the API params moved.
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(PAGE_SIZE),
      status: parseAsStringEnum<TransferApplicationStatus>(TRANSFER_STATUS_VALUES),
      from_store_id: parseAsString,
      to_store_id: parseAsString,
      brand: parseAsStringEnum<TransferBrandFilter>(
        Object.keys(TRANSFER_BRAND_FILTER_TO_API) as TransferBrandFilter[],
      ),
      applied_period: parseAsStringEnum<AppliedPeriod>(['this_month', 'last_month', 'this_year']),
      auto_transfer: parseAsStringEnum<AutoTransfer>(['eligible', 'excluded']),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  // A header store switch changes the result set like any filter does, so it also returns to
  // page 1. The store resolved while the scope is still loading is not a switch, so a
  // deep-linked page is kept.
  const prevStoreIdRef = useRef(currentStoreId);
  useEffect(() => {
    if (isStoreScopeLoading) {
      prevStoreIdRef.current = currentStoreId;
      return;
    }
    if (prevStoreIdRef.current === currentStoreId) return;
    prevStoreIdRef.current = currentStoreId;
    void setFilters({ page: 1 });
  }, [currentStoreId, isStoreScopeLoading, setFilters]);

  const updateFilter = <K extends keyof TransferFilters>(key: K, value: TransferFilters[K]) => {
    // Every filter change resets to page 1 so the user is never left on a page that no longer
    // exists in the narrowed result set.
    setFilters({ [key]: value, page: 1 } as Parameters<typeof setFilters>[0]);
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      status: null,
      from_store_id: null,
      to_store_id: null,
      brand: null,
      applied_period: null,
      auto_transfer: null,
    });
  };

  const activeFilterCount = [
    filters.status,
    filters.from_store_id,
    filters.to_store_id,
    filters.brand,
    filters.applied_period,
    filters.auto_transfer,
  ].filter((value) => value !== null).length;

  const hasActiveFilters = activeFilterCount > 0;

  /**
   * Joined labels of the active filters, for the result banner. Store filters resolve to a
   * name via `storeNameById` when the caller can supply one; otherwise the raw id is shown
   * rather than nothing, so the banner never claims a filter that it cannot describe.
   */
  const buildFilterSummary = (storeNameById?: (id: string) => string | undefined): string[] => {
    const parts: string[] = [];
    if (filters.status) parts.push(TRANSFER_APPLICATION_STATUS_LABELS[filters.status]);
    if (filters.from_store_id) {
      parts.push(`移籍元: ${storeNameById?.(filters.from_store_id) ?? filters.from_store_id}`);
    }
    if (filters.to_store_id) {
      parts.push(`移籍先: ${storeNameById?.(filters.to_store_id) ?? filters.to_store_id}`);
    }
    if (filters.brand) parts.push(TRANSFER_BRAND_LABELS[filters.brand]);
    if (filters.applied_period) {
      const label = TRANSFER_APPLIED_PERIOD_OPTIONS.find(
        (o) => o.value === filters.applied_period,
      )?.label;
      if (label) parts.push(`申請: ${label}`);
    }
    if (filters.auto_transfer) {
      const label = TRANSFER_AUTO_OPTIONS.find((o) => o.value === filters.auto_transfer)?.label;
      if (label) parts.push(`自動移籍: ${label}`);
    }
    return parts;
  };

  // 申請日 presets are expanded to the inclusive `appliedFrom`/`appliedTo` date bounds the API takes.
  const { enrolledFrom: appliedFrom, enrolledTo: appliedTo } = joinPeriodToRange(
    filters.applied_period,
  );

  const queryParams: TransferListQuery = {
    page: filters.page,
    limit: filters.pageSize,
    status: filters.status ?? undefined,
    fromStoreId: filters.from_store_id ?? undefined,
    toStoreId: filters.to_store_id ?? undefined,
    // The header store narrows to applications whose source OR destination is that store.
    storeId: currentStoreId === ALL_STORES ? undefined : currentStoreId,
    brandGroup: filters.brand ? TRANSFER_BRAND_FILTER_TO_API[filters.brand] : undefined,
    appliedFrom,
    appliedTo,
    autoTransferEligibility: filters.auto_transfer ?? undefined,
  };

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    buildFilterSummary,
    queryParams,
    /** The header store is still resolving, so `queryParams.storeId` is not final yet. */
    isStoreScopeLoading,
    currentPage: filters.page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    pageSize: filters.pageSize,
    setPageSize: (nextPageSize: number) => setFilters({ pageSize: nextPageSize, page: 1 }),
  };
}
