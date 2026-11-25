import type { QueryClient } from '@tanstack/react-query';

import {
  adminMemberContractOpsControllerContractSummaryQueryKey,
  adminMemberContractOpsControllerListSuspensionsInfiniteQueryKey,
  adminMemberContractOpsControllerMainContractQueryKey,
  adminMemberRelationsControllerChangeHistoryQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

/**
 * The member-detail reads a 休会 / 退会 / 移籍 application (or a 休会解除) changes besides the member
 * record itself: the 契約操作 tab's main contract, 契約サマリー and 休会履歴 strip, and the 変更履歴 tab.
 * Keys carry only the path, so every page / filter variant of the paginated reads matches.
 */
export function invalidateMemberContractReads(queryClient: QueryClient, memberId: string) {
  const path = { memberId };
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: adminMemberContractOpsControllerMainContractQueryKey({ path }),
    }),
    queryClient.invalidateQueries({
      queryKey: adminMemberContractOpsControllerContractSummaryQueryKey({ path }),
    }),
    queryClient.invalidateQueries({
      queryKey: adminMemberContractOpsControllerListSuspensionsInfiniteQueryKey({ path }),
    }),
    queryClient.invalidateQueries({
      queryKey: adminMemberRelationsControllerChangeHistoryQueryKey({ path }),
    }),
  ]);
}
