'use client';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';

import {
  adminLockerContractsControllerListOptions,
  adminLockerControllerListLockersOptions,
  adminLockerSlotOpsControllerListPendingReleaseOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

/**
 * Tab badges of ロッカー管理: `pagination.totalItems` of a `limit: 1` call per tab, scoped to the
 * header store (`GET /crm/lockers/summary` has no real counterpart); under 全店舗 every list
 * omits `storeId` and counts all stores.
 */
export function useLockerTabCounts(enabled: boolean) {
  const { currentStoreId, isLoading: isStoreLoading } = useCurrentStore();
  // Wait for the header store to resolve: restricted roles get 403 on an unscoped list call
  const isEnabled = enabled && !isStoreLoading;
  const storeId = currentStoreId && currentStoreId !== ALL_STORES ? currentStoreId : undefined;

  const lockers = useQuery({
    ...adminLockerControllerListLockersOptions({ query: { storeId, page: 1, limit: 1 } }),
    enabled: isEnabled,
  });
  const contracts = useQuery({
    ...adminLockerContractsControllerListOptions({ query: { storeId, page: 1, limit: 1 } }),
    enabled: isEnabled,
  });
  const pending = useQuery({
    ...adminLockerSlotOpsControllerListPendingReleaseOptions({
      query: { storeId, page: 1, limit: 1 },
    }),
    enabled: isEnabled,
  });

  return {
    lockers: lockers.data?.pagination.totalItems,
    contracts: contracts.data?.pagination.totalItems,
    pending: pending.data?.pagination.totalItems,
  };
}
