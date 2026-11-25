'use client';

import type { AreaBrandGroup } from '@/app/(private)/area-master/_constants/area.constants';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getNextPageFromPagination } from '@/hooks/use-load-all-pages.hook';

import {
  adminAreaControllerDetailOptions,
  adminAreaControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

const AREA_PAGE_SIZE = 25;

/**
 * The brand group's areas, searched on the server and read page by page. `AreaPicker` and
 * {@link useBrandHasAreas} share the unsearched pages, so the emptiness check costs no request.
 */
export function brandAreaPagesOptions(
  brandGroup: AreaBrandGroup | null,
  keyword: string | undefined,
) {
  return {
    ...adminAreaControllerListInfiniteOptions({
      query: { brandGroup: brandGroup ?? undefined, keyword, limit: AREA_PAGE_SIZE },
    }),
    initialPageParam: 1,
    getNextPageParam: getNextPageFromPagination,
  };
}

/**
 * Whether the brand group has any area: with none, the エリア扉 disables its picker and says so
 * (prototype 11/12). `null` while unknown — no brand yet, still loading, or the read failed.
 */
export function useBrandHasAreas(brandGroup: AreaBrandGroup | null): boolean | null {
  const { data } = useInfiniteQuery({
    ...brandAreaPagesOptions(brandGroup, undefined),
    enabled: Boolean(brandGroup),
  });
  const firstPage = brandGroup ? data?.pages[0] : undefined;
  return firstPage ? firstPage.items.length > 0 : null;
}

/**
 * The area of `areaId` read on its own — it need not be on the pages loaded so far (an エリア扉 being
 * edited before the dropdown was ever opened). A deleted area does not retry.
 */
export function useAreaById(areaId: string | null, options?: { enabled?: boolean }) {
  const enabled = (options?.enabled ?? true) && Boolean(areaId);
  const { data, isFetching } = useQuery({
    ...adminAreaControllerDetailOptions({ path: { areaId: areaId ?? '' } }),
    enabled,
    retry: false,
  });
  return { area: areaId ? data : undefined, isLoading: enabled && isFetching };
}
