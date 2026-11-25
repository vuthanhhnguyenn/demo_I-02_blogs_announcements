import { useMemo } from 'react';

import { API_PAGE_SIZE_OPTIONS } from '@/constants/app.constants';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import { useFcCompanyLabel } from '@/components/common/data-select-input';

import type { AdminStoreControllerListData } from '@/lib/api-real/types.gen';

import {
  DIRECT_MANAGEMENT_COMPANY_ID,
  STORE_BRAND_LABELS,
  STORE_BRAND_VALUES,
  STORE_FILTER_ALL_LABELS,
  STORE_STATUS_LABELS,
  STORE_STATUS_VALUES,
  type StoreBrandEnum,
  type StoreStatus,
} from '../_constants/constants';
import { STORE_DEFAULT_PAGE_SIZE } from '../_constants/store-list.constant';
import { PREFECTURE_OPTIONS, prefectureLabel } from '../_constants/store-prefecture.constant';
import {
  sanitizeStoreListCompany,
  sanitizeStoreListLimit,
  sanitizeStoreListPage,
  sanitizeStoreListPrefecture,
} from '../_utils/store-list-filters';

type StoreListQuery = NonNullable<AdminStoreControllerListData['query']>;

/** `GET /admin/stores` declares `keyword` maxLength 100 — the input refuses more rather than 400ing */
export const STORE_SEARCH_MAX_LENGTH = 100;

/**
 * Y-02 FR-001: only the club code and the store name are sortable. The keys are the wire's own
 * `sort` values (D7), so the table's column ids double as the request parameter.
 */
export type StoreSortKey = 'clubCode' | 'name';
const STORE_SORT_KEYS: StoreSortKey[] = ['clubCode', 'name'];

export function useStoresFilters() {
  const [rawFilters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(STORE_DEFAULT_PAGE_SIZE),
      search: parseAsString.withDefault(''),
      brand: parseAsStringEnum<StoreBrandEnum>([...STORE_BRAND_VALUES]),
      // A JIS X 0401 numeric prefecture code (`"13"`), the form the master stores (D4)
      prefecture: parseAsString,
      // An FC company id, or `direct` for directly-managed stores
      company: parseAsString,
      // TODO(round3) B1 — the エリア / テリトリー filters are Phase 2 (Y-15). The keys stay parsed
      // so Round 3 is a re-enable, but nothing reads or writes them in Phase 1.
      area_id: parseAsString,
      territory_id: parseAsString,
      status: parseAsStringEnum<StoreStatus>([...STORE_STATUS_VALUES]),
      sort_by: parseAsStringEnum<StoreSortKey>(STORE_SORT_KEYS),
      sort_order: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']).withDefault('asc'),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  // BUG-U1-02: a hand-edited address can carry anything — an invalid page / limit / prefecture /
  // company reads as its default, so it neither reaches the API nor counts as an active filter.
  const filters = {
    ...rawFilters,
    page: sanitizeStoreListPage(rawFilters.page),
    limit: sanitizeStoreListLimit(rawFilters.limit),
    prefecture: sanitizeStoreListPrefecture(rawFilters.prefecture),
    company: sanitizeStoreListCompany(rawFilters.company),
  };

  // TODO(round3) B1 — FR-017b: a territory in the address without its area would break the
  // cascade rule, so the territory is dropped and the list renders unfiltered by territory.
  // const areaId = filters.area_id;
  // const territoryId = areaId ? filters.territory_id : null;

  // A whitespace-only keyword is no keyword: it stays out of the URL, so it neither reaches the
  // API nor shows up as a blank filter chip.
  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.search, (value) =>
    setFilters({ search: value.trim() || null, page: 1 }),
  );

  const prefectureOptions = PREFECTURE_OPTIONS;
  // FR-016: the banner names the company; a URL-restored id is resolved the same way the
  // picker resolves it, so the two share one cached lookup
  const isDirectCompany = filters.company === DIRECT_MANAGEMENT_COMPANY_ID;
  const { label: fcCompanyLabel } = useFcCompanyLabel(isDirectCompany ? null : filters.company);
  const companyLabel = isDirectCompany ? '直営' : fcCompanyLabel;

  const updateFilter = (
    patch: Partial<{
      brand: StoreBrandEnum | null;
      prefecture: string | null;
      company: string | null;
      // TODO(round3) B1 — re-add with the エリア / テリトリー filters
      // area_id: string | null;
      // territory_id: string | null;
      status: StoreStatus | null;
    }>,
  ) => {
    // FR-017: any filter change returns to page 1
    setFilters({ ...patch, page: 1 });
  };

  // TODO(round3) B1 — FR-014: changing the area resets the territory below it in the cascade
  // const selectArea = (nextAreaId: string | null) => {
  //   setFilters({ area_id: nextAreaId, territory_id: null, page: 1 });
  // };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      search: null,
      brand: null,
      prefecture: null,
      company: null,
      area_id: null,
      territory_id: null,
      status: null,
    });
  };

  /** FR-015: how many filters are off their default — the badge on the advanced-filter toggle (the keyword does not count) */
  const activeFilterCount = [
    filters.brand,
    filters.prefecture,
    filters.company,
    // TODO(round3) B1 — a stale `area_id` / `territory_id` in the address must not count as an
    // active filter while no control can clear it
    // areaId,
    // territoryId,
    filters.status,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0 || filters.search.length > 0;

  /** FR-016: the active conditions the banner joins with a middle dot */
  const filterSummary = useMemo(
    () =>
      [
        filters.search ? `"${filters.search}"` : '',
        filters.brand ? STORE_BRAND_LABELS[filters.brand] : '',
        // The URL carries the JIS code, the banner shows the Japanese name (D4)
        prefectureLabel(filters.prefecture),
        companyLabel ?? filters.company ?? '',
        filters.status ? STORE_STATUS_LABELS[filters.status] : '',
      ].filter(Boolean),
    [
      filters.search,
      filters.brand,
      filters.prefecture,
      filters.company,
      filters.status,
      companyLabel,
    ],
  );

  /**
   * The ready-made query for `adminStoreControllerListOptions` (D7).
   *
   * The URL keys keep their own names; the rename to the wire's `keyword` / `brandEnum` /
   * `fcCompanyId` / `sort` / `order` happens here and nowhere else.
   *
   * TODO(round3) B1 — `areaId` / `territoryId` are deliberately absent: the filters are Phase 2
   * and `GET /admin/stores` accepts neither yet.
   */
  const queryParams: StoreListQuery = {
    page: filters.page,
    limit: filters.limit,
    keyword: filters.search || undefined,
    // Bug No.11: the internal store id (S-###) is not shown on this screen (the column is
    // clubCode), so it must not be matched — every S-### holds a `-`, which would otherwise make a
    // `-` keyword match every store. Other store pickers (header / FC dialog / controller) show
    // the code and keep the API default (true).
    keywordIncludeCode: filters.search ? false : undefined,
    brandEnum: filters.brand || undefined,
    prefecture: filters.prefecture || undefined,
    fcCompanyId: filters.company || undefined,
    status: filters.status || undefined,
    // Bug No.4: with no column sort the list is newest-registered first, like the other master
    // screens (Y-01 / Y-03); the header shows no indicator for this default.
    sort: filters.sort_by || 'createdAt',
    order: filters.sort_by ? filters.sort_order : 'desc',
    // FR-016: the "N of all" figure in the banner is the unfiltered in-scope total (D5)
    includeTotalAll: true,
  };

  return {
    searchInput,
    setSearchInput,
    filters,
    setFilters,
    updateFilter,
    // TODO(round3) B1 — selectArea,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
    filterSummary,
    queryParams,
    prefectureOptions,
    allLabels: STORE_FILTER_ALL_LABELS,
    currentPage: filters.page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    // BUG-U1-12: the out-of-range clamp must not leave the bad page in the history
    replaceCurrentPage: (nextPage: number) =>
      setFilters({ page: nextPage }, { history: 'replace' }),
    pageSize: filters.limit,
    // FR-017: a page-size change returns to page 1
    setPageSize: (nextSize: number) => setFilters({ limit: nextSize, page: 1 }),
    pageSizeOptions: API_PAGE_SIZE_OPTIONS,
  };
}
