'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { adminLockerControllerListLockersOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import { useLockerFeeOptions } from './use-locker-fee-options.hook';

export type LockerContractTypeChoice = { id: string; name: string; optionCode: string | null };

/**
 * 契約種類 choices for the contract-list filter. With `OptionsView` they are the option master;
 * without it (observer — API-085 §13) they are the normal / bottom-row options of the store's
 * cabinets, read from the cabinet list rows (API-100 §4.1, BE !822). A per-slot-only override
 * option is not offered on that path (pending PO).
 */
export function useLockerContractTypeChoices(storeId: string | undefined) {
  const master = useLockerFeeOptions({ storeId });
  const useFallback = !master.canReadOptions && !!storeId;

  const { data: cabinets } = useQuery({
    ...adminLockerControllerListLockersOptions({ query: { storeId, page: 1, limit: 100 } }),
    enabled: useFallback,
  });

  const choices: LockerContractTypeChoice[] = useMemo(() => {
    if (!useFallback) {
      return master.options.map((o) => ({ id: o.id, name: o.name, optionCode: o.optionCode }));
    }
    const map = new Map<string, LockerContractTypeChoice>();
    for (const cabinet of cabinets?.items ?? []) {
      if (cabinet.optionId && cabinet.optionName) {
        map.set(cabinet.optionId, {
          id: cabinet.optionId,
          name: cabinet.optionName,
          optionCode: cabinet.optionCode,
        });
      }
      if (cabinet.bottomOptionId && cabinet.bottomOptionName) {
        map.set(cabinet.bottomOptionId, {
          id: cabinet.bottomOptionId,
          name: cabinet.bottomOptionName,
          optionCode: cabinet.bottomOptionCode,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }, [useFallback, master.options, cabinets?.items]);
  const byId = useMemo(() => new Map(choices.map((c) => [c.id, c])), [choices]);

  return { choices, byId };
}
