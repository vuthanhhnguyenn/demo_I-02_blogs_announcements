import type { QueryClient } from '@tanstack/react-query';

import {
  adminDomainMasterControllerDetailQueryKey,
  adminDomainMasterControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

/**
 * A staff's email domain links it to a ドメイン管理 (Y-14) row, whose list and detail both carry
 * a server-computed `staffCount`. Any staff mutation that adds, removes or re-activates an
 * account changes that count, so the domain queries must be refetched too — the global
 * `staleTime` otherwise keeps the old count on /domains for 2 minutes (Y-14 Bug No.14).
 *
 * The detail key is matched by its `_id` alone so every cached domain id is refreshed.
 */
export function invalidateDomainStaffCountQueries(queryClient: QueryClient): void {
  const [{ _id: detailQueryId }] = adminDomainMasterControllerDetailQueryKey({
    path: { id: '' },
  });

  void queryClient.invalidateQueries({ queryKey: adminDomainMasterControllerListQueryKey() });
  void queryClient.invalidateQueries({ queryKey: [{ _id: detailQueryId }] });
}
