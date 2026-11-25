import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminDomainMasterControllerListData } from '@/lib/api-real/types.gen';

import { DOMAIN_DEFAULT_PAGE_SIZE, DOMAIN_PAGE_SIZE_OPTIONS } from '../_constants/domain.constants';

const AUTH_PROVIDER_VALUES = ['google', 'cognito'] as const;
export type DomainAuthProviderFilterValue = (typeof AUTH_PROVIDER_VALUES)[number];
// 列ヘッダーから選べる並べ替えキー。列 id と API の `sort` 値が一致する（`createdAt` は非表示列のため既定値専用）
const DOMAIN_SORT_FIELDS = ['domain', 'name'] as const;
export type DomainSortField = (typeof DOMAIN_SORT_FIELDS)[number];
const DOMAIN_SORT_ORDERS = ['asc', 'desc'] as const;
export type DomainSortOrder = (typeof DOMAIN_SORT_ORDERS)[number];

type DomainListQuery = NonNullable<AdminDomainMasterControllerListData['query']>;

/**
 * URL filter state for the domain list. Search (`search` — partial, case-insensitive against
 * 管理名 and ドメイン), 認証方式 (`authProvider`) and pagination are all applied server-side;
 * `queryParams` is the ready-made query for `adminDomainMasterControllerListOptions`.
 */
export function useDomainFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      query: parseAsString.withDefault(''),
      authProvider: parseAsStringEnum([...AUTH_PROVIDER_VALUES]),
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(DOMAIN_DEFAULT_PAGE_SIZE),
      sort: parseAsStringEnum<DomainSortField>([...DOMAIN_SORT_FIELDS]),
      order: parseAsStringEnum<DomainSortOrder>([...DOMAIN_SORT_ORDERS]),
    },
    { history: 'push', shallow: false },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.query, (value) =>
    setFilters({ query: value || null, page: 1 }),
  );

  const normalizedPageSize = (DOMAIN_PAGE_SIZE_OPTIONS as readonly number[]).includes(filters.limit)
    ? filters.limit
    : DOMAIN_DEFAULT_PAGE_SIZE;

  const queryParams: DomainListQuery = {
    search: filters.query || undefined,
    authProvider: filters.authProvider ?? undefined,
    // FR-M001: 列ヘッダー未指定時は登録日時の新しい順（createdAt は一覧に表示しない列）
    sort: filters.sort ?? 'createdAt',
    order: filters.sort ? (filters.order ?? 'asc') : 'desc',
    page: filters.page,
    limit: normalizedPageSize,
    // 絞り込み前の全件数（FilterResultBanner 用）を同じ 1 リクエストで受け取る
    includeTotalAll: true,
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ query: null, authProvider: null, page: 1 });
  };

  return {
    query: filters.query,
    queryParams,
    searchInput,
    setSearchInput,
    clearFilters,
    currentPage: filters.page,
    setCurrentPage: (page: number) => setFilters({ page }),
    pageSize: normalizedPageSize,
    setPageSize: (limit: number) => setFilters({ limit, page: 1 }),
    sort: filters.sort,
    order: filters.order,
    // 並べ替えで全件の順序が変わるため、ページは 1 に戻す
    setSort: (sort: DomainSortField | null, order: DomainSortOrder | null) =>
      setFilters({ sort, order, page: 1 }),
    authProvider: filters.authProvider,
    setAuthProvider: (value: DomainAuthProviderFilterValue | null) =>
      setFilters({ authProvider: value, page: 1 }),
    hasActiveConditions: filters.query.length > 0 || filters.authProvider != null,
  };
}
