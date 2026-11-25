/**
 * 決済方法 (payment method) labels for the member-detail screens.
 *
 * The read DTOs carry `financial_infos.payment_method` as a plain string — the value set is
 * pinned down only by the `paymentMethod` filter of `GET /admin/members/{memberId}/payments`
 * (9 values, `/docs-json` 2026-09-04), not by an enum on the response. So unknown keys pass
 * through rather than resolving to 「—」: a value the screen cannot name is still information,
 * while 「—」 would read as "no payment method on file".
 *
 * SBPS = クレジットカード, JACCS = 口座振替 — the pairing the 売上 screens already use
 * (`billing-refund-request-dialog.tsx`) and the one the prototype shows on 契約サマリー.
 */
const PAYMENT_METHOD_LABELS = {
  sbps_credit: 'SBPS（クレジットカード）',
  sbps_link: 'SBPS（リンク決済）',
  jaccs_bank: 'JACCS（口座振替）',
  bank_transfer: '銀行振込',
  cash: '現金',
  card_onsite: 'クレジットカード（店頭）',
  convenience_store: 'コンビニ払い',
  cashpost: 'キャッシュポスト',
  manual: '手動計上',
} as const;

export type PaymentMethodKey = keyof typeof PAYMENT_METHOD_LABELS;

/**
 * Resolve a payment-method key to its Japanese label; unknown keys pass through.
 * `null` means the member has no payment method on file yet, which is a legitimate state
 * before enrolment completes — it renders as the usual 「—」 placeholder.
 */
export function getPaymentMethodLabel(
  method: string | null | undefined,
  fallback: string = '—',
): string {
  if (!method) return fallback;
  return PAYMENT_METHOD_LABELS[method as PaymentMethodKey] ?? method;
}

/**
 * Short forms for table cells. The prototype writes the brand alone in the 入出金明細 column
 * and on 支払いサマリー (「SBPS」), keeping the 「（クレジットカード）」 qualifier for the roomier
 * 契約サマリー field. Only the keys the prototype actually shortens are listed; every other
 * method keeps its full label, which is already short (「現金」,「銀行振込」).
 */
const PAYMENT_METHOD_SHORT_LABELS: Partial<Record<PaymentMethodKey, string>> = {
  sbps_credit: 'SBPS',
  jaccs_bank: 'JACCS',
};

/** Resolve a payment-method key to its short table label; unknown keys pass through. */
export function getPaymentMethodShortLabel(
  method: string | null | undefined,
  fallback: string = '—',
): string {
  if (!method) return fallback;
  return (
    PAYMENT_METHOD_SHORT_LABELS[method as PaymentMethodKey] ??
    getPaymentMethodLabel(method, fallback)
  );
}

/**
 * 決済方法 cell of a 返金 row: a refund carries `refundMethod` instead of `paymentMethod`.
 * `sbps_cancel` is an SBPS reversal, so it reads as the SBPS brand like the payment rows;
 * `bank_transfer` / `cash` share the payment-method labels. Unknown keys pass through.
 */
const REFUND_METHOD_SHORT_LABELS: Record<string, string> = {
  sbps_cancel: 'SBPS',
};

export function getRefundMethodShortLabel(
  method: string | null | undefined,
  fallback: string = '—',
): string {
  if (!method) return fallback;
  return REFUND_METHOD_SHORT_LABELS[method] ?? getPaymentMethodShortLabel(method, fallback);
}
