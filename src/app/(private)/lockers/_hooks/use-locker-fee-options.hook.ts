'use client';

import { useMemo } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';

import { adminOptionControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import { Permission } from '@/types/permission.type';

/**
 * Locker fee options (`GET /admin/options?category=locker_option`, G-02 master) — the
 * 契約形態コード / 契約種類 choices. `limit` is the API max (100).
 *
 * Not fetched without `OptionsView`: API-085 §13 gives observer / trainer no access (403), so
 * those screens fall back to the names the locker APIs return (`useLockerContractTypeChoices`).
 *
 * `options` (the choices) keep the `storeId` filter, which means "linked through store_options".
 * `byId` resolves an option a cabinet / slot already points at, so it is built from every locker
 * option: API-100 / API-101 accept any locker option without a store link (§6.1 #3, §6.5), and a
 * slot whose option is not linked to its store would otherwise show as 未設定 and block 割当.
 */
export function useLockerFeeOptions({
  storeId,
  enabled = true,
}: { storeId?: string | null; enabled?: boolean } = {}) {
  const { hasPermission } = useAuthUser();
  const canReadOptions = hasPermission(Permission.OptionsView);

  const listQuery = (scopedStoreId: string | undefined) =>
    adminOptionControllerListOptions({
      query: {
        category: 'locker_option',
        storeId: scopedStoreId,
        sort: 'name',
        order: 'asc',
        page: 1,
        limit: 100,
      },
    });

  const query = useQuery({
    ...listQuery(storeId ?? undefined),
    enabled: enabled && canReadOptions,
    staleTime: 5 * 60 * 1000,
  });
  const allQuery = useQuery({
    ...listQuery(undefined),
    enabled: enabled && canReadOptions && Boolean(storeId),
    staleTime: 5 * 60 * 1000,
  });

  const options = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const byId = useMemo(
    () =>
      new Map([...(allQuery.data?.items ?? []), ...options].map((option) => [option.id, option])),
    [allQuery.data?.items, options],
  );

  return { ...query, options, byId, canReadOptions };
}
