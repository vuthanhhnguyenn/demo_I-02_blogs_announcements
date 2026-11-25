import type { QueryClient } from '@tanstack/react-query';

import {
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
  adminTransferControllerDetailQueryKey,
  adminTransferControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { invalidateMemberContractReads } from '../../[id]/_utils/member-cache.util';

interface DecidedTransfer {
  transferApplicationId: string;
  member: { memberId: string };
}

/**
 * A decision changes more than the transfer screens: the final approval moves the member's
 * main-contract store, which the member list / detail and the 契約操作 tab (main contract,
 * 契約サマリー) show. With the app-wide 2-minute staleTime, a member screen opened before the
 * decision would otherwise keep serving the old store.
 */
export function invalidateAfterTransferDecision(
  queryClient: QueryClient,
  transfer: DecidedTransfer,
) {
  const { memberId } = transfer.member;
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: adminTransferControllerListQueryKey() }),
    queryClient.invalidateQueries({
      queryKey: adminTransferControllerDetailQueryKey({
        path: { transferApplicationId: transfer.transferApplicationId },
      }),
    }),
    queryClient.invalidateQueries({
      queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
    }),
    queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() }),
    invalidateMemberContractReads(queryClient, memberId),
  ]);
}
