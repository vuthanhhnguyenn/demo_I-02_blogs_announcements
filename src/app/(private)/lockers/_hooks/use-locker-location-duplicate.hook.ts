'use client';

import { useQuery } from '@tanstack/react-query';

import { adminLockerControllerListLockersOptions } from '@/lib/api-real/@tanstack/react-query.gen';

type UseLockerLocationDuplicateArgs = {
  storeId?: string;
  lockerLocationId?: string;
  /** On edit, the cabinet's own location must not count as a conflict with itself. */
  excludeLockerId?: string;
};

/**
 * E-01 FR-001: 「同一店舗内でロケーション記号の重複を禁止する」 (BR-LCK-004, 409 E-LOC-005).
 *
 * A store holds at most 26 cabinets (API-100 §6.1), so one page of the store's cabinets at the
 * API max (100) lists every location in use. Shared by the form section (inline error) and the
 * create / edit pages (disable save) through the same query key.
 */
export function useLockerLocationDuplicate({
  storeId,
  lockerLocationId,
  excludeLockerId,
}: UseLockerLocationDuplicateArgs): boolean {
  const { data } = useQuery({
    ...adminLockerControllerListLockersOptions({
      query: { storeId: storeId ?? '', page: 1, limit: 100 },
    }),
    enabled: Boolean(storeId),
  });

  if (!lockerLocationId) return false;

  return (data?.items ?? []).some(
    (locker) => locker.id !== excludeLockerId && locker.lockerLocationId === lockerLocationId,
  );
}
