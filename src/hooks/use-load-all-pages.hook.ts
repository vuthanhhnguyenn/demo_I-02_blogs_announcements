'use client';

import { useEffect } from 'react';

type PaginatedResponse = { pagination: { page: number; totalPages: number } };

/** `getNextPageParam` for list endpoints that return `pagination.{ page, totalPages }`. */
export function getNextPageFromPagination(lastPage: PaginatedResponse) {
  const { page, totalPages } = lastPage.pagination;
  return page < totalPages ? page + 1 : undefined;
}

type InfinitePaging = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => Promise<unknown>;
};

/**
 * Chains page requests on an infinite query until the last page is loaded, for lists that must
 * never be truncated at the API's page cap (option lists, master tables). Stops on a failed page:
 * `hasNextPage` stays true after the failure, so without the error check it would re-request the
 * page in a tight loop. Returns whether more pages are still on their way.
 */
export function useLoadAllPages({
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  fetchNextPage,
}: InfinitePaging) {
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  return hasNextPage && !isFetchNextPageError;
}
