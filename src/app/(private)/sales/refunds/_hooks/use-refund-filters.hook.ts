'use client';

import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import {
  PAYMENT_METHOD_LABELS,
  REFUND_DISPLAY_STATUS_LABELS,
  type RefundDisplayStatus,
  type SalesPaymentMethod,
} from '../../_constants/sales-labels.constant';
import { useSalesStoreScope } from '../../_hooks/use-sales-store-scope.hook';
import { toValidIsoDate } from '../../transactions/_utils/transaction-labels.util';
import {
  APPLICANT_ROLE_FILTER_LABELS,
  type ApplicantRole,
  REFUND_DEFAULT_PAGE_SIZE,
  REFUND_SORT_KEYS,
  type RefundListQuery,
} from '../_utils/refund-api.util';

const DISPLAY_STATUS_VALUES = Object.keys(REFUND_DISPLAY_STATUS_LABELS) as RefundDisplayStatus[];
const PAYMENT_METHOD_VALUES = Object.keys(PAYMENT_METHOD_LABELS) as SalesPaymentMethod[];
const APPLICANT_ROLE_VALUES = Object.keys(APPLICANT_ROLE_FILTER_LABELS) as ApplicantRole[];

/**
 * nuqs-backed filter/sort/pagination state for the refund queue (FR-004-a, API-118 §5).
 * Filters are single-select in the UI and sent as one-element arrays.
 */
export function useRefundFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      rf_status: parseAsStringEnum(DISPLAY_STATUS_VALUES),
      rf_payment_method: parseAsStringEnum(PAYMENT_METHOD_VALUES),
      rf_applicant_role: parseAsStringEnum(APPLICANT_ROLE_VALUES),
      rf_date_from: parseAsString,
      rf_date_to: parseAsString,
      rf_search: parseAsString.withDefault(''),
      rf_sort_by: parseAsStringEnum([...REFUND_SORT_KEYS]),
      rf_sort_order: parseAsStringEnum(['asc', 'desc']),
      rf_page: parseAsInteger.withDefault(1),
      rf_page_size: parseAsInteger.withDefault(REFUND_DEFAULT_PAGE_SIZE),
    },
    { history: 'push', shallow: false },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.rf_search, (value) =>
    setFilters({ rf_search: value || null, rf_page: 1 }),
  );

  // API-118 §5: limit is 1–100 — clamp a hand-edited URL instead of sending a 400
  const pageSize = Math.min(Math.max(filters.rf_page_size, 1), 100);

  // API-118 §5: fromDate / toDate are YYYY-MM-DD and fromDate ≤ toDate — a hand-edited URL date
  // is dropped and a reversed pair clamped instead of sending a 400
  const dateFrom = toValidIsoDate(filters.rf_date_from);
  const rawDateTo = toValidIsoDate(filters.rf_date_to);
  const dateTo = dateFrom && rawDateTo && rawDateTo < dateFrom ? dateFrom : rawDateTo;

  const { effectiveStoreId, isScopeLoading } = useSalesStoreScope();
  const queryParams: RefundListQuery = {
    // API-118 §5: HQ / System only — other roles are scoped server-side
    storeId: effectiveStoreId,
    displayStatus: filters.rf_status ? [filters.rf_status] : undefined,
    paymentMethod: filters.rf_payment_method ? [filters.rf_payment_method] : undefined,
    applicantRole: filters.rf_applicant_role ? [filters.rf_applicant_role] : undefined,
    fromDate: dateFrom ?? undefined,
    toDate: dateTo ?? undefined,
    q: filters.rf_search || undefined,
    sort: filters.rf_sort_by ?? undefined,
    order:
      filters.rf_sort_by && (filters.rf_sort_order === 'asc' || filters.rf_sort_order === 'desc')
        ? filters.rf_sort_order
        : undefined,
    page: filters.rf_page,
    limit: pageSize,
    includeTotalAll: true,
  };

  // `totalAllItems` clears every optional param incl. `storeId` (API-118 §5, CONV-001 §3.4.1), so
  // under a header store 「全N件」 needs its own count: that store, no other filter (k.iwaki !201)
  const baselineQueryParams: RefundListQuery | undefined = effectiveStoreId
    ? { storeId: effectiveStoreId, page: 1, limit: 1 }
    : undefined;

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      rf_status: null,
      rf_payment_method: null,
      rf_applicant_role: null,
      rf_date_from: null,
      rf_date_to: null,
      rf_search: null,
      rf_page: 1,
    });
  };

  const activeFilterCount =
    [
      filters.rf_status != null,
      filters.rf_payment_method != null,
      filters.rf_applicant_role != null,
      dateFrom != null || dateTo != null,
    ].filter(Boolean).length + (filters.rf_search ? 1 : 0);

  return {
    filters,
    setFilters,
    isScopeLoading,
    queryParams,
    baselineQueryParams,
    /** The URL dates after validation — what the list actually sends */
    dateFrom,
    dateTo,
    searchInput,
    setSearchInput,
    clearFilters,
    currentPage: filters.rf_page,
    setCurrentPage: (page: number) => setFilters({ rf_page: page }),
    pageSize,
    setPageSize: (size: number) => setFilters({ rf_page_size: size, rf_page: 1 }),
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}
