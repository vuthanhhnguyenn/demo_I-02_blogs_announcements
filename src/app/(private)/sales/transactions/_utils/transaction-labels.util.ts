import { addMonths, format, isAfter, isValid, parseISO, startOfMonth } from 'date-fns';

import type {
  AdminTransactionControllerListData,
  RefundApplyContextDto,
  TransactionRowDto,
} from '@/lib/api-real/types.gen';

import { getPaymentMethodLabel } from '../../_constants/sales-labels.constant';

/**
 * F-01-01 入出金明細 — display mappers for one API-116 ledger row (016 plan D1 / D2).
 * One row = one billing-grain transaction (API-116 §3.3), not one 明細.
 */

export type TransactionType = TransactionRowDto['transactionType'];
export type TransactionQuery = AdminTransactionControllerListData['query'];
export type TransactionPaymentMethod = NonNullable<TransactionQuery['paymentMethod']>[number];

/** API-116 §7.2 (Otaki 2026-10-14): 貸倒 replaces FR-002-a's 払戻 */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  sale: '売上',
  payment: '入金',
  refund: '返金',
  write_off: '貸倒',
};

export const TRANSACTION_TYPE_VALUES = Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[];

export const TRANSACTION_TYPE_BADGE_CLASS: Record<TransactionType, string> = {
  sale: 'bg-success/15 text-success border-success/20',
  payment: 'bg-info/15 text-info border-info/20',
  refund: 'bg-destructive/15 text-destructive border-destructive/20',
  write_off: 'bg-warning/15 text-warning border-warning/20',
};

/** Filter options for 決済手段 — every value the list query accepts (API-116 §4.2 / CONV-003) */
export const TRANSACTION_PAYMENT_METHOD_VALUES = [
  'sbps_credit',
  'sbps_link',
  'jaccs_bank',
  'convenience_store',
  'card_onsite',
  'cash',
  'bank_transfer',
  'cashpost',
  'manual',
] as const satisfies readonly TransactionPaymentMethod[];

// Drift guard: a BE enum addition to `paymentMethod` fails tsc here instead of silently missing
// from the filter.
type MissingPaymentMethod = Exclude<
  TransactionPaymentMethod,
  (typeof TRANSACTION_PAYMENT_METHOD_VALUES)[number]
>;
const assertAllPaymentMethods: [MissingPaymentMethod] extends [never] ? true : never = true;
void assertAllPaymentMethods;

export function getTransactionPaymentMethodLabel(method: string | null | undefined): string {
  return getPaymentMethodLabel(method);
}

/** FR-002-a: the four display statuses (確定 / 処理中 / キャンセル / 未収) */
export type TransactionDisplayStatus = 'confirmed' | 'processing' | 'cancelled' | 'uncollected';

export const TRANSACTION_DISPLAY_STATUS_LABELS: Record<TransactionDisplayStatus, string> = {
  confirmed: '確定',
  processing: '処理中',
  cancelled: 'キャンセル',
  uncollected: '未収',
};

export const TRANSACTION_DISPLAY_STATUS_BADGE_CLASS: Record<TransactionDisplayStatus, string> = {
  confirmed: 'bg-success/15 text-success border-success/20',
  processing: 'bg-warning/15 text-warning border-warning/20',
  cancelled: 'bg-muted text-muted-foreground border-border',
  uncollected: 'bg-destructive/15 text-destructive border-destructive/20',
};

/**
 * API-116 §7.2 "FR-002-a の表示": `transactionType` × `status` × `rawStatus.collectionStatus` →
 * the FR's four display statuses. Null for a combination the table does not define (rendered raw).
 */
export function getTransactionDisplayStatus(
  row: Pick<TransactionRowDto, 'transactionType' | 'status' | 'rawStatus'>,
): TransactionDisplayStatus | null {
  const { transactionType, status } = row;
  switch (transactionType) {
    case 'sale':
      if (status === 'confirmed') {
        return row.rawStatus.collectionStatus === 'uncollected' ? 'uncollected' : 'confirmed';
      }
      if (status === 'refunded' || status === 'partial_refund' || status === 'written_off') {
        return 'confirmed';
      }
      if (status === 'pending' || status === 'unconfirmed') return 'processing';
      if (status === 'cancelled') return 'cancelled';
      return null;
    case 'payment':
      if (status === 'succeeded' || status === 'refunded' || status === 'partial_refund') {
        return 'confirmed';
      }
      if (status === 'pending') return 'processing';
      if (status === 'cancelled') return 'cancelled';
      if (status === 'failed') return 'uncollected';
      return null;
    case 'refund':
      if (status === 'succeeded') return 'confirmed';
      if (status === 'pending') return 'processing';
      if (status === 'failed') return 'cancelled';
      return null;
    case 'write_off':
      return 'confirmed';
  }
}

/**
 * 税率 cell. Sale / refund rows carry their line's rate (API-116 v0.7.3 §3.5); `null` there means a
 * refund line without a billing item. Payment / write-off rows are `null` when the billing mixes
 * rates — shown as 「—」 like any row without a single rate (BUG-016A-07).
 */
export function formatTransactionTaxRate(row: Pick<TransactionRowDto, 'taxRate'>): string {
  return row.taxRate != null ? `${row.taxRate}%` : '—';
}

/** FR-004: cancelled sales are not refundable — the row keeps a disabled 返金申請 with this reason */
export const TRANSACTION_CANCELLED_REFUND_REASON =
  'キャンセル済みの取引のため返金申請できません。確定・処理中・未収の取引のみ申請できます';

/** 請求明細ID cell: this row's billing line (API-116 v0.7.3); blank for payment / write-off */
export function formatBillingItemId(row: Pick<TransactionRowDto, 'billingItemId'>): string {
  return row.billingItemId ? row.billingItemId.slice(-8) : '—';
}

/** Signed JPY with the minus sign kept (refund / write_off amounts are negative, BR-TXN-006) */
export function formatSignedYen(amount: number): string {
  return `${amount < 0 ? '-' : ''}¥${Math.abs(amount).toLocaleString('ja-JP')}`;
}

/**
 * FR-004 refund-dialog alert per API-116 v0.7.4 `refundApplyContext.alertVariant` (the API-118
 * §13.2 values, resolved from the source payment: convenience_store → cashpost, cash / card_onsite
 * → cash, bank_transfer / manual / cashpost → bank_transfer).
 */
export const TRANSACTION_REFUND_ALERT_MESSAGES: Record<
  RefundApplyContextDto['alertVariant'],
  string
> = {
  sbps_void: 'SBPS（クレジット）決済です。承認後、取消処理（決済から 90 日以内）が実行されます。',
  jaccs_manual_or_cashpost:
    'JACCS（口座振替）決済です。承認後、手動返金または CASHPOST での対応が必要です。',
  cashpost: '承認後、CASHPOST での返金対応が必要です。返金実行後に実行記録を登録します。',
  cash: '店頭決済（現金・カード等）です。承認後、手動で返金を実行し実行記録を登録します。',
  bank_transfer: '承認後、銀行振込での返金対応が必要です。返金実行後に実行記録を登録します。',
};

// ---------------------------------------------------------------------------------------------
// Date window (D3) — API-116 §7.3: fromDate / toDate required, ≤ 12 months apart
// ---------------------------------------------------------------------------------------------

export const TRANSACTION_MAX_RANGE_MONTHS = 12;

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Default window when the filter is empty: current month start → today */
export function getDefaultTransactionDateRange(today: Date = new Date()): {
  fromDate: string;
  toDate: string;
} {
  return { fromDate: toIsoDate(startOfMonth(today)), toDate: toIsoDate(today) };
}

/** True when `to` is more than 12 months after `from` (E-TXN-003) */
export function exceedsTransactionRange(from: Date, to: Date): boolean {
  return isAfter(to, addMonths(from, TRANSACTION_MAX_RANGE_MONTHS));
}

/**
 * A hand-edited URL date (`2026-02-30`, `abc`) would 400 (E-VAL-001) — treated as not set
 * (BUG-016A-06). Round-trips through format so an overflowing day is rejected, not rolled over.
 */
export function toValidIsoDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parseISO(value);
  return isValid(date) && toIsoDate(date) === value ? value : null;
}

/**
 * Resolves the URL date filter to the window actually sent: missing ends take the default, a
 * reversed or over-12-month range (hand-edited URL) is clamped so the request never 400s.
 */
export function resolveTransactionDateRange(
  rawDateFrom: string | null,
  rawDateTo: string | null,
): { fromDate: string; toDate: string } {
  const defaults = getDefaultTransactionDateRange();
  const dateFrom = toValidIsoDate(rawDateFrom);
  const dateTo = toValidIsoDate(rawDateTo);
  const fromDate = dateFrom ?? defaults.fromDate;
  let toDate = dateTo ?? (dateFrom && dateFrom > defaults.toDate ? dateFrom : defaults.toDate);
  if (toDate < fromDate) toDate = fromDate;
  const from = parseISO(fromDate);
  if (exceedsTransactionRange(from, parseISO(toDate))) {
    toDate = toIsoDate(addMonths(from, TRANSACTION_MAX_RANGE_MONTHS));
  }
  return { fromDate, toDate };
}
