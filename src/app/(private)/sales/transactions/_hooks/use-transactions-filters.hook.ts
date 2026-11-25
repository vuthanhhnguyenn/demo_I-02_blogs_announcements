import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import { useSalesStoreScope } from '../../_hooks/use-sales-store-scope.hook';
import {
  TRANSACTION_PAYMENT_METHOD_VALUES,
  TRANSACTION_TYPE_VALUES,
  type TransactionQuery,
  resolveTransactionDateRange,
  toValidIsoDate,
} from '../_utils/transaction-labels.util';

/** API-116 §4.2: `limit` 1–200 */
export const TRANSACTION_PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const MAX_PAGE_SIZE = 200;
/** API-116 §4.2: `memberName` 1–100 chars */
export const TRANSACTION_SEARCH_MAX_LENGTH = 100;
/** API-116 v0.8 §4.2: `memberNumber` 1–60 chars, prefix match on member_number / legacy code */
const MEMBER_NUMBER_MAX_LENGTH = 60;
const MEMBER_NUMBER_PATTERN = /^[A-Za-z0-9-]+$/;

export function useTransactionsFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      tf_date_from: parseAsString,
      tf_date_to: parseAsString,
      tf_store_id: parseAsString,
      tf_transaction_type: parseAsStringEnum([...TRANSACTION_TYPE_VALUES]),
      tf_payment_method: parseAsStringEnum([...TRANSACTION_PAYMENT_METHOD_VALUES]),
      tf_search: parseAsString.withDefault(''),
      tf_page: parseAsInteger.withDefault(1),
      tf_page_size: parseAsInteger.withDefault(50),
    },
    { history: 'push', shallow: false },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.tf_search, (value) =>
    setFilters({ tf_search: value || null, tf_page: 1 }),
  );

  // D3: fromDate / toDate are required — an empty filter sends the default window
  const { effectiveStoreId, showStoreFilter, isScopeLoading } = useSalesStoreScope(
    filters.tf_store_id,
    () => setFilters({ tf_store_id: null }),
  );
  const dateRange = resolveTransactionDateRange(filters.tf_date_from, filters.tf_date_to);
  const pageSize = Math.min(Math.max(filters.tf_page_size, 1), MAX_PAGE_SIZE);
  // FR-002-a 会員ID・氏名: one box. A term with a digit and only ASCII letters / digits / hyphens is
  // a 会員ID (`memberNumber`, prefix match); anything else is a name. The two filters AND together.
  // NFKC folds full-width input (ＪＦ－９０００…, the full-width space) to ASCII, and spaces are
  // dropped: the BE matches names without the space shown between 姓 and 名 (dev 2026-10-27:
  // 「テスト 会員」 0 rows, 「テスト会員」 8 rows)
  const searchTerm = filters.tf_search.normalize('NFKC').replace(/\s+/g, '');
  const isMemberNumber = MEMBER_NUMBER_PATTERN.test(searchTerm) && /\d/.test(searchTerm);
  const memberNumber = isMemberNumber ? searchTerm.slice(0, MEMBER_NUMBER_MAX_LENGTH) : '';
  const memberName = isMemberNumber ? '' : searchTerm.slice(0, TRANSACTION_SEARCH_MAX_LENGTH);

  /** Filters shared by the list and the CSV export (the export rejects page / limit, E-TXN-004) */
  const filterParams: TransactionQuery = {
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
    storeIds: effectiveStoreId ? [effectiveStoreId] : undefined,
    transactionType: filters.tf_transaction_type ? [filters.tf_transaction_type] : undefined,
    paymentMethod: filters.tf_payment_method ? [filters.tf_payment_method] : undefined,
    memberNumber: memberNumber || undefined,
    memberName: memberName || undefined,
  };

  const queryParams: TransactionQuery = {
    ...filterParams,
    page: filters.tf_page,
    limit: pageSize,
    includeTotalAll: true,
  };

  // `totalAllItems` ignores `storeIds`, so under a header store 「全N件」 needs its own count:
  // the same date range and store, no other filter. Unset when the server's total already fits.
  const headerStoreIds = !showStoreFilter && effectiveStoreId ? [effectiveStoreId] : undefined;
  const baselineQueryParams: TransactionQuery | undefined = headerStoreIds && {
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
    storeIds: headerStoreIds,
    page: 1,
    limit: 1,
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      tf_date_from: null,
      tf_date_to: null,
      tf_store_id: null,
      tf_transaction_type: null,
      tf_payment_method: null,
      tf_search: null,
      tf_page: 1,
    });
  };

  const hasDateFilter =
    toValidIsoDate(filters.tf_date_from) != null || toValidIsoDate(filters.tf_date_to) != null;
  const activeFilterCount = [
    hasDateFilter,
    showStoreFilter && filters.tf_store_id != null,
    filters.tf_transaction_type != null,
    filters.tf_payment_method != null,
  ].filter(Boolean).length;

  return {
    filters,
    setFilters,
    isScopeLoading,
    dateRange,
    filterParams,
    queryParams,
    baselineQueryParams,
    showStoreFilter,
    searchInput,
    setSearchInput,
    clearFilters,
    currentPage: filters.tf_page,
    setCurrentPage: (page: number) => setFilters({ tf_page: page }),
    pageSize,
    setPageSize: (size: number) => setFilters({ tf_page_size: size, tf_page: 1 }),
    hasActiveFilters: activeFilterCount > 0 || filters.tf_search.length > 0,
    /** The date range is the screen's window, not a narrowing condition: a range-only empty result
     * is a true empty state without 条件をクリア (BUG-016A-09) */
    hasNarrowingFilters:
      activeFilterCount - (hasDateFilter ? 1 : 0) > 0 || filters.tf_search.length > 0,
    activeFilterCount,
  };
}
