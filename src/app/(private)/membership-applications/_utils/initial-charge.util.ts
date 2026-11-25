import { formatYen } from '@/utils/format.util';

import type { ApproveApplicationResponseDto } from '@/lib/api-real/types.gen';

type InitialCharge = NonNullable<ApproveApplicationResponseDto['initialCharge']>;

const FAILURE_REASON: Record<Exclude<InitialCharge['status'], 'paid'>, string> = {
  declined: 'クレジットカードの決済が拒否されました。',
  gateway_error: '決済サービスとの通信でエラーが発生しました。',
  card_not_registered: '会員のクレジットカードが未登録のため、決済を実行していません。',
};

const FALLBACK_REASON = '決済を完了できませんでした。';

const FOLLOW_UP =
  'お支払いが完了するまで会員ステータスは「仮会員」のままです。会員にアプリでクレジットカードを登録し、未納分を支払うよう案内してください。利用開始日を迎えている場合は、お支払いの翌日に「有効」に切り替わります。利用開始日が未来の場合は、お支払い完了後も利用開始日までは「仮会員」のままです。';

export interface InitialChargeWarning {
  title: string;
  description: string;
}

/**
 * C-01 FR-M005 異常系: the approval stands even when the enrollment charge run right after it did
 * not collect (`declined` / `gateway_error` / `card_not_registered`) — the invoice stays
 * `uncollected` and the member stays `provisional`, so the staff must be told to follow up.
 * Returns null when there is nothing to warn about (`initialCharge` null = 口座振替 / ¥0, or `paid`).
 */
export function getInitialChargeWarning(
  initialCharge: ApproveApplicationResponseDto['initialCharge'] | undefined,
): InitialChargeWarning | null {
  if (!initialCharge || initialCharge.status === 'paid') return null;
  // A status added on the BE before the SDK is regenerated still gets a generic warning.
  const reason = FAILURE_REASON[initialCharge.status] ?? FALLBACK_REASON;
  return {
    title: `入会申請を承認しましたが、入会費用（${formatYen(initialCharge.amount)}）を決済できませんでした。`,
    description: `${reason}${FOLLOW_UP}`,
  };
}
