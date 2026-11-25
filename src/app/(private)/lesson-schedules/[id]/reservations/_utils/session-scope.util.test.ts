/**
 * Unit test for `isScheduleScopeDenied` — D-01 Bug-No9: a Staff who opens another store's
 * 予約詳細 URL got 「レッスン情報の取得に失敗しました」 cards instead of 「アクセス権限がありません」.
 * API-112 §5.1 / §6.10 #3 answers a schedule outside the caller's scope with 404 `E-LSC-001`
 * (existence not disclosed), so the page must read that 404 as "no access" for every scoped role,
 * not only for a Trainer.
 *
 * ```sh
 * npx tsx "src/app/(private)/lesson-schedules/[id]/reservations/_utils/session-scope.util.test.ts"
 * ```
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { UserRole } from '@/types/permission.type';

import { isScheduleScopeDenied } from './session-scope.util';

describe('isScheduleScopeDenied', () => {
  it('a store-scoped or own-session role with 404 E-LSC-001 → denied (goes to /403)', () => {
    for (const role of [UserRole.Manager, UserRole.Staff, UserRole.Observer, UserRole.Trainer]) {
      assert.equal(isScheduleScopeDenied(role, 'E-LSC-001'), true, role);
    }
  });

  it('HQ / system read every store, so their 404 is a real "not found" → not denied', () => {
    assert.equal(isScheduleScopeDenied(UserRole.Headquarter, 'E-LSC-001'), false);
    assert.equal(isScheduleScopeDenied(UserRole.System, 'E-LSC-001'), false);
  });

  it('any other error, or no error, keeps the page error state', () => {
    assert.equal(isScheduleScopeDenied(UserRole.Staff, undefined), false);
    assert.equal(isScheduleScopeDenied(UserRole.Staff, 'E-SYS-001'), false);
    assert.equal(isScheduleScopeDenied(UserRole.Staff, 'E-LSB-030'), false);
  });

  it('no signed-in user yet → not denied', () => {
    assert.equal(isScheduleScopeDenied(undefined, 'E-LSC-001'), false);
  });
});
