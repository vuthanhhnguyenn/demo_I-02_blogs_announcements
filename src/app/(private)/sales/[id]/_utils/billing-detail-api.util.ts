import { formatISODateLocal, jstToday } from '@/utils/date.util';
import type { QueryClient } from '@tanstack/react-query';

import type {
  Api114BillingDetailDto,
  Api114BillingHeaderDto,
  Api114BillingItemDto,
  RefundApplyContextDto,
  SalesFeeAdjustmentDto,
} from '@/lib/api-real/types.gen';

import { formatYen } from '../../_constants/sales-labels.constant';
import { invalidateMemberSalesReads } from '../../_utils/sales-query.util';

/**
 * Sales detail (`/sales/[id]`, API-114 §6 / API-115 / API-118 / API-119) — the hand-written seam
 * between the detail screen and the real API: error codes, cache invalidation, and the few
 * derivations the screen needs on top of the DTOs.
 */

export type BillingDetail = Api114BillingDetailDto;
export type BillingHeader = Api114BillingHeaderDto;
export type BillingItem = Api114BillingItemDto;

/** Line amounts can be negative (discount lines): the sign goes before ¥, as in the list (-¥125) */
export function formatSignedYen(amount: number): string {
  return amount < 0 ? `-${formatYen(-amount)}` : formatYen(amount);
}

/** `ErrorResponseDto.code` values this screen branches on (015 D12) — never Japanese substrings */
export const BILLING_ERROR_CODE = {
  /** API-114 §6: billing not found */
  notFound: 'E-BIL-001',
  /** API-114 §9: unconfirm of a billing with a successful PSP payment needs `acknowledgePspSent` */
  pspSentAcknowledgeRequired: 'E-BIL-105',
  /** API-115 §9: add a line to a confirmed billing */
  confirmedBillingItems: 'E-BIL-203',
  /** API-115 §9: add a line once the billing left 請求前 (`not_due` — sent to the PSP) */
  billingNotDue: 'E-BIL-210',
} as const;

/** Every generated query this screen's writes can make stale (detail, list, summary, side lists) */
const BILLING_QUERY_IDS = new Set([
  'adminSalesBillingControllerDetail',
  'adminSalesBillingControllerList',
  'adminSalesBillingControllerSummary',
  'adminBillingRunControllerListAdjustments',
  'adminRefundControllerList',
  'adminTransactionControllerList',
  'adminTransactionControllerDetail',
  // 未収・未納 / 翌月請求予定 count confirmed and unpaid billings
  'adminReceivableControllerList',
  'adminReceivableControllerListUpcoming',
  'adminReceivableControllerMemberDetail',
]);

export function invalidateBillingQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const [key] = query.queryKey as [{ _id?: unknown } | undefined];
      return typeof key?._id === 'string' && BILLING_QUERY_IDS.has(key._id);
    },
  });
  invalidateMemberSalesReads(queryClient);
}

/** `pending` and `unconfirmed` both read 未確定 (015 D8) */
export function isBillingConfirmed(header: Pick<BillingHeader, 'confirmStatus'>): boolean {
  return header.confirmStatus === 'confirmed';
}

/** `YYYY-MM` shifted by `months` */
function shiftMonthKey(monthKey: string, months: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const index = year * 12 + (month - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/**
 * FR-009 請求書「翌月の請求予定または当月確定済み」 = API-119 §14.12 BR-INV-001 (JST 当月 `M`,
 * 今日 `today`). Returns why 請求書 cannot be issued, or `null` when it can — the menu disables
 * the item instead of letting the click end in `E-RCP-005` / `E-RCP-002`. 請求月 =
 * `billingMonth`, or the JST month of `confirmedAt` for a billing without one (都度請求).
 */
export function getInvoiceBlockedReason(
  header: Pick<BillingHeader, 'confirmStatus' | 'billingMonth' | 'confirmedAt' | 'dueDate'>,
): string | null {
  const today = formatISODateLocal(jstToday());
  const currentMonth = today.slice(0, 7);
  const nextMonth = shiftMonthKey(currentMonth, 1);
  const windowMessage = '請求書は当月確定済み・翌月の請求予定のみ発行できます';

  if (header.confirmStatus === 'confirmed') {
    const billingMonth =
      header.billingMonth ??
      (header.confirmedAt ? formatISODateLocal(header.confirmedAt).slice(0, 7) : null);
    // #6 (no month) / #3 (≥ M + 2)
    if (!billingMonth || billingMonth > nextMonth) return windowMessage;
    // #5: past the 12-month history window (BR-RCP-002 #2)
    if (billingMonth < shiftMonthKey(currentMonth, -12)) return '出力期間（12ヶ月）を過ぎています';
    return null;
  }
  // #7 – #9: pending only for next month, before its due date
  if (header.confirmStatus === 'pending') {
    if (header.billingMonth !== nextMonth) return windowMessage;
    if (!header.dueDate || header.dueDate.slice(0, 10) < today) {
      return '支払期限を過ぎた未確定の請求は請求書を発行できません';
    }
    return null;
  }
  // #10: unconfirmed
  return windowMessage;
}

// --- per-line payment state (015 D10) ---

export type LinePaymentState = 'excluded' | 'unpaid' | 'paid' | 'partially_refunded' | 'refunded';

export const LINE_PAYMENT_STATE_LABELS: Record<LinePaymentState, string> = {
  excluded: '請求除外',
  unpaid: '入金未確認',
  paid: '入金確認済み',
  partially_refunded: '一部返金',
  refunded: '返金済み',
};

export const LINE_PAYMENT_STATE_BADGE_CLASS: Record<LinePaymentState, string> = {
  excluded: 'bg-muted text-muted-foreground border-border',
  unpaid: 'bg-warning/15 text-warning border-warning/20',
  paid: 'bg-success/15 text-success border-success/20',
  partially_refunded: 'bg-info/15 text-info border-info/20',
  refunded: 'bg-info/15 text-info border-info/20',
};

/**
 * Line state from `paidAt` (same on every line — set while the billing is collected / partially refunded) and the
 * billing's refund state. The API has no per-line refund status: once the billing is
 * partially / fully refunded, a paid line whose `refundableAmount` dropped below its amount is
 * shown as refunded (`refundableAmount` also holds back pending applications — API-118 §13.3).
 */
export function getLinePaymentState(
  item: BillingItem,
  collectionStatus: BillingHeader['collectionStatus'],
): LinePaymentState {
  if (item.isExcluded) return 'excluded';
  // BE clears `paidAt` once the billing is fully refunded — check that first
  if (collectionStatus === 'fully_refunded') return 'refunded';
  if (!item.paidAt) return 'unpaid';
  if (collectionStatus === 'partially_refunded' && item.refundableAmount < item.amountWithTax) {
    return item.refundableAmount === 0 ? 'refunded' : 'partially_refunded';
  }
  return 'paid';
}

// --- refund dialog payment-method alert (FR-004 / 015 D9) ---

/** SBPS void window (FR-004 異常系 / API-116 BR-TXN-001 #8–9) */
export const SBPS_VOID_WINDOW_DAYS = 90;

const SBPS_METHODS = new Set(['sbps_credit', 'sbps_link']);

export type RefundDialogAlert =
  | { kind: 'sbps_void'; paidAt: string | null }
  | { kind: 'sbps_past_window'; paidAt: string | null }
  | { kind: 'jaccs_manual' }
  | { kind: 'cash_onsite' }
  | { kind: 'none' };

/**
 * The alert above the refund dialog. `refundApplyContext.alertVariant` (API-116 sale detail —
 * API-114 detail does not carry it) decides the copy when the sale is refundable; when it is not,
 * or it has not loaded, the latest `payments[]` row (`paymentMethod` + `paidAt`) decides whether
 * the SBPS 90-day window has passed. `header.paymentMethod` is the member's *current* primary
 * method and is never used here (D9).
 */
export function getRefundDialogAlert(
  payments: BillingDetail['payments'],
  context: RefundApplyContextDto | null | undefined,
  now: number,
): RefundDialogAlert {
  const latestPayment = payments.find((payment) => payment.paidAt) ?? payments[0];
  const paidAt = latestPayment?.paidAt ?? null;

  if (context?.applicable) {
    switch (context.alertVariant) {
      case 'sbps_void':
        return { kind: 'sbps_void', paidAt };
      case 'jaccs_manual_or_cashpost':
        return { kind: 'jaccs_manual' };
      case 'cashpost':
      case 'cash':
      case 'bank_transfer':
        return { kind: 'cash_onsite' };
    }
  }

  if (!latestPayment) return { kind: 'none' };
  if (SBPS_METHODS.has(latestPayment.paymentMethod)) {
    const days = paidAt ? Math.floor((now - new Date(paidAt).getTime()) / 86_400_000) : 0;
    return days > SBPS_VOID_WINDOW_DAYS
      ? { kind: 'sbps_past_window', paidAt }
      : { kind: 'sbps_void', paidAt };
  }
  if (latestPayment.paymentMethod === 'jaccs_bank') return { kind: 'jaccs_manual' };
  return { kind: 'cash_onsite' };
}

// --- 会費調整 (FR-012 / API-115 §10–11, 015 D11) ---

export type FeeAdjustmentPattern = SalesFeeAdjustmentDto['adjustmentPattern'];
export type FeeAdjustmentStatus = SalesFeeAdjustmentDto['status'];

export const FEE_ADJUSTMENT_PATTERN_LABELS: Record<FeeAdjustmentPattern, string> = {
  fixed_amount: '金額指定',
  discount_amount: '値引き額指定',
  discount_rate: '割引率指定',
  surcharge_amount: '値増し額指定',
};

export const FEE_ADJUSTMENT_PATTERNS = Object.keys(
  FEE_ADJUSTMENT_PATTERN_LABELS,
) as FeeAdjustmentPattern[];

/** API-115 §10.1.1 `value` range per pattern */
export const FEE_ADJUSTMENT_VALUE_RANGE: Record<
  FeeAdjustmentPattern,
  { min: number; max: number }
> = {
  fixed_amount: { min: 0, max: 9_999_999 },
  discount_amount: { min: 1, max: 9_999_999 },
  discount_rate: { min: 1, max: 100 },
  surcharge_amount: { min: 1, max: 9_999_999 },
};

/** API-115 §11.2: `isApplied` → 適用済み / 次回適用予定; `cancelled` → 取消 */
export function getFeeAdjustmentStatusLabel(
  adjustment: Pick<SalesFeeAdjustmentDto, 'status' | 'isApplied'>,
): string {
  if (adjustment.status === 'cancelled') return '取消';
  if (adjustment.status === 'expired') return '期限切れ';
  return adjustment.isApplied ? '適用済み' : '次回適用予定';
}

export function getFeeAdjustmentStatusBadgeClass(
  adjustment: Pick<SalesFeeAdjustmentDto, 'status' | 'isApplied'>,
): string {
  if (adjustment.status === 'cancelled' || adjustment.status === 'expired') {
    return 'bg-muted text-muted-foreground border-border';
  }
  return adjustment.isApplied
    ? 'bg-success/15 text-success border-success/20'
    : 'bg-warning/15 text-warning border-warning/20';
}

export function formatFeeAdjustmentValue(pattern: FeeAdjustmentPattern, value: number): string {
  switch (pattern) {
    case 'discount_amount':
      return `-${value.toLocaleString('ja-JP')}円`;
    case 'discount_rate':
      return `-${value}%`;
    case 'surcharge_amount':
      return `+${value.toLocaleString('ja-JP')}円`;
    case 'fixed_amount':
      return `${value.toLocaleString('ja-JP')}円`;
  }
}
