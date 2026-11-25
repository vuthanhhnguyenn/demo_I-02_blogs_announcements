'use client';

import { useEffect, useRef } from 'react';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';

/**
 * FR-021: the header store switcher scopes every sales screen. A specific header store wins over
 * the in-panel 店舗 filter, which is shown only under 全店舗 (same rule as the equipment screens).
 * Restricted roles (Manager / Staff / …) always have a specific header store, so their filter never
 * lists stores outside their scope — the header switcher offers only their own.
 *
 * `clearFilterStore` runs when the header store is switched: the filter is hidden under a specific
 * header store, so a store left in it would silently come back on 全店舗 (k.iwaki !207). The first
 * resolved scope is not a switch.
 *
 * `isScopeLoading`: until the scope resolves, a Manager's store is their home store, which can sit
 * outside their managed stores (E-AUTH-101) — store-scoped queries wait for it (`enabled`), the
 * same isStoreScopeLoading pattern as membership-applications / entry-exit.
 */
export function useSalesStoreScope(filterStoreId?: string | null, clearFilterStore?: () => void) {
  const { currentStoreId, isLoading } = useCurrentStore();
  const isAllStoresScope = currentStoreId === ALL_STORES;

  const previousStoreIdRef = useRef<string | null>(null);
  const clearRef = useRef(clearFilterStore);
  useEffect(() => {
    clearRef.current = clearFilterStore;
  });
  useEffect(() => {
    if (isLoading) return;
    const previousStoreId = previousStoreIdRef.current;
    previousStoreIdRef.current = currentStoreId;
    if (previousStoreId === null || previousStoreId === currentStoreId) return;
    clearRef.current?.();
  }, [currentStoreId, isLoading]);

  return {
    showStoreFilter: isAllStoresScope,
    effectiveStoreId: isAllStoresScope ? (filterStoreId ?? undefined) : currentStoreId,
    isScopeLoading: isLoading,
  };
}
