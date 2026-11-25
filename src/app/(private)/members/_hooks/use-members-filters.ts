import { useState } from 'react';

import { PAGE_SIZE } from '@/constants/app.constants';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import {
  adminPlanControllerDetailOptions,
  adminStoreControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { AdminMemberControllerListData } from '@/lib/api-real/types.gen';

import {
  BRAND_GROUP_FILTER_OPTIONS,
  type BrandGroupFilter,
  JOIN_PERIOD_LABELS,
  LAST_VISIT_LABELS,
  MEMBER_CONTRACT_TYPE_FILTER_OPTIONS,
  MEMBER_LIST_PAGE_SIZE_OPTIONS,
  MEMBER_LIST_SORT_FIELDS,
  MEMBER_STATUS_FILTER_GATE_STOP,
  MEMBER_STATUS_FILTER_OPTIONS,
  type MemberContractTypeFilter,
  type MemberListSortField,
} from '../_constants/constants';
import { joinPeriodToRange, lastVisitToRange } from '../_utils/filter-ranges';

/** Largest page the API serves (`limit` maximum: 100). */
const MAX_LIMIT = MEMBER_LIST_PAGE_SIZE_OPTIONS[MEMBER_LIST_PAGE_SIZE_OPTIONS.length - 1];

export type MembersFilters = {
  page: number;
  limit: number;
  search: string;
  main_contract_id: string[];
  contract_type: MemberContractTypeFilter | null;
  /**
   * One of `MEMBER_STATUS_FILTER_OPTIONS`, not a raw member status: the screen
   * offers 4 grouped options plus ゲートストップ, and each is expanded into the DB
   * statuses (or into `hasGateStop`) when the query is built.
   */
  status_group: string | null;
  brand_group: BrandGroupFilter[];
  store_id: string[];
  join_period: string | null;
  last_visit: string | null;
  promo_code: string | null;
  sort_by: MemberListSortField;
  sort_order: 'asc' | 'desc';
};

export function useMembersFilters() {
  // Header store scope: a specific store selected in the header switcher scopes
  // the whole list to it; only when the header is "全店舗" does the page-local
  // 店舗 filter apply.
  const { currentStoreId, isLoading: isStoreScopeLoading } = useCurrentStore();
  const isAllStoresScope = currentStoreId === ALL_STORES;

  // Use nuqs for URL query parameters
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(PAGE_SIZE),
      search: parseAsString.withDefault(''),
      main_contract_id: parseAsArrayOf(parseAsString).withDefault([]),
      contract_type: parseAsStringEnum<MemberContractTypeFilter>(
        MEMBER_CONTRACT_TYPE_FILTER_OPTIONS.map((option) => option.value),
      ),
      status_group: parseAsStringEnum<string>(
        MEMBER_STATUS_FILTER_OPTIONS.map((option) => option.value),
      ),
      brand_group: parseAsArrayOf(
        parseAsStringEnum<BrandGroupFilter>(
          BRAND_GROUP_FILTER_OPTIONS.map((option) => option.value),
        ),
      ).withDefault([]),
      store_id: parseAsArrayOf(parseAsString).withDefault([]),
      join_period: parseAsStringEnum<string>(Object.keys(JOIN_PERIOD_LABELS)),
      // Enum-parsed rather than free string so a bookmark pointing at a preset the
      // screen does not offer degrades to "all" instead of silently sending no bound
      // while the trigger claims a filter.
      last_visit: parseAsStringEnum<string>(Object.keys(LAST_VISIT_LABELS)),
      promo_code: parseAsString,
      sort_by: parseAsStringEnum<MemberListSortField>([...MEMBER_LIST_SORT_FIELDS]).withDefault(
        'memberNumber',
      ),
      sort_order: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']).withDefault('asc'),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.search, (value) =>
    setFilters({ search: value || null, page: 1 }),
  );

  const [storeFilterPick, setStoreFilterPick] = useState<{ id: string; name: string } | null>(null);
  const [contractFilterPick, setContractFilterPick] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const updateFilter = <K extends keyof MembersFilters>(key: K, value: MembersFilters[K]) => {
    const pageReset = { page: 1 } as const;
    if (key === 'main_contract_id' || key === 'brand_group' || key === 'store_id') {
      const arrValue = value as string[];
      setFilters({
        [key]: arrValue.length > 0 ? arrValue : null,
        ...pageReset,
      } as Parameters<typeof setFilters>[0]);
    } else if (
      key === 'status_group' ||
      key === 'contract_type' ||
      key === 'join_period' ||
      key === 'last_visit' ||
      key === 'promo_code'
    ) {
      setFilters({ [key]: value ?? null, ...pageReset } as Parameters<typeof setFilters>[0]);
    } else {
      setFilters({ [key]: value, ...pageReset } as Parameters<typeof setFilters>[0]);
    }
  };

  // Pick a store/contract filter and remember its name in one step, so the label
  // is available immediately without a by-id round-trip.
  const selectStoreFilter = (store: { id: string; name: string } | null) => {
    setStoreFilterPick(store ? { id: store.id, name: store.name } : null);
    updateFilter('store_id', store ? [store.id] : []);
  };
  const selectContractFilter = (contract: { id: string; name: string } | null) => {
    setContractFilterPick(contract ? { id: contract.id, name: contract.name } : null);
    updateFilter('main_contract_id', contract ? [contract.id] : []);
  };
  // The プロモコード filter travels as the promotion code STRING itself (G-06 FR-011), so
  // there is no id to remember and no name to resolve — the code is both value and label.
  const selectPromoCodeFilter = (code: string | null) => {
    updateFilter('promo_code', code);
  };

  const clearFilters = () => {
    setSearchInput('');
    setStoreFilterPick(null);
    setContractFilterPick(null);
    setFilters({
      page: 1,
      search: null,
      main_contract_id: null,
      contract_type: null,
      status_group: null,
      brand_group: null,
      store_id: null,
      join_period: null,
      last_visit: null,
      promo_code: null,
      sort_by: 'memberNumber',
      sort_order: 'asc',
    });
  };

  const hasActiveFilters: boolean =
    filters.main_contract_id.length > 0 ||
    filters.contract_type !== null ||
    filters.status_group !== null ||
    filters.brand_group.length > 0 ||
    (isAllStoresScope && filters.store_id.length > 0) ||
    filters.join_period !== null ||
    filters.last_visit !== null ||
    filters.promo_code !== null ||
    filters.search.length > 0;

  // A specific header store wins; when the header is "全店舗" the page-local
  // store filter (if any) takes over.
  const effectiveStoreId = isAllStoresScope ? (filters.store_id[0] ?? undefined) : currentStoreId;

  // Single source of truth for the active filter labels (trigger + banner).
  // The by-id lookup runs ONLY on deep-link/refresh — when an id is in the URL
  // but we never captured its name via selectStoreFilter/selectContractFilter.
  const storeFilterId = filters.store_id[0] ?? null;
  // Use the remembered name only when it matches the current filter id.
  const storeNameFromPick = storeFilterPick?.id === storeFilterId ? storeFilterPick.name : null;
  const { data: storeByIdRes } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: storeFilterId ?? '' } }),
    enabled: isAllStoresScope && !!storeFilterId && !storeNameFromPick,
    // A label lookup must stay silent: an id that no longer resolves (stale bookmark)
    // falls back to rendering the raw id, so a global error toast would be noise.
    meta: { suppressErrorToast: true },
  });
  const storeFilterLabel = storeFilterId
    ? (storeNameFromPick ?? storeByIdRes?.name ?? storeFilterId)
    : null;

  const contractFilterId = filters.main_contract_id[0] ?? null;
  const contractNameFromPick =
    contractFilterPick?.id === contractFilterId ? contractFilterPick.name : null;
  const { data: contractByIdRes } = useQuery({
    ...adminPlanControllerDetailOptions({ path: { planId: contractFilterId ?? '' } }),
    enabled: !!contractFilterId && !contractNameFromPick,
    meta: { suppressErrorToast: true },
  });
  const contractFilterLabel = contractFilterId
    ? (contractNameFromPick ?? contractByIdRes?.name ?? contractFilterId)
    : null;

  // プロモコード filters on the promotion code a member consumed at enrollment
  // (G-06 FR-011 → `promotion_code_uses.promotion_codes.code`), NOT on the campaign code:
  // one campaign issues many codes, so the two are different values. Unlike the store and
  // plan pickers above there is nothing to resolve on deep-link — the code shown on the
  // trigger and in the result banner is the very string that goes on the wire.
  const promoCodeLabel = filters.promo_code;

  // ゲートストップ is not a status: it sends `hasGateStop` and no `memberStatus`, so it
  // matches gate-stopped members whatever their own status is. Every other option
  // fans out to the DB statuses it groups, which the API takes as a comma-separated
  // list (the 8 values are spelled identically on both sides).
  const selectedStatusGroup = MEMBER_STATUS_FILTER_OPTIONS.find(
    (option) => option.value === filters.status_group,
  );
  const isGateStopFilter = filters.status_group === MEMBER_STATUS_FILTER_GATE_STOP;

  const queryParams: NonNullable<AdminMemberControllerListData['query']> = {
    page: filters.page,
    // A bookmark can carry any integer; the API rejects anything above 100.
    limit: Math.min(Math.max(filters.limit, 1), MAX_LIMIT),
    query: filters.search || undefined,
    planId: filters.main_contract_id[0] ?? undefined,
    contractType: filters.contract_type ?? undefined,
    memberStatus: selectedStatusGroup?.statuses.length
      ? selectedStatusGroup.statuses.join(',')
      : undefined,
    hasGateStop: isGateStopFilter ? true : undefined,
    brandGroup: filters.brand_group[0] ?? undefined,
    storeId: effectiveStoreId || undefined,
    ...joinPeriodToRange(filters.join_period),
    ...lastVisitToRange(filters.last_visit),
    promoCode: filters.promo_code ?? undefined,
    sort: filters.sort_by,
    order: filters.sort_order,
    // Unfiltered in-scope total behind the 「全 N 件中 M 件を抽出中」 banner, returned as
    // `pagination.totalAllItems` on this very call. It costs the server an extra COUNT,
    // so it is asked for only while a filter is active — the only time the banner shows.
    includeTotalAll: hasActiveFilters || undefined,
  };

  return {
    // Search input (local state for debouncing)
    searchInput,
    setSearchInput,
    // Filters from URL
    filters,
    // Update functions
    updateFilter,
    setFilters,
    clearFilters,
    // Computed
    hasActiveFilters,
    queryParams,
    pageSizeOptions: MEMBER_LIST_PAGE_SIZE_OPTIONS,
    // Header store scope (drives whether the page-local 店舗 filter is shown)
    isAllStoresScope,
    // The scope is not settled yet: a query sent now could carry a fallback store.
    isStoreScopeLoading,
    selectStoreFilter,
    selectContractFilter,
    storeFilterLabel,
    contractFilterLabel,
    selectPromoCodeFilter,
    promoCodeLabel,
    currentPage: filters.page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    // The clamped value, so the footer's rows-per-page select agrees with what was sent
    pageSize: queryParams.limit ?? filters.limit,
    setPageSize: (nextSize: number) => setFilters({ limit: nextSize, page: 1 }),
  };
}
