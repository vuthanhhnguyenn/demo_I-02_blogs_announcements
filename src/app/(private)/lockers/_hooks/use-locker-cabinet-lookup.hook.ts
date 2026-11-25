'use client';

import { useMemo } from 'react';

import { useQueries } from '@tanstack/react-query';

import { adminLockerControllerListLockersOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LockerListItemDto } from '@/lib/api-real/types.gen';

/**
 * `lockerId → cabinet` for rows that carry only `lockerId` + `slotCode` (the locker-contract
 * list): one `GET /admin/lockers?storeId=` per distinct store on the page, `limit` 100 (API max).
 * Used to compose the 「A-001」 slot label; a miss falls back to the bare slot code.
 */
export function useLockerCabinetLookup(storeIds: readonly string[]) {
  const uniqueStoreIds = useMemo(() => [...new Set(storeIds)].sort(), [storeIds]);

  return useQueries({
    queries: uniqueStoreIds.map((storeId) => ({
      ...adminLockerControllerListLockersOptions({ query: { storeId, page: 1, limit: 100 } }),
      staleTime: 60 * 1000,
    })),
    combine: (results) => {
      const map = new Map<string, LockerListItemDto>();
      for (const result of results) {
        for (const locker of result.data?.items ?? []) map.set(locker.id, locker);
      }
      return map;
    },
  });
}
