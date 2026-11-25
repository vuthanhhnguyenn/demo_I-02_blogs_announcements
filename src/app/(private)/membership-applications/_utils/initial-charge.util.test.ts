/**
 * Unit test for the approval first-charge warning (C-01 FR-M005 異常系, Bug-No27).
 *
 * ```sh
 * npx tsx --test "src/app/(private)/membership-applications/_utils/initial-charge.util.test.ts"
 * ```
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ApproveInitialChargeDto } from '@/lib/api-real/types.gen';

import { getInitialChargeWarning } from './initial-charge.util';

const charge = (
  status: ApproveInitialChargeDto['status'],
  amount = 17766,
): ApproveInitialChargeDto => ({ billingId: 'b-1', status, amount });

const FOLLOW_UP_START = 'お支払いが完了するまで会員ステータスは「仮会員」のままです。';

describe('getInitialChargeWarning', () => {
  it('returns null when nothing was charged (口座振替 / ¥0) or the response omits it', () => {
    assert.equal(getInitialChargeWarning(null), null);
    assert.equal(getInitialChargeWarning(undefined), null);
  });

  it('returns null when the charge was paid', () => {
    assert.equal(getInitialChargeWarning(charge('paid')), null);
  });

  it('warns with the amount and a per-status reason', () => {
    const cases: Array<[ApproveInitialChargeDto['status'], string]> = [
      ['declined', 'クレジットカードの決済が拒否されました。'],
      ['gateway_error', '決済サービスとの通信でエラーが発生しました。'],
      ['card_not_registered', '会員のクレジットカードが未登録のため、決済を実行していません。'],
    ];
    for (const [status, reason] of cases) {
      const warning = getInitialChargeWarning(charge(status));
      assert.ok(warning, status);
      assert.equal(
        warning.title,
        '入会申請を承認しましたが、入会費用（¥17,766）を決済できませんでした。',
      );
      assert.ok(warning.description.startsWith(reason + FOLLOW_UP_START), status);
    }
  });

  it('falls back to a generic reason for a status the SDK does not know yet', () => {
    const unknown = {
      ...charge('declined'),
      status: 'future_status',
    } as unknown as ApproveInitialChargeDto;
    const warning = getInitialChargeWarning(unknown);
    assert.ok(warning);
    assert.ok(warning.description.startsWith('決済を完了できませんでした。' + FOLLOW_UP_START));
  });
});
