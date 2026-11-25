import { useEffect, useMemo } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import { adminOptionControllerListInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionListItemDto, OptionListResponseDto } from '@/lib/api-real/types.gen';

import { TARGET_OPTION_CANDIDATES_QUERY } from '../_constants/constants';

/**
 * Loads EVERY page of the 対象オプション candidates. The picker is a checkbox group, not a
 * searchable select, so a partial list would silently hide options — pages are chained until
 * `page === totalPages`.
 */
export function useTargetOptionCandidates() {
  const {
    data,
    isLoading,
    isError,
    isFetchNextPageError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    ...adminOptionControllerListInfiniteOptions({ query: TARGET_OPTION_CANDIDATES_QUERY }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: OptionListResponseDto) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  // Stops on a failed page: `hasNextPage` stays true after the failure, so without the error check
  // this would re-request the page in a tight loop. `refetch` clears the error and resumes.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const items = useMemo<OptionListItemDto[]>(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  return {
    items,
    // Still "loading" while later pages stream in, so the form never shows a truncated list —
    // but not once a page failed, so the caller can show the error instead.
    isLoading: isLoading || (Boolean(hasNextPage) && !isError),
    isError,
    isReady: Boolean(data) && !hasNextPage,
    refetch,
  };
}
