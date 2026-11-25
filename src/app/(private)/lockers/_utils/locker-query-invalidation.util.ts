import type { QueryClient } from '@tanstack/react-query';

/**
 * Member-detail reads a locker slot operation also changes: the 契約操作 tab's option contracts
 * (list + infinite) and 契約サマリー. Matched for every member, since bulk open / slot edits
 * don't carry the member id.
 */
const MEMBER_OPTION_CONTRACT_QUERY_IDS: ReadonlySet<string> = new Set([
  'adminMemberContractOpsControllerListOptionContracts',
  'adminMemberContractOpsControllerContractSummary',
]);

/**
 * Every generated locker query (`adminLockerController*`, `adminLockerSlotOpsController*`,
 * `adminLockerContractsController*`) plus the member option-contract reads above. A slot
 * operation changes counts, lists, the cabinet detail and the member's option contract at once,
 * so they are refreshed together rather than key by key.
 */
export function invalidateLockerQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const head = query.queryKey[0];
      if (typeof head !== 'object' || head === null || !('_id' in head)) return false;
      const id = (head as { _id?: unknown })._id;
      if (typeof id !== 'string') return false;
      return id.startsWith('adminLocker') || MEMBER_OPTION_CONTRACT_QUERY_IDS.has(id);
    },
  });
}
