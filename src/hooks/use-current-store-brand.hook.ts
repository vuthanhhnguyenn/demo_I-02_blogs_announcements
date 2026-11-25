import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';

import { adminStoreControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';

const STORE_CACHE_MS = 5 * 60 * 1000;

/**
 * Brand (`brandEnum`) of the store picked in the header switcher.
 * `brand` is `null` while it is unknown: "全店舗（本部）" has no single brand, and the detail
 * lookup may still be in flight (`isLoading`) or have failed.
 */
export function useCurrentStoreBrand() {
  const { currentStoreId, restrictedStores, isLoading: isStoreContextLoading } = useCurrentStore();
  const isAllStores = currentStoreId === ALL_STORES;
  const knownBrand = restrictedStores.find((store) => store.id === currentStoreId)?.brandEnum;

  // Unrestricted roles don't preload the catalog, so resolve the id through the detail endpoint.
  const { data, isFetching } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: currentStoreId } }),
    enabled: !isAllStores && !knownBrand && !isStoreContextLoading,
    retry: false,
    staleTime: STORE_CACHE_MS,
  });

  return {
    brand: isAllStores ? null : (knownBrand ?? data?.brandEnum ?? null),
    isLoading: !isAllStores && !knownBrand && (isStoreContextLoading || isFetching),
  };
}
