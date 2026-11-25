import { useCallback } from 'react';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { isISODateString } from '@/utils/date.util';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import {
  NOTICE_BRAND_CODES,
  NOTICE_BRAND_SCOPES,
  NOTICE_CHANNELS,
  NOTICE_DEFAULT_ORDER,
  NOTICE_DEFAULT_PAGE_SIZE,
  NOTICE_DEFAULT_SORT,
  NOTICE_DISPLAY_STATUSES,
  NOTICE_PAGE_SIZES,
} from '../_constants/notice.constants';
import type {
  NoticeBrandCode,
  NoticeBrandScope,
  NoticeChannel,
  NoticeDisplayStatus,
  NoticeQuery,
  NoticeSortKey,
  NoticeType,
} from '../_types/notice.type';

const PAGE_SIZE_VALUES: readonly number[] = NOTICE_PAGE_SIZES;

/** Filter keys `updateFilter` accepts (everything but paging / sort / search). */
export type NoticeFilterKey =
  | 'categoryId'
  | 'brandCode'
  | 'brandScope'
  | 'storeId'
  | 'channel'
  | 'publishStatus'
  | 'publishFrom'
  | 'publishTo'
  | 'publishEndFrom'
  | 'publishEndTo';

export interface NoticeFiltersConfig {
  /** Article type sent with every list request. */
  type: NoticeType;
  /** Sortable columns of the screen (URL values outside this list are ignored). */
  sortKeys: readonly NoticeSortKey[];
  /** お知らせ: 掲載終了日 range filter (specs/announcement-list FR-010, gap AL-01). */
  withPublishEndRange?: boolean;
}

/**
 * URL filter state of the I-02 article lists (ブログ / お知らせ), specs/announcement-list research R1.
 * One instance per page; the filter panel receives it as a prop.
 */
export function useNoticeFilters({
  type,
  sortKeys,
  withPublishEndRange = false,
}: NoticeFiltersConfig) {
  const { currentStoreId } = useCurrentStore();

  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(NOTICE_DEFAULT_PAGE_SIZE),
      q: parseAsString.withDefault(''),
      categoryId: parseAsString,
      brandCode: parseAsStringEnum<NoticeBrandCode>([...NOTICE_BRAND_CODES]),
      brandScope: parseAsStringEnum<NoticeBrandScope>([...NOTICE_BRAND_SCOPES]),
      storeId: parseAsString,
      channel: parseAsStringEnum<NoticeChannel>([...NOTICE_CHANNELS]),
      publishStatus: parseAsStringEnum<NoticeDisplayStatus>([...NOTICE_DISPLAY_STATUSES]),
      /** `YYYY-MM-DD` (JST), as the list's `publishFrom` / `publishTo` expect. */
      publishFrom: parseAsString,
      publishTo: parseAsString,
      /** `YYYY-MM-DD` (JST); only read when `withPublishEndRange`. */
      publishEndFrom: parseAsString,
      publishEndTo: parseAsString,
      // No default in the URL: null = the user has not sorted, so the headers stay neutral
      // (PAR022) while the request still applies the default order (FR-012, research R8).
      sort: parseAsStringEnum<NoticeSortKey>([...sortKeys]),
      order: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']).withDefault('asc'),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  // Typing resets to page 1 (PAR005).
  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.q, (value) =>
    setFilters({ q: value.trim() || null, page: 1 }),
  );
  const searchTerm = filters.q.trim();

  // prototype L222-L227: the header store selector is the view scope; the in-panel 店舗 filter
  // only exists (and only counts) under 全店舗.
  const isAllStoresScope = currentStoreId === ALL_STORES;
  const showStoreFilter = isAllStoresScope;
  const headerStoreId = isAllStoresScope ? undefined : currentStoreId;
  const effectiveStoreId = headerStoreId ?? filters.storeId ?? undefined;

  // A hand-edited URL may carry a non-date; never send it.
  const validDate = (value: string | null) => (isISODateString(value) ? value : null);
  const publishFrom = validDate(filters.publishFrom);
  const publishTo = validDate(filters.publishTo);
  const publishEndFrom = withPublishEndRange ? validDate(filters.publishEndFrom) : null;
  const publishEndTo = withPublishEndRange ? validDate(filters.publishEndTo) : null;

  // Every filter change resets to page 1 (PAR018).
  const updateFilter = <K extends NoticeFilterKey>(key: K, value: NoticeQuery[K] | null) => {
    setFilters({ [key]: value ?? null, page: 1 } as Parameters<typeof setFilters>[0]);
  };

  // prototype clearAllFilters: search + every filter + page. Sort and page size stay.
  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      q: null,
      categoryId: null,
      brandCode: null,
      brandScope: null,
      storeId: null,
      channel: null,
      publishStatus: null,
      publishFrom: null,
      publishTo: null,
      publishEndFrom: null,
      publishEndTo: null,
    });
  };

  // prototype activeFilterCount (PAR008): store counts only under the 全店舗 header scope;
  // each date bound counts on its own.
  const activeDetailFilterCount = [
    filters.categoryId !== null,
    filters.brandCode !== null,
    filters.channel !== null,
    filters.publishStatus !== null,
    filters.brandScope !== null,
    showStoreFilter && filters.storeId !== null,
    publishFrom !== null,
    publishTo !== null,
    publishEndFrom !== null,
    publishEndTo !== null,
  ].filter(Boolean).length;

  const hasActiveFilters = searchTerm.length > 0 || activeDetailFilterCount > 0;

  const handleSort = (key: NoticeSortKey) => {
    // prototype handleSort: first click ascending, then toggle; back to page 1.
    if (filters.sort === key) {
      setFilters({ order: filters.order === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      setFilters({ sort: key, order: 'asc', page: 1 });
    }
  };

  // Stable identities so pages can keep them in effect dependency lists.
  const setCurrentPage = useCallback((page: number) => setFilters({ page }), [setFilters]);
  const setPageSize = useCallback((limit: number) => setFilters({ limit, page: 1 }), [setFilters]);

  const pageSize = PAGE_SIZE_VALUES.includes(filters.limit)
    ? filters.limit
    : NOTICE_DEFAULT_PAGE_SIZE;

  const queryParams: NoticeQuery = {
    type,
    page: filters.page,
    limit: pageSize,
    q: searchTerm || undefined,
    categoryId: filters.categoryId ?? undefined,
    brandCode: filters.brandCode ?? undefined,
    brandScope: filters.brandScope ?? undefined,
    // Header store wins; the in-panel 店舗 applies only under 全店舗 (PAR054, research R4).
    storeId: effectiveStoreId,
    channel: filters.channel ?? undefined,
    publishStatus: filters.publishStatus ?? undefined,
    publishFrom: publishFrom ?? undefined,
    publishTo: publishTo ?? undefined,
    ...(withPublishEndRange && {
      publishEndFrom: publishEndFrom ?? undefined,
      publishEndTo: publishEndTo ?? undefined,
    }),
    sort: filters.sort ?? NOTICE_DEFAULT_SORT,
    order: filters.sort ? filters.order : NOTICE_DEFAULT_ORDER,
  };

  /** Only `type` + header store: the scope behind the header count (`totalAllItems`, gap B-11). */
  const scopeQueryParams: NoticeQuery = {
    type,
    storeId: headerStoreId,
  };

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    searchInput,
    setSearchInput,
    hasActiveFilters,
    activeDetailFilterCount,
    queryParams,
    scopeQueryParams,
    showStoreFilter,
    currentPage: filters.page,
    setCurrentPage,
    pageSize,
    setPageSize,
    /** Explicit sort column from the URL; null while the default order applies. */
    sort: filters.sort,
    order: filters.order,
    isExplicitSort: filters.sort !== null,
    handleSort,
  };
}

export type NoticeFiltersHook = ReturnType<typeof useNoticeFilters>;
