import {
  TERMS_BRANDS,
  TERMS_DEFAULT_PAGE_SIZE,
  TERMS_STATUSES,
  TERMS_TYPES,
  type TermsBrand,
  type TermsStatus,
  type TermsType,
} from '@/app/(private)/terms/_constants/constants';
import { API_PAGE_SIZE_OPTIONS } from '@/constants/app.constants';
import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import { adminTermsControllerBrandScopeOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { AdminTermsControllerListData } from '@/lib/api-real/types.gen';

import { UserRole } from '@/types/permission.type';

/** `none` = the user cleared the sort, so no `sort` / `order` is sent (distinct from the default). */
const TERMS_SORT_FIELDS = ['createdAt', 'effectiveFrom', 'displayOrder', 'none'] as const;
export type TermsSortField = (typeof TERMS_SORT_FIELDS)[number];

/** View-only roles see their assigned brand group(s) only (US1-8 / FR-006); the server enforces it. */
const BRAND_SCOPED_ROLES = [UserRole.Manager, UserRole.Staff, UserRole.Observer] as const;

export function useTermsFilters() {
  const { hasRole } = useAuthUser();
  const isBrandScoped = hasRole(BRAND_SCOPED_ROLES);
  // The account's brand group(s), resolved server-side by the same scope every terms read uses
  // (API-076 §11.5). Not derived from the store master: observer cannot read it (Y-02).
  // Only one group can be shown as the fixed value; several groups keep 全ブランド (disabled).
  const { data: brandScopeData } = useQuery({
    ...adminTermsControllerBrandScopeOptions(),
    enabled: isBrandScoped,
  });
  const scopedBrands: TermsBrand[] = brandScopeData?.brandGroups ?? [];
  const brandScope = {
    /** The brand select is fixed and disabled for a scoped role. */
    isLocked: isBrandScoped,
    /** The fixed brand group shown in the select; null while unknown or spanning both groups. */
    brand: isBrandScoped && scopedBrands.length === 1 ? scopedBrands[0] : null,
  };

  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(TERMS_DEFAULT_PAGE_SIZE),
      query: parseAsString.withDefault(''),
      termsType: parseAsStringEnum<TermsType>([...TERMS_TYPES]),
      brandEnum: parseAsStringEnum<TermsBrand>([...TERMS_BRANDS]),
      status: parseAsStringEnum<TermsStatus>([...TERMS_STATUSES]),
      includeDeleted: parseAsBoolean.withDefault(false),
      sort: parseAsStringEnum<TermsSortField>([...TERMS_SORT_FIELDS]).withDefault('createdAt'),
      order: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']).withDefault('desc'),
    },
    { history: 'push', shallow: false },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.query, (value) =>
    setFilters({ query: value || null, page: 1 }),
  );

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      limit: TERMS_DEFAULT_PAGE_SIZE,
      query: null,
      brandEnum: null,
      status: null,
      includeDeleted: false,
    });
  };

  // A scoped role's brand comes from the account, never from the URL: a `?brandEnum=` is ignored
  // and the fixed brand is neither an active filter nor in the banner (US1-8).
  const brandEnum = brandScope.isLocked ? null : filters.brandEnum;

  const hasActiveFilters =
    filters.query.length > 0 || brandEnum !== null || filters.status !== null;

  const activeFilterCount = [brandEnum !== null, filters.status !== null].filter(Boolean).length;

  // A bookmarked ?limit=1000 or ?page=0 would be a 400 from the API: fall back to the defaults.
  const limit = (API_PAGE_SIZE_OPTIONS as readonly number[]).includes(filters.limit)
    ? filters.limit
    : TERMS_DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page);

  const queryParams: NonNullable<AdminTermsControllerListData['query']> = {
    page,
    limit,
    query: filters.query || undefined,
    termsType: filters.termsType ?? undefined,
    brandEnum: brandEnum ?? undefined,
    status: filters.status ?? undefined,
    includeDeleted: filters.includeDeleted,
    // Baseline for 「全 N 件中」 (rows of the current termsType tab, filters reset).
    includeTotalAll: true,
    // Newest first by default so a just-created document lands on page 1.
    ...(filters.sort === 'none' ? {} : { sort: filters.sort, order: filters.order }),
  };

  const sorting: SortingState =
    filters.sort === 'none' ? [] : [{ id: filters.sort, desc: filters.order === 'desc' }];

  const setSorting = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (next.length === 0) {
      setFilters({ sort: 'none', order: 'desc', page: 1 });
      return;
    }
    setFilters({
      sort: next[0].id as TermsSortField,
      order: next[0].desc ? 'desc' : 'asc',
      page: 1,
    });
  };

  return {
    sorting,
    setSorting,
    searchInput,
    setSearchInput,
    filters,
    setFilters,
    brandEnum,
    brandScope,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    queryParams,
    currentPage: page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    pageSize: limit,
    setPageSize: (nextLimit: number) => setFilters({ limit: nextLimit, page: 1 }),
  };
}
