import { PAGE_SIZE } from '@/constants/app.constants';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminMemberControllerListBlacklistData } from '@/lib/api-real/types.gen';

import {
  BLACKLIST_PAGE_SIZE_OPTIONS,
  type BlacklistSource,
  UNPAID_FILTER_VALUES,
  type UnpaidFilter,
} from '../_constants/blacklist.constants';

export type BlacklistFilters = {
  page: number;
  page_size: number;
  search: string;
  /** The registration-path axis (強制退会 / 手動登録), not the reason axis. */
  source: BlacklistSource | null;
  unpaid: UnpaidFilter | null;
};

export function useBlacklistFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      page_size: parseAsInteger.withDefault(PAGE_SIZE),
      search: parseAsString.withDefault(''),
      source: parseAsStringEnum<BlacklistSource>(['forced_withdrawal', 'manual']),
      unpaid: parseAsStringEnum<UnpaidFilter>([...UNPAID_FILTER_VALUES]),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(
    filters.search,
    (value) => setFilters({ search: value || null, page: 1 }),
    // Whitespace-only input is an empty search, as in GitHub / Google / Jira; the server
    // rejects a blank `query` with 400.
    { normalize: (value) => value.trim() },
  );

  const updateFilter = <K extends keyof BlacklistFilters>(key: K, value: BlacklistFilters[K]) => {
    setFilters({ [key]: value ?? null, page: 1 } as Parameters<typeof setFilters>[0]);
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ page: 1, search: null, source: null, unpaid: null });
  };

  /** FR-020 — drives the active highlight on each trigger; the search box is not a filter. */
  const activeFilterCount = [filters.source, filters.unpaid].filter(Boolean).length;

  const hasActiveFilters: boolean = activeFilterCount > 0 || filters.search.length > 0;

  const queryParams: NonNullable<AdminMemberControllerListBlacklistData['query']> = {
    page: filters.page,
    limit: filters.page_size,
    query: filters.search || undefined,
    source: filters.source ?? undefined,
    hasUnpaid: filters.unpaid ? filters.unpaid === 'has_unpaid' : undefined,
    /**
     * FR-025 — the banner's denominator. Requested only because this screen renders the
     * 「全 N 件中 M 件を抽出中」 banner; the server skips the extra count otherwise.
     */
    includeTotalAll: true,
    /**
     * FR-033 / spec Q-07 — `isActive` is deliberately never sent. It defaults to `true`
     * server-side, and no screen control changes it: released entries are reachable only
     * by their own URL, never by listing them.
     */
  };

  return {
    filters,
    setFilters,
    updateFilter,
    searchInput,
    setSearchInput,
    queryParams,
    currentPage: filters.page,
    setCurrentPage: (page: number) => setFilters({ page }),
    pageSize: filters.page_size,
    setPageSize: (size: number) => setFilters({ page_size: size, page: 1 }),
    pageSizeOptions: BLACKLIST_PAGE_SIZE_OPTIONS,
    activeFilterCount,
    hasActiveFilters,
    clearFilters,
  };
}
