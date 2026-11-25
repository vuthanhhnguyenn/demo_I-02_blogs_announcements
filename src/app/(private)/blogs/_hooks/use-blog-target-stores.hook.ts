'use client';
// Client hook: reads the auth / current-store contexts and runs an infinite React Query.
import { useMemo } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useCurrentStore } from '@/contexts/current-store.context';
import { useInfiniteQuery } from '@tanstack/react-query';

import { getNextPageFromPagination, useLoadAllPages } from '@/hooks/use-load-all-pages.hook';

import { adminStoreControllerListInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import type { BlogFormStore } from '../_schemas/blog-form.schema';

// The store master's max page size — fewest round trips while loading every store.
const STORE_PAGE_SIZE = 100;

/**
 * Stores the user may target with 店舗指定 (FR-010, research F3): the whole store master for
 * Headquarter / System, otherwise the header store sources (Manager's managed stores, Staff's
 * own store) already loaded by `CurrentStoreProvider`.
 */
export function useBlogTargetStores() {
  const {
    restrictedStores,
    canSelectAllStores,
    isLoading: isRestrictedLoading,
  } = useCurrentStore();
  const { user } = useAuthUser();
  // `restrictedStores` falls back to the unfiltered first page when /crm/me names no store; such a
  // user has nothing to target (spec Edge Cases: note shown, saving disabled).
  const hasAssignedStore = !!user?.managedStoreIds.length || !!user?.storeId;

  const { data, isLoading, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } =
    useInfiniteQuery({
      ...adminStoreControllerListInfiniteOptions({
        query: { limit: STORE_PAGE_SIZE, sort: 'name', order: 'asc' },
      }),
      enabled: canSelectAllStores,
      initialPageParam: 1,
      getNextPageParam: getNextPageFromPagination,
    });
  const isLoadingMore = useLoadAllPages({
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  });

  const stores = useMemo<BlogFormStore[]>(() => {
    if (!canSelectAllStores && !hasAssignedStore) return [];
    const source = canSelectAllStores
      ? (data?.pages.flatMap((page) => page.items) ?? [])
      : restrictedStores;
    return source.map(({ id, name, brandEnum }) => ({ id, name, brandEnum }));
  }, [canSelectAllStores, hasAssignedStore, data, restrictedStores]);

  return {
    stores,
    isLoading: canSelectAllStores ? isLoading || isLoadingMore : isRestrictedLoading,
  };
}
