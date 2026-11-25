'use client';

import { type QueryClient, useQuery } from '@tanstack/react-query';

import {
  adminRelayControllerControllerDetailOptions,
  adminStoreControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import type { StoreBrandGroup } from '../_constants/constants';

const STORE_CACHE_MS = 5 * 60 * 1000;

function storeDetailOptions(storeId: string) {
  return {
    ...adminStoreControllerDetailOptions({ path: { id: storeId } }),
    staleTime: STORE_CACHE_MS,
    retry: false,
    // A missing brand only widens the 主契約タイプ choice to all nine; no toast for it.
    meta: { suppressErrorToast: true },
  } as const;
}

/**
 * Brand group (JOYFIT / FIT365) of a store — it decides which 主契約タイプ a device there can pick
 * (prototype 11/7). `null` while unknown: no store, still loading, or the store master is not
 * readable for this role (API-083 → 403 for Trainer / Observer).
 */
export function useStoreBrandGroup(storeId: string | null | undefined) {
  const { data, isLoading } = useQuery({
    ...storeDetailOptions(storeId ?? ''),
    enabled: !!storeId,
  });

  return {
    brandGroup: (data?.brandGroup ?? null) as StoreBrandGroup | null,
    isLoading: !!storeId && isLoading,
  };
}

/** The brand group of the store a relay controller sits in (a device's store follows it). */
export function useControllerBrandGroup(controllerId: string | null | undefined) {
  const { data: controller, isLoading: isControllerLoading } = useQuery({
    ...adminRelayControllerControllerDetailOptions({
      path: { relayControllerId: controllerId ?? '' },
    }),
    enabled: !!controllerId,
  });
  const { brandGroup, isLoading } = useStoreBrandGroup(controller?.storeId);

  return {
    brandGroup,
    isLoading: (!!controllerId && isControllerLoading) || isLoading,
  };
}

/** Imperative twin of `useStoreBrandGroup`, for the controller-change check. */
export async function fetchStoreBrandGroup(
  queryClient: QueryClient,
  storeId: string,
): Promise<StoreBrandGroup | null> {
  try {
    const store = await queryClient.fetchQuery(storeDetailOptions(storeId));
    return (store.brandGroup ?? null) as StoreBrandGroup | null;
  } catch {
    return null;
  }
}
