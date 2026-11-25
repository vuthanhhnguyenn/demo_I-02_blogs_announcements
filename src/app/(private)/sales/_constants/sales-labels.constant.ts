import type {
  AdminRefundControllerBulkCreateData,
  Api114BillingHeaderDto,
  Api114BulkConfirmFailureDto,
  RefundApplicationListItemDto,
  RefundBulkCreateFailedDto,
  RefundabilityResultDto,
} from '@/lib/api-real/types.gen';

/**
 * F-01 sales — label maps shared by the sales list / detail / register screens (015) and the
 * transactions / receivables / refunds screens (016). Keys are typed against the generated DTOs so
 * a BE enum change fails `tsc` here instead of rendering a raw value.
 */

export type BillingType = Api114BillingHeaderDto['billingType'];
export type ConfirmStatus = Api114BillingHeaderDto['confirmStatus'];
export type CollectionStatus = Api114BillingHeaderDto['collectionStatus'];
export type SalesPaymentMethod = Api114BillingHeaderDto['paymentMethod'];
export type RefundDisplayStatus = RefundApplicationListItemDto['displayStatus'];
export type RefundAlertVariant = RefundApplicationListItemDto['alertVariant'];
export type RefundBlockReason = NonNullable<RefundabilityResultDto['blockReason']>;

/** Fine-grained billing type, for the list, detail 請求区分, upcoming tab and filter options.
 * F-01 用語: 都度請求 is per-use billing only, so a manual billing never reads 都度請求 */
export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  monthly: '月次請求',
  carryover: '繰越請求',
  enrollment: '入会時請求',
  withdrawal: '退会時請求',
  per_use: '都度利用',
  transfer: '移籍時請求',
  manual: '手動請求',
};

/** `pending` and `unconfirmed` both read 未確定 to the operator (015 D8) */
export const CONFIRM_STATUS_LABELS: Record<ConfirmStatus, string> = {
  pending: '未確定',
  unconfirmed: '未確定',
  confirmed: '確定済',
};

export const COLLECTION_STATUS_LABELS: Record<CollectionStatus, string> = {
  not_due: '請求前',
  in_transit: '請求中',
  collected: '入金済',
  partially_refunded: '一部返金',
  fully_refunded: '全額返金',
  uncollected: '未収',
  written_off: '貸倒',
  cancelled: 'キャンセル',
};

export const PAYMENT_METHOD_LABELS: Record<SalesPaymentMethod, string> = {
  sbps_credit: 'SBPS（クレジット）',
  sbps_link: 'SBPS（リンク決済）',
  jaccs_bank: 'JACCS（口座振替）',
  convenience_store: 'コンビニ',
  card_onsite: 'カード（店頭）',
  cash: '現金',
  cashpost: 'CASHPOST',
  bank_transfer: '銀行振込',
  manual: '手動',
};

/** Label for a payment method string that may be outside the typed enum or null */
export function getPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return PAYMENT_METHOD_LABELS[method as SalesPaymentMethod] ?? method;
}

/** BR-REF-010 / API-118 §13.11: the 7 refund display statuses */
export const REFUND_DISPLAY_STATUS_LABELS: Record<RefundDisplayStatus, string> = {
  pending_approval: '承認待ち',
  processing: '返金処理中',
  refunded: '返金済み',
  failed: '返金失敗',
  rejected: '却下',
  cancelled: '取消',
  expired: '期限切れ',
};

export const REFUND_DISPLAY_STATUS_BADGE_CLASS: Record<RefundDisplayStatus, string> = {
  pending_approval: 'bg-warning/15 text-warning border-warning/20',
  processing: 'bg-info/15 text-info border-info/20',
  refunded: 'bg-success/15 text-success border-success/20',
  failed: 'bg-destructive/15 text-destructive border-destructive/20',
  rejected: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-muted text-muted-foreground border-border',
  expired: 'bg-muted text-muted-foreground border-border',
};

/**
 * Approval-dialog guidance per alert variant (FR-004 / API-118 §4). `no_payment_yet` cannot occur
 * on a created application (create blocks it with E-REF-011) and falls into the default branch.
 */
export function getRefundAlertMessage(variant: RefundAlertVariant | string | null): string {
  switch (variant) {
    case 'sbps_void':
      return 'SBPS の取消処理として即時返金されます。';
    case 'sbps_partial_refund':
      return 'SBPS の一部返金として即時返金されます（決済から 90 日以内）。';
    case 'sbps_past_window':
      return '決済から 90 日を超えているため SBPS で返金できません。';
    case 'jaccs_manual_or_cashpost':
      return 'JACCS 決済のため、手動返金または CASHPOST を選択してください。承認後は「処理中」となり、返金実行後に実行記録を登録します。';
    case 'jaccs_manual':
      return 'JACCS 決済のため手動返金となります。承認後は「処理中」となり、返金実行後に実行記録を登録します。';
    case 'cashpost':
      return 'CASHPOST で返金します。承認後は「処理中」となり、返金実行後に実行記録を登録します。';
    case 'cash':
      return '現金で返金します。承認後は「処理中」となり、返金実行後に実行記録を登録します。';
    case 'bank_transfer':
      return '銀行振込で返金します。承認後は「処理中」となり、返金実行後に実行記録を登録します。';
    default:
      return '返金方法を確認してください。';
  }
}

/**
 * API-118 §11 `blockReason`. `ALREADY_REFUNDED` also covers "requested amount exceeds the
 * refundable balance" (refund.service.ts — any line with `canRefund = false`).
 */
export const REFUND_BLOCK_REASON_LABELS: Record<RefundBlockReason, string> = {
  SBPS_PAST_WINDOW: '決済から 90 日を超えているため承認できません。',
  NO_PAYMENT_YET: '入金が確認できない明細があるため承認できません。',
  ALREADY_REFUNDED: '申請金額が返金可能残高を超えている明細があるため承認できません。',
};

/**
 * Per-row failure codes of the bulk endpoints. Each row carries only the developer-facing English
 * `message`, so the operator sees this Japanese wording instead (API-114 §8 / API-118 §4B).
 */
export const BULK_CONFIRM_FAILURE_LABELS: Record<Api114BulkConfirmFailureDto['code'], string> = {
  'E-BIL-001': '請求が見つかりません',
  'E-BIL-002': '担当店舗外の請求です',
  'E-BIL-101': '既に確定済みです',
  'E-BIL-103': '確定する権限がありません',
  'E-BIL-106': 'キャンセル済みの請求のため確定できません',
};

/** API-118 `refund_reason_code` (provisional 5 values — TBD-F01-REFUND-REASON-CODE) */
export const REFUND_REASON_CODE_LABELS: Record<
  AdminRefundControllerBulkCreateData['body']['reasonCode'],
  string
> = {
  duplicate_billing: '重複請求',
  contract_cancellation: '契約解約',
  billing_error: '請求誤り',
  member_request: '会員要望',
  other: 'その他',
};

/** FR-004-a 返金事由: the free-text reason, else the §4B reason code label (§4B rows without `note`). */
export function getRefundReasonLabel(
  item: Pick<RefundApplicationListItemDto, 'applicationReason' | 'reasonCode'>,
): string {
  if (item.applicationReason) return item.applicationReason;
  if (item.reasonCode) {
    return (
      REFUND_REASON_CODE_LABELS[item.reasonCode as keyof typeof REFUND_REASON_CODE_LABELS] ??
      item.reasonCode
    );
  }
  return '—';
}

export const BULK_REFUND_FAILURE_LABELS: Record<RefundBulkCreateFailedDto['code'], string> = {
  'E-REF-005': '返金可能残高がありません',
  'E-REF-007': 'SBPS 決済から 90 日を超えているため申請できません（別途対応をご検討ください）',
  'E-REF-011': '未確定・未入金の請求のため申請できません',
};

export function formatYen(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `¥${amount.toLocaleString('ja-JP')}`;
}
