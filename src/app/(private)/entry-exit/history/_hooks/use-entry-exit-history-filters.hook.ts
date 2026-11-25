import { useEffect, useMemo, useRef } from 'react';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { getTodayJstISODate, isISODateString } from '@/utils/date.util';
import { addDays, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type {
  AccessLogExportRequestDto,
  AdminAccessLogControllerListData,
} from '@/lib/api-real/types.gen';

const HISTORY_DEFAULT_RANGE_DAYS = 30;
// API limit (E-VIS-004): dateTo − dateFrom ≤ 92 days for the interactive list.
export const HISTORY_MAX_RANGE_DAYS = 92;
// API limit (E-VIS-005): `memberQ` is 1–80 chars.
export const ENTRY_EXIT_HISTORY_SEARCH_MAX_LENGTH = 80;

/** Caps `dateTo` so the range never exceeds the API window (also covers `?date_from=…&date_to=…` deep links). */
export function clampHistoryDateTo(dateFrom: string, dateTo: string): string {
  const from = parseISO(dateFrom);
  const to = parseISO(dateTo);
  return differenceInCalendarDays(to, from) > HISTORY_MAX_RANGE_DAYS
    ? format(addDays(from, HISTORY_MAX_RANGE_DAYS), 'yyyy-MM-dd')
    : dateTo;
}

type AuthMethod = 'qr' | 'nfc';
type HistoryResult = 'success' | 'denied';
type SortBy =
  | 'name'
  | 'visit_date'
  | 'entry_time'
  | 'exit_time'
  | 'contract_name'
  | 'home_store_name'
  | 'visit_store_name';
type SortOrder = 'asc' | 'desc';

/**
 * URL value for a sort the user cleared on purpose (as on the options list): no `sort` is sent and
 * every header shows the neutral icon. Only a first visit (no `sort_by` in the URL) gets the
 * default newest-first 日時 sort.
 */
export const HISTORY_SORT_CLEARED = 'none';

type AccessLogListQuery = NonNullable<AdminAccessLogControllerListData['query']>;
type AccessLogListSort = NonNullable<AccessLogListQuery['sort']>;

// Entry rows only: each carries its paired `exitAt`, so exit events would duplicate visits.
const HISTORY_EVENT_TYPES = 'entry,companion_entry';
// API results are 12 values; the screen only distinguishes success / denied.
const DENIED_RESULTS =
  'denied_contract,denied_option,denied_blacklist,denied_delinquent,denied_family_in,denied_manual_stop,denied_duplicate,denied_auth_failed,denied_companion_no_invite,denied_companion_window_expired,denied_other';

// Column sort → API sort key. The API has no separate date / entry-time sort, both are `used_at`.
const SORT_KEY_BY_COLUMN: Record<SortBy, string> = {
  name: 'member_kana',
  visit_date: 'used_at',
  entry_time: 'used_at',
  exit_time: 'exit_at',
  contract_name: 'contract',
  home_store_name: 'primary_store',
  visit_store_name: 'event_store',
};

export type EntryExitHistoryFiltersState = {
  page: number;
  limit: number;
  search: string;
  date_from: string;
  date_to: string;
  store_id: string | null;
  auth_method: AuthMethod | null;
  result: HistoryResult | null;
  /** `HISTORY_SORT_CLEARED` = the user cleared the sort: no `sort` is sent. */
  sort_by: SortBy | typeof HISTORY_SORT_CLEARED;
  sort_order: SortOrder;
};

/**
 * `nuqs` URL-state filters for the entry-exit history screen, following the
 * same shape as every other filterable list screen in this app
 * (`use-banners-filters.ts`, `use-locker-pending-slots-filters.ts`).
 */
export function useEntryExitHistoryFilters() {
  // Reflect the header store scope in the fetch/export conditions, mirroring
  // entry-exit-section.tsx: a specific header store wins; when the header is
  // "全店舗" the page-local store filter (if any) takes over.
  const { currentStoreId, isLoading: isStoreScopeLoading } = useCurrentStore();

  // "Today" is the JST business date, whatever the browser timezone (the API's dates are JST).
  const today = getTodayJstISODate();
  const defaultDateTo = today;
  const defaultDateFrom = useMemo(
    () => format(subDays(parseISO(today), HISTORY_DEFAULT_RANGE_DAYS - 1), 'yyyy-MM-dd'),
    [today],
  );

  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(50),
      search: parseAsString.withDefault(''),
      date_from: parseAsString.withDefault(defaultDateFrom),
      date_to: parseAsString.withDefault(defaultDateTo),
      store_id: parseAsString,
      auth_method: parseAsStringEnum<AuthMethod>(['qr', 'nfc']),
      result: parseAsStringEnum<HistoryResult>(['success', 'denied']),
      sort_by: parseAsStringEnum<SortBy | typeof HISTORY_SORT_CLEARED>([
        'name',
        'visit_date',
        'entry_time',
        'exit_time',
        'contract_name',
        'home_store_name',
        'visit_store_name',
        HISTORY_SORT_CLEARED,
      ]).withDefault('visit_date'),
      sort_order: parseAsStringEnum<SortOrder>(['asc', 'desc']).withDefault('desc'),
    },
    { history: 'push', shallow: false },
  );

  // Switching the header store re-scopes the list, so the current page number no longer means
  // anything: page 5 of 全店舗 would be an empty page of a one-page store. Only a switch made after
  // the scope resolved counts — a scoped user's first "全店舗" → home-store hop is not a switch,
  // so a `?page=` deep link survives it.
  const resolvedStoreIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (isStoreScopeLoading) return;
    const previousStoreId = resolvedStoreIdRef.current;
    resolvedStoreIdRef.current = currentStoreId;
    if (previousStoreId !== null && previousStoreId !== currentStoreId && filters.page !== 1) {
      setFilters({ page: 1 }, { history: 'replace' });
    }
  }, [currentStoreId, isStoreScopeLoading, filters.page, setFilters]);

  // `dateFrom` / `dateTo` are required by the API; the picker always yields both. A hand-edited
  // `?date_from=` / `?date_to=` that is not a real date falls back to the default, and a future
  // day is pulled back to today (JST) — the URL is rewritten to match, so it never crashes the
  // date display or reaches the API as a 422.
  const pickDate = (value: string, fallback: string) =>
    isISODateString(value) ? (value > today ? today : value) : fallback;
  const urlDateFrom = pickDate(filters.date_from, defaultDateFrom);
  const urlDateTo = pickDate(filters.date_to, defaultDateTo);
  const isUrlDateFixNeeded = urlDateFrom !== filters.date_from || urlDateTo !== filters.date_to;
  useEffect(() => {
    if (isUrlDateFixNeeded) {
      setFilters({ date_from: urlDateFrom, date_to: urlDateTo }, { history: 'replace' });
    }
  }, [isUrlDateFixNeeded, urlDateFrom, urlDateTo, setFilters]);
  const dateFrom = urlDateFrom;
  const dateTo = clampHistoryDateTo(dateFrom, urlDateTo);

  // A whitespace-only keyword is no keyword: it stays out of the URL, so it never reaches the API.
  const { searchInput, setSearchInput } = useDebouncedUrlSearch(
    filters.search,
    (value) => setFilters({ search: value || null, page: 1 }),
    {
      normalize: (value) =>
        value.trim() ? value.slice(0, ENTRY_EXIT_HISTORY_SEARCH_MAX_LENGTH) : '',
    },
  );
  // What is sent as `memberQ` — also trims / caps a hand-edited `?search=` deep link.
  const searchKeyword = filters.search.trim().slice(0, ENTRY_EXIT_HISTORY_SEARCH_MAX_LENGTH);

  const updateFilter = <K extends keyof EntryExitHistoryFiltersState>(
    key: K,
    value: EntryExitHistoryFiltersState[K],
  ) => {
    setFilters({ [key]: value ?? null, page: 1 } as Parameters<typeof setFilters>[0]);
  };

  // Sort and page size are view settings, not filter conditions: clearing keeps them.
  const defaultConditions = {
    page: 1,
    search: null,
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    store_id: null,
    auth_method: null,
    result: null,
  };
  const clearFilters = () => {
    setSearchInput('');
    setFilters(defaultConditions);
  };

  // The way out of a 400 / 422 list error. A hand-edited `?limit=` outside the API's 1–100 is
  // rejected too, and it is the one view setting `clearFilters` keeps, so this resets it as well.
  const resetRejectedConditions = () => {
    setSearchInput('');
    setFilters({ ...defaultConditions, limit: null });
  };

  // The page-local store filter is only shown (and applied) under the header's "全店舗" scope,
  // so a leftover `store_id` must not count as an active filter otherwise.
  const isStoreFilterActive = currentStoreId === ALL_STORES && filters.store_id !== null;
  const isDateRangeChanged = dateFrom !== defaultDateFrom || dateTo !== defaultDateTo;

  const hasActiveFilters =
    searchKeyword.length > 0 ||
    isDateRangeChanged ||
    isStoreFilterActive ||
    filters.auth_method !== null ||
    filters.result !== null;

  const activeDetailFilterCount = [
    isDateRangeChanged,
    isStoreFilterActive,
    filters.auth_method !== null,
    filters.result !== null,
  ].filter(Boolean).length;

  const effectiveStoreId =
    currentStoreId === ALL_STORES ? (filters.store_id ?? undefined) : currentStoreId;

  const sort =
    filters.sort_by === HISTORY_SORT_CLEARED
      ? undefined
      : (`${SORT_KEY_BY_COLUMN[filters.sort_by]}_${filters.sort_order}` as AccessLogListSort);

  const conditions = {
    dateFrom,
    dateTo,
    storeIds: effectiveStoreId,
    memberQ: searchKeyword || undefined,
    authChannels: filters.auth_method ?? undefined,
    results:
      filters.result === 'success'
        ? 'allowed'
        : filters.result === 'denied'
          ? DENIED_RESULTS
          : undefined,
    eventTypes: HISTORY_EVENT_TYPES,
  };

  const queryParams: AccessLogListQuery = {
    ...conditions,
    page: filters.page,
    limit: filters.limit,
    sort,
  };

  const exportBody: AccessLogExportRequestDto = {
    dateFrom: conditions.dateFrom,
    dateTo: conditions.dateTo,
    storeIds: conditions.storeIds ? [conditions.storeIds] : undefined,
    memberQ: conditions.memberQ,
    authChannels: filters.auth_method ? [filters.auth_method] : undefined,
    results:
      filters.result === 'success'
        ? ['allowed']
        : filters.result === 'denied'
          ? DENIED_RESULTS.split(',')
          : undefined,
    eventTypes: ['entry', 'companion_entry'],
  };

  return {
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    updateFilter,
    clearFilters,
    resetRejectedConditions,
    hasActiveFilters,
    activeDetailFilterCount,
    queryParams,
    /** The effective (validated, JST-today-capped, ≤ 92-day) range the list is fetched with. */
    dateFrom,
    dateTo,
    today,
    isStoreFilterActive,
    isDateRangeChanged,
    exportBody,
    currentPage: filters.page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    pageSize: filters.limit,
    setPageSize: (nextLimit: number) => setFilters({ limit: nextLimit, page: 1 }),
  };
}
