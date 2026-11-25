import { useEffect, useState } from 'react';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { formatISODateLocal, jstToday } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { addMonths, endOfMonth, endOfYear, startOfMonth, startOfYear } from 'date-fns';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import {
  adminMemberControllerDetailOptions,
  adminStoreControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { AdminSuspensionWithdrawalControllerListData } from '@/lib/api-real/types.gen';

import { BRAND_GROUP_FILTER_OPTIONS, type BrandGroupFilter } from '../../_constants/constants';
import {
  LEAVE_PAGE_SIZE_OPTIONS,
  LEAVE_VIEW_MODES,
  LIST_LEAVE_STATUSES,
  type LeaveListStatus,
  type LeaveType,
  type LeaveViewMode,
  MONTHLY_SCOPES,
  type MonthlyScope,
} from '../_constants/constants';

type LeavesListQuery = NonNullable<AdminSuspensionWithdrawalControllerListData['query']>;

/**
 * FR-025 — the four presets the screen offers. `all` is the absence of a bound, so it is
 * represented by a null filter value rather than an option of its own.
 */
export type ScheduledPeriod = 'current_month' | 'next_month' | 'current_year';

export type LeavesFilters = {
  page: number;
  page_size: number;
  type: LeaveType | null;
  status: LeaveListStatus | null;
  brand: BrandGroupFilter | null;
  store_id: string | null;
  /** Set by the A-01-01 drill-down; there is no in-screen control for it. */
  member_id: string | null;
  scheduled_period: ScheduledPeriod | null;
  /** A-03 FR-001 (v3) — 一覧 / 月別ビュー. */
  view: LeaveViewMode;
  /** 月別ビュー only — 表示: 全て / 休会のみ. */
  monthly_scope: MonthlyScope;
};

const SCHEDULED_PERIODS: ScheduledPeriod[] = ['current_month', 'next_month', 'current_year'];

function resolveScheduledRange(
  period: ScheduledPeriod | null,
): Pick<LeavesListQuery, 'scheduledFrom' | 'scheduledTo'> {
  if (!period) return {};

  // The preset is a JST calendar range, whatever timezone the browser runs in.
  const now = jstToday();
  const anchor = period === 'next_month' ? addMonths(now, 1) : now;
  const [from, to] =
    period === 'current_year'
      ? [startOfYear(now), endOfYear(now)]
      : [startOfMonth(anchor), endOfMonth(anchor)];

  return {
    scheduledFrom: formatISODateLocal(from),
    scheduledTo: formatISODateLocal(to),
  };
}

/** ブランド is the brand group (JOYFIT / FIT365), as agreed in qa-155 ④. */
const BRAND_VALUES = BRAND_GROUP_FILTER_OPTIONS.map((o) => o.value);

export function useLeavesFilters() {
  const { currentStoreId, restrictedStores, canSelectAllStores } = useCurrentStore();

  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      page_size: parseAsInteger.withDefault(LEAVE_PAGE_SIZE_OPTIONS[0]),
      type: parseAsStringEnum<LeaveType>(['suspension', 'withdrawal']),
      status: parseAsStringEnum<LeaveListStatus>([...LIST_LEAVE_STATUSES]),
      brand: parseAsStringEnum<BrandGroupFilter>(BRAND_VALUES),
      store_id: parseAsString,
      member_id: parseAsString,
      scheduled_period: parseAsStringEnum<ScheduledPeriod>(SCHEDULED_PERIODS),
      view: parseAsStringEnum<LeaveViewMode>([...LEAVE_VIEW_MODES]).withDefault('list'),
      monthly_scope: parseAsStringEnum<MonthlyScope>([...MONTHLY_SCOPES]).withDefault('all'),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const [storeFilterPick, setStoreFilterPick] = useState<{ id: string; name: string } | null>(null);

  /**
   * FR-004 — the header store scope always wins. When it narrows to a single store the
   * in-screen 店舗 filter is hidden, so a stale value must not keep narrowing the result.
   */
  const isSingleStoreScope = currentStoreId !== ALL_STORES;
  useEffect(() => {
    if (isSingleStoreScope && filters.store_id !== null) {
      setFilters({ store_id: null, page: 1 });
    }
  }, [isSingleStoreScope, filters.store_id, setFilters]);

  /** FR-005 — the in-screen store filter only makes sense across two or more stores. */
  const showStoreFilter =
    !isSingleStoreScope && (canSelectAllStores || restrictedStores.length >= 2);

  const updateFilter = <K extends keyof LeavesFilters>(key: K, value: LeavesFilters[K]) => {
    setFilters({ [key]: value ?? null, page: 1 } as Parameters<typeof setFilters>[0]);
  };

  /**
   * Picking a store remembers its name in the same step, so the trigger and the banner
   * have a label without a by-id round-trip. The lookup below only runs on a deep link.
   */
  const selectStoreFilter = (store: { id: string; name: string } | null) => {
    setStoreFilterPick(store);
    updateFilter('store_id', store?.id ?? null);
  };

  const storeNameFromPick =
    storeFilterPick?.id === filters.store_id ? (storeFilterPick?.name ?? null) : null;
  const { data: storeByIdRes } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: filters.store_id ?? '' } }),
    enabled: !!filters.store_id && !storeNameFromPick,
  });
  const storeFilterLabel = filters.store_id
    ? (storeNameFromPick ?? storeByIdRes?.name ?? filters.store_id)
    : null;

  /** FR-027 — the drill-down member is named in the banner, so its name is looked up by id. */
  const { data: memberByIdRes } = useQuery({
    ...adminMemberControllerDetailOptions({ path: { memberId: filters.member_id ?? '' } }),
    enabled: !!filters.member_id,
  });
  const memberFilterLabel = filters.member_id
    ? [memberByIdRes?.personalInfo.lastName, memberByIdRes?.personalInfo.firstName]
        .filter(Boolean)
        .join(' ') || filters.member_id
    : null;

  const isMonthlyView = filters.view === 'monthly';

  const clearFilters = () => {
    setStoreFilterPick(null);
    setFilters({
      page: 1,
      type: null,
      status: null,
      brand: null,
      store_id: null,
      member_id: null,
      scheduled_period: null,
      monthly_scope: null,
    });
  };

  /** The 表示 filter lives inside 詳細フィルター but only applies to 月別ビュー. */
  const isMonthlySuspensionOnly = isMonthlyView && filters.monthly_scope === 'suspension_only';

  /**
   * FR-026 — the header scope is deliberately excluded from the count. `member_id` is too:
   * the badge counts the controls inside 詳細フィルター, and the member filter has none.
   */
  const activeFilterCount =
    [
      filters.type,
      filters.status,
      filters.brand,
      filters.scheduled_period,
      showStoreFilter ? filters.store_id : null,
    ].filter(Boolean).length + (isMonthlySuspensionOnly ? 1 : 0);

  // The member drill-down has no control, but it narrows the result, so the banner must show it.
  const hasActiveFilters: boolean = activeFilterCount > 0 || !!filters.member_id;

  /**
   * Everything except pagination — shared by the 一覧 page request and the 月別ビュー,
   * which needs the whole filtered set (see `useLeavesMonthly`).
   */
  const filterParams: Omit<LeavesListQuery, 'page' | 'limit'> = {
    applicationType: filters.type ?? undefined,
    displayStatus: filters.status ?? undefined,
    brandGroup: filters.brand ?? undefined,
    memberId: filters.member_id ?? undefined,
    /**
     * FR-004 — the header scope must actually narrow the request, not merely hide controls.
     * The role scope alone is not enough: a Manager's scope spans every managed store, so
     * without this the 店舗名 column would be hidden over rows from several stores. A single
     * store scope hides the in-screen 店舗 filter, so both share the one `storeId` param.
     */
    storeId: isSingleStoreScope
      ? currentStoreId
      : ((showStoreFilter ? filters.store_id : null) ?? undefined),
    // FR-025a — the preset lives in the URL; the request carries the range it resolves to.
    ...resolveScheduledRange(filters.scheduled_period),
    // FR-035a — ordering is fixed server-side (scheduledDate asc); V0 offers no sort
    // control, so `sort` / `order` are deliberately never sent (Q-13).
  };

  const queryParams: LeavesListQuery = {
    ...filterParams,
    page: filters.page,
    limit: filters.page_size,
    // FR-027 — the banner's 全N件 denominator.
    includeTotalAll: true,
  };

  return {
    filters,
    setFilters,
    updateFilter,
    selectStoreFilter,
    storeFilterLabel,
    memberFilterLabel,
    filterParams,
    queryParams,
    currentPage: filters.page,
    setCurrentPage: (page: number) => setFilters({ page }),
    pageSize: filters.page_size,
    setPageSize: (size: number) => setFilters({ page_size: size, page: 1 }),
    showStoreFilter,
    isMonthlyView,
    isMonthlySuspensionOnly,
    setView: (view: LeaveViewMode) => setFilters({ view }),
    setMonthlyScope: (scope: MonthlyScope) =>
      setFilters({ monthly_scope: scope === 'all' ? null : scope }),
    activeFilterCount,
    hasActiveFilters,
    clearFilters,
  };
}
