/** Shared helpers for the member-detail header operations (A-01-01-b). */
import { formatDate } from '@/utils/format.util';
import { isAfter, parse, startOfToday } from 'date-fns';

/**
 * A-01 FR-026: 入会取り消し is offered only while the contract's usage start date is still ahead;
 * from that day on the member has begun using the store and leaves through 退会申請 instead.
 * An unset date counts as "not before" — there is nothing to cancel ahead of.
 */
export function isBeforeUsageStart(usageStartDate: string | null | undefined): boolean {
  if (!usageStartDate) return false;
  return isAfter(parse(usageStartDate.slice(0, 10), 'yyyy-MM-dd', new Date()), startOfToday());
}

/**
 * Why the 退会取り消し entry points are disabled, from `pendingWithdrawal.cancellationBlockedReason`
 * (API-092 §6.4 order). The server sends the bare code and no label, so the JP wording lives here:
 * `usage_started` follows the prototype and names the usage start date it was judged on,
 * `batch_processing_started` follows the 退会一覧 screen, and `not_cancellable_status` is ours (no
 * source covers it) — see the integration report. Swagger declares the field nullable but codegen
 * drops `| null` from enums, so an absent or unknown reason still has to resolve to wording.
 */
export function withdrawalCancelBlockedLabel(
  reason: string | null | undefined,
  usageStartDate: string | null | undefined,
): string {
  switch (reason) {
    case 'usage_started':
      return `利用開始日（${formatDate(usageStartDate)}）以降のため取り消しできません`;
    case 'batch_processing_started':
      return '退会処理が開始されているため取り消し不可';
    case 'not_cancellable_status':
      return '取り消し可能な状態ではないため取り消し不可';
    default:
      return '退会取り消しはできません';
  }
}
