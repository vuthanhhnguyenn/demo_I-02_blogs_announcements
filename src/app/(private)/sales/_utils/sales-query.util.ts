import type { QueryClient } from '@tanstack/react-query';

/**
 * Member-detail (A-01) reads that show F-01 data: the member record (未納額), the 支払い履歴 tab's
 * billings and payments (API-095), and the 契約操作 tab's 会費調整 (API-094). Sales screens link
 * straight into member detail, so every sales write clears these too — for every member, since
 * bulk writes span members and the generated keys carry the member only in `path`.
 */
const MEMBER_SALES_READ_IDS = new Set([
  'adminMemberControllerDetail',
  'adminMemberFinancialControllerBillings',
  'adminMemberFinancialControllerPayments',
  'adminMemberContractOpsControllerListFeeAdjustments',
]);

export function invalidateMemberSalesReads(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const [key] = query.queryKey as [{ _id?: unknown } | undefined];
      return typeof key?._id === 'string' && MEMBER_SALES_READ_IDS.has(key._id);
    },
  });
}

/**
 * Invalidate every cached sales list / summary / detail query. The generated list and summary
 * key builders require the full `query` (`month` is mandatory), so these match on the `_id` the
 * generated keys carry instead — a partial key match covers every month / filter combination.
 */
export function invalidateSalesBillingQueries(queryClient: QueryClient): void {
  for (const id of [
    'adminSalesBillingControllerList',
    'adminSalesBillingControllerSummary',
    'adminSalesBillingControllerDetail',
    'adminRefundControllerList',
    // 未収・未納 / 翌月請求予定 count confirmed and unpaid billings
    'adminReceivableControllerList',
    'adminReceivableControllerListUpcoming',
    'adminReceivableControllerMemberDetail',
  ]) {
    void queryClient.invalidateQueries({ queryKey: [{ _id: id }] });
  }
  invalidateMemberSalesReads(queryClient);
}
