'use client';

/**
 * Dormant since Round 1 of the real-API integration.
 *
 * The managed brands are a fixed pair (Y-07 FR-001「表示対象ブランド: JOYFIT / FIT365」) and
 * `GET /api/v1/admin/brands` takes no query parameters, so the list screen renders both rows with
 * no search box and no pagination footer — this hook has no caller. Kept on disk next to the
 * commented-out markup in `page.tsx` so both can be revived together if the brand master ever grows
 * (Y-07「将来的なブランド追加はシステム設定カテゴリー内で扱う」).
 */
import { useCallback } from 'react';

import { PAGE_SIZE } from '@/constants/app.constants';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { BrandListItemDto } from '@/lib/api-real/types.gen';

export function useBrandsFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(PAGE_SIZE),
      search: parseAsString.withDefault(''),
    },
    {
      history: 'push',
      shallow: true,
    },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.search, (value) =>
    setFilters({ search: value || null, page: 1 }),
  );

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      limit: PAGE_SIZE,
      search: null,
    });
  };

  /**
   * `GET /api/v1/admin/brands` accepts no query parameters and always returns exactly two rows
   * (JOYFIT / FIT365) — a count fixed by the data model, not a scale assumption. Search and paging
   * therefore run client-side over the full response; no server-side filtering is needed or asked
   * for (integration-plan D4).
   */
  const matchesSearch = useCallback(
    (brand: BrandListItemDto): boolean => {
      const keyword = filters.search.trim().toLowerCase();
      if (!keyword) return true;

      return (
        brand.displayName.toLowerCase().includes(keyword) ||
        brand.brandGroup.toLowerCase().includes(keyword)
      );
    },
    [filters.search],
  );

  const paginate = useCallback(
    (brands: BrandListItemDto[]): BrandListItemDto[] => {
      const start = (filters.page - 1) * filters.limit;
      return brands.slice(start, start + filters.limit);
    },
    [filters.page, filters.limit],
  );

  return {
    searchInput,
    setSearchInput,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters: filters.search.length > 0,
    matchesSearch,
    paginate,
    currentPage: filters.page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    pageSize: filters.limit,
    setPageSize: (nextLimit: number) => setFilters({ limit: nextLimit, page: 1 }),
  };
}
