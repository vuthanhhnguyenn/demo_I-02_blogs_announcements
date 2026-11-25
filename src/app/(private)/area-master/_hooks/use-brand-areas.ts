'use client';

import { useMemo } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import { getNextPageFromPagination, useLoadAllPages } from '@/hooks/use-load-all-pages.hook';

import { adminAreaControllerListInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { AreaListItemDto } from '@/lib/api-real/types.gen';

import { AREA_LIST_PAGE_SIZE, type AreaBrandGroup } from '../_constants/area.constants';

/**
 * Every area of a brand group — the 利用できるエリア checkbox group and the names it resolves. A
 * checkbox group cannot page on scroll, so every page is loaded; the エリア扉's single select pages
 * on scroll instead (`AreaPicker`).
 */
export function useBrandAreas(brandGroup: AreaBrandGroup | null) {
  const query = useInfiniteQuery({
    ...adminAreaControllerListInfiniteOptions({
      query: { brandGroup: brandGroup ?? undefined, limit: AREA_LIST_PAGE_SIZE },
    }),
    initialPageParam: 1,
    getNextPageParam: getNextPageFromPagination,
    enabled: Boolean(brandGroup),
  });
  const isLoadingMore = useLoadAllPages(query);

  const areas = useMemo<AreaListItemDto[]>(
    () => (brandGroup ? (query.data?.pages.flatMap((page) => page.items) ?? []) : []),
    [brandGroup, query.data],
  );

  return {
    areas,
    // Still loading while later pages stream in, so a caller never shows a truncated list.
    isLoading: query.isLoading || isLoadingMore,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
