import { useState } from 'react';

import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminSalesBillingControllerListData } from '@/lib/api-real/types.gen';

import { BILLING_TYPE_LABELS, type BillingType } from '../_constants/sales-labels.constant';
import { currentMonth, isSalesMonthInRange } from '../_utils/billing-month.util';
import { useSalesStoreScope } from './use-sales-store-scope.hook';

export type SalesListQuery = AdminSalesBillingControllerListData['query'];
export type SalesListSort = NonNullable<SalesListQuery['sort']>;
type ConfirmStatusQuery = NonNullable<SalesListQuery['confirmStatus']>[number];

/** The operator-facing 状態 filter: `未確定` covers both `pending` and `unconfirmed` (015 D8) */
export type SalesConfirmFilter = 'confirmed' | 'unconfirmed';

const CONFIRM_STATUS_QUERY: Record<SalesConfirmFilter, ConfirmStatusQuery[]> = {
  confirmed: ['confirmed'],
  unconfirmed: ['pending', 'unconfirmed'],
};

const BILLING_TYPE_VALUES = Object.keys(BILLING_TYPE_LABELS) as BillingType[];
const CONFIRM_FILTER_VALUES: SalesConfirmFilter[] = ['confirmed', 'unconfirmed'];

/** API-114 §5: the four fixed sorts (015 D7). `billingMonthDesc` is the API default */
export const SALES_SORT_VALUES = [
  'billingMonthDesc',
  'totalAmountDesc',
  'memberIdAsc',
  'unpaidAmountDesc',
] as const satisfies readonly SalesListSort[];

export const SALES_DEFAULT_SORT: SalesListSort = 'billingMonthDesc';

/** API-114 §5 `limit` is 1–200 */
export const SALES_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

/**
 * API-114 §5 `publicId` is a case-sensitive prefix match on `billings.public_id`; anything else is
 * a member number / name / kana / phone-tail search (015 D13). The id format itself is
 * TBD-BIL-PUBLIC-ID-FORMAT — dev issues `BMVJ14BQJF8630F` (monthly) and `MB-C0CBEB02` (manual), while
 * member numbers start `JF-` — so the detection is kept to this one regex and the term is upper-cased.
 */
const PUBLIC_ID_PATTERN = /^M?B[A-Z0-9-]*$/i;

export function useSalesFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      sf_month: parseAsString.withDefault(currentMonth()),
      sf_store_id: parseAsString,
      sf_billing_type: parseAsStringEnum(BILLING_TYPE_VALUES),
      sf_confirmation_status: parseAsStringEnum(CONFIRM_FILTER_VALUES),
      sf_unpaid_only: parseAsBoolean.withDefault(false),
      sf_search: parseAsString.withDefault(''),
      sf_sort: parseAsStringEnum([...SALES_SORT_VALUES]),
      sf_limit: parseAsInteger.withDefault(50),
    },
    { history: 'push', shallow: false },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.sf_search, (value) =>
    setFilters({ sf_search: value || null }),
  );

  const { effectiveStoreId, showStoreFilter, isScopeLoading } = useSalesStoreScope(
    filters.sf_store_id,
    () => setFilters({ sf_store_id: null }),
  );
  // A hand-edited URL month outside the 12-month window … next month falls back to the current
  // month (F-01 #363; the API itself refuses months before 2020-01 with 400)
  const month = isSalesMonthInRange(filters.sf_month) ? filters.sf_month : currentMonth();
  // NFKC folds full-width input (ＭＢ－…, the full-width space) and spaces are dropped: the BE
  // matches names without the space between 姓 and 名 (same as transactions, quyndh #15)
  const search = filters.sf_search.normalize('NFKC').replace(/\s+/g, '');
  const isPublicIdSearch = PUBLIC_ID_PATTERN.test(search);
  const pageSize = Math.min(Math.max(filters.sf_limit, 1), 200);

  /** Every filter except the cursor — the cursor stack resets whenever this changes */
  const baseQuery: SalesListQuery = {
    month,
    storeIds: effectiveStoreId ? [effectiveStoreId] : undefined,
    billingType: filters.sf_billing_type ? [filters.sf_billing_type] : undefined,
    confirmStatus: filters.sf_confirmation_status
      ? CONFIRM_STATUS_QUERY[filters.sf_confirmation_status]
      : undefined,
    hasUnpaid: filters.sf_unpaid_only || undefined,
    publicId: search && isPublicIdSearch ? search.slice(0, 40).toUpperCase() : undefined,
    memberQuery: search && !isPublicIdSearch ? search.slice(0, 50) : undefined,
    sort: filters.sf_sort ?? undefined,
    limit: pageSize,
  };

  // Cursor paging (015 D6): `cursors[i]` opens page i + 2. Kept in component state, keyed by the
  // query it was issued for — a cursor is bound to its sort / filters (BR-BIL-007).
  const baseQueryKey = JSON.stringify(baseQuery);
  const [cursorState, setCursorState] = useState<{ key: string; cursors: string[] }>({
    key: baseQueryKey,
    cursors: [],
  });
  const cursors = cursorState.key === baseQueryKey ? cursorState.cursors : [];
  const currentPage = cursors.length + 1;

  const queryParams: SalesListQuery = { ...baseQuery, cursor: cursors.at(-1) };

  /**
   * Baseline for the filter banner: month + the header store scope (the 店舗 filter / type /
   * status / unpaid / search cleared), so 「全N件」 counts the same stores the list can show
   */
  const baselineQueryParams: SalesListQuery = {
    month,
    storeIds: showStoreFilter || !effectiveStoreId ? undefined : [effectiveStoreId],
    limit: 1,
  };

  const goToNextPage = (nextCursor: string | null | undefined) => {
    if (!nextCursor) return;
    setCursorState({ key: baseQueryKey, cursors: [...cursors, nextCursor] });
  };
  const goToPreviousPage = () => {
    setCursorState({ key: baseQueryKey, cursors: cursors.slice(0, -1) });
  };

  const clearFilterSelects = () => {
    setFilters({
      sf_store_id: null,
      sf_billing_type: null,
      sf_confirmation_status: null,
      sf_unpaid_only: false,
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      sf_store_id: null,
      sf_billing_type: null,
      sf_confirmation_status: null,
      sf_unpaid_only: false,
      sf_search: null,
    });
  };

  const activeFilterCount = [
    showStoreFilter && filters.sf_store_id != null,
    filters.sf_billing_type != null,
    filters.sf_confirmation_status != null,
    filters.sf_unpaid_only,
  ].filter(Boolean).length;

  return {
    filters,
    setFilters,
    month,
    queryParams,
    baselineQueryParams,
    effectiveStoreId,
    showStoreFilter,
    isScopeLoading,
    searchInput,
    setSearchInput,
    clearFilters,
    clearFilterSelects,
    currentPage,
    goToNextPage,
    goToPreviousPage,
    pageSize,
    setPageSize: (limit: number) => setFilters({ sf_limit: limit }),
    sort: filters.sf_sort ?? SALES_DEFAULT_SORT,
    setSort: (sort: SalesListSort | null) =>
      setFilters({ sf_sort: sort === SALES_DEFAULT_SORT ? null : sort }),
    hasActiveFilters: activeFilterCount > 0 || search.length > 0,
    activeFilterCount,
  };
}
