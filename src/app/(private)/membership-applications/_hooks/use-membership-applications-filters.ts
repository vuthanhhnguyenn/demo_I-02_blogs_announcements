'use client';

import { useState } from 'react';

import { useCurrentStore } from '@/contexts/current-store.context';
import { formatISODateLocal } from '@/utils/date.util';
import type { SortingState, Updater } from '@tanstack/react-table';
import { isMatch, subDays } from 'date-fns';
import { parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminApplicationControllerListData } from '@/lib/api-real/types.gen';

import {
  DEFAULT_DATE_RANGE_DAYS,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from '../_constants/constants';
import { searchQuerySchema, textError } from '../_schemas/application-text.schema';
import { toStatusQuery } from '../_utils/application-status.util';
import { toRouteQuery } from '../_utils/enrollment-route.util';

type ListQuery = NonNullable<AdminApplicationControllerListData['query']>;

/** UI sort keys (kept for URL compatibility) → the API's `sort` (integration-plan.md D3). */
const SORT_TO_API: Record<MembershipApplicationsSortBy, NonNullable<ListQuery['sort']>> = {
  id: 'applicationNumber',
  applicant_name: 'memberNameKana',
  status: 'status',
  application_date: 'createdAt',
  usage_start_date: 'usageStartDate',
};

const STATUS_VALUES = [
  'pending',
  'review',
  'approved',
  'auto_approved',
  'rejected',
  'cancelled',
] as const;
const ROUTE_VALUES = ['mobile', 'manual', 'referral'] as const;
const BLACKLIST_VALUES = ['all', 'match', 'no_match'] as const;
const SORT_BY_VALUES = [
  'id',
  'applicant_name',
  'status',
  'application_date',
  'usage_start_date',
] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A hand-edited URL value the API would reject falls back to its default instead of
 * surfacing a 400 / 500 as an empty list (BUG-A-08).
 */
const parseAsIsoDate = {
  parse: (v: string) => (isMatch(v, 'yyyy-MM-dd') ? v : ''),
  serialize: String,
};
const parseAsUuid = {
  parse: (v: string) => (UUID_PATTERN.test(v) ? v : ''),
  serialize: String,
};

export type MembershipApplicationsSortBy = (typeof SORT_BY_VALUES)[number];

export type MembershipApplicationsFilters = {
  page: number;
  limit: number;
  search: string;
  status: (typeof STATUS_VALUES)[number] | '';
  route: (typeof ROUTE_VALUES)[number] | '';
  brand: string;
  store: string;
  blacklist: 'all' | 'match' | 'no_match';
  date_from: string;
  date_to: string;
  sort_by: MembershipApplicationsSortBy | null;
  sort_order: 'asc' | 'desc' | null;
};

export function useMembershipApplicationsFilters() {
  const { currentStoreId } = useCurrentStore();
  const isAllStoresView = currentStoreId === 'all';

  const [filters, setFilters] = useQueryStates(
    {
      page: {
        defaultValue: 1,
        parse: (v) => {
          const n = parseInt(v, 10);
          return Number.isFinite(n) && n >= 1 ? n : 1;
        },
        serialize: String,
      },
      limit: {
        defaultValue: DEFAULT_PAGE_SIZE,
        parse: (v) => {
          const n = parseInt(v, 10);
          return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
        },
        serialize: String,
      },
      search: parseAsString.withDefault(''),
      status: parseAsStringEnum<MembershipApplicationsFilters['status']>([
        ...STATUS_VALUES,
        '' as const,
      ]).withDefault(''),
      route: parseAsStringEnum<MembershipApplicationsFilters['route']>([
        ...ROUTE_VALUES,
        '' as const,
      ]).withDefault(''),
      brand: parseAsStringEnum<string>(['FIT365', 'JOYFIT', '']).withDefault(''),
      store: { ...parseAsUuid, defaultValue: '' },
      blacklist: parseAsStringEnum<'all' | 'match' | 'no_match'>([...BLACKLIST_VALUES]).withDefault(
        'all',
      ),
      date_from: { ...parseAsIsoDate, defaultValue: '' },
      date_to: { ...parseAsIsoDate, defaultValue: '' },
      // No default: an unsorted list (every header neutral) is the 申請日時-newest-first default,
      // so the shared header's 3rd click (クリックで解除) can return to it (Bug No.1).
      sort_by: parseAsStringEnum<MembershipApplicationsSortBy>([...SORT_BY_VALUES]),
      sort_order: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']),
    },
    { history: 'push', shallow: false },
  );

  // Shared with the table so its scroll container can size itself around the
  // filter panel's current height (matches crm-maintenance/app-maintenance's
  // list-section pattern for keeping a sticky header inside a bounded scroller).
  const [showFilters, setShowFilters] = useState(false);

  // The keyword is trimmed when sent (whitespace-only = no search, BUG-A-02) and capped at the
  // API's 60 characters: an over-long keyword shows a field error and is never committed, so
  // the list keeps the last valid search instead of answering 400 (BUG-A-04).
  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.search, (value) => {
    if (textError(searchQuerySchema, value.trim())) return;
    setFilters({ search: value || null, page: 1 });
  });
  const searchError = textError(searchQuerySchema, searchInput.trim());
  const searchQuery = textError(searchQuerySchema, filters.search.trim())
    ? ''
    : filters.search.trim();

  // The 7-day default is applied by the client (FR-007) — absence in the URL
  // means "not touched by the user", not "unbounded" (that distinction drives
  // the active-filter count and the result banner).
  const today = new Date();
  const defaultDateFrom = formatISODateLocal(subDays(today, DEFAULT_DATE_RANGE_DAYS - 1));
  const defaultDateTo = formatISODateLocal(today);
  const isDateRangeChanged = !!filters.date_from || !!filters.date_to;

  function updateFilters(patch: Partial<MembershipApplicationsFilters>) {
    setFilters({ ...patch, page: patch.page ?? 1 } as never);
  }

  function setPage(page: number) {
    setFilters({ page });
  }

  function setPageSize(limit: number) {
    setFilters({ limit, page: 1 });
  }

  const sorting: SortingState = filters.sort_by
    ? [{ id: filters.sort_by, desc: filters.sort_order === 'desc' }]
    : [];

  function setSorting(updater: Updater<SortingState>) {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (next.length === 0) {
      setFilters({ sort_by: null, sort_order: null, page: 1 });
    } else {
      setFilters({
        sort_by: next[0].id as MembershipApplicationsSortBy,
        sort_order: next[0].desc ? 'desc' : 'asc',
        page: 1,
      });
    }
  }

  function clearFilters() {
    setSearchInput('');
    setFilters({
      page: 1,
      search: null,
      status: null,
      route: null,
      brand: null,
      store: null,
      blacklist: null,
      date_from: null,
      date_to: null,
      sort_by: null,
      sort_order: null,
    });
  }

  const activeFilterCount = [
    !!filters.status,
    isAllStoresView && !!filters.brand,
    isAllStoresView && !!filters.store,
    isDateRangeChanged,
    filters.blacklist !== 'all',
    !!filters.route,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0 || !!searchQuery;

  // Brand/store params only apply in the all-stores view — the header store switcher already
  // narrows scope otherwise (FR-015). The API's row scope is enforced server-side either way.
  const storeId = isAllStoresView ? filters.store || undefined : currentStoreId;
  const blacklistFlagged =
    filters.blacklist === 'match' ? true : filters.blacklist === 'no_match' ? false : undefined;

  const queryParams: ListQuery = {
    page: filters.page,
    limit: filters.limit,
    query: searchQuery || undefined,
    ...toStatusQuery(filters.status),
    ...toRouteQuery(filters.route),
    brandGroup:
      isAllStoresView && (filters.brand === 'FIT365' || filters.brand === 'JOYFIT')
        ? filters.brand
        : undefined,
    storeId,
    blacklistFlagged,
    appliedFrom: filters.date_from || defaultDateFrom,
    appliedTo: filters.date_to || defaultDateTo,
    // Unsorted = the default order, 申請日時 newest first (FR-009).
    sort: SORT_TO_API[filters.sort_by ?? 'application_date'],
    order: filters.sort_by ? (filters.sort_order ?? 'asc') : 'desc',
    // Baseline for the result banner's 「全 N 件」 — served as `pagination.totalAllItems`.
    includeTotalAll: true,
    // The KPI cards fetch `kpi` with their own call (page.tsx); the table never asks for it.
    includeKpi: false,
  };

  return {
    showFilters,
    setShowFilters,
    searchInput,
    setSearchInput,
    searchQuery,
    searchError,
    filters,
    setFilters: updateFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    isDateRangeChanged,
    defaultDateFrom,
    defaultDateTo,
    isAllStoresView,
    queryParams,
    currentPage: filters.page,
    setCurrentPage: setPage,
    pageSize: filters.limit,
    setPageSize,
    sorting,
    setSorting,
  };
}
