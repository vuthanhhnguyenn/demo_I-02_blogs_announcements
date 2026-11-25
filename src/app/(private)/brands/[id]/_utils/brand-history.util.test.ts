/**
 * Unit test for the 変更履歴 row builder (G-05 Bug_No1: 変更前 / 変更後有効開始日).
 *
 * ```sh
 * npx tsx --test "src/app/(private)/brands/[id]/_utils/brand-history.util.test.ts"
 * ```
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BrandHistoryEntryDto } from '@/lib/api-real/types.gen';

import { buildHistoryRows } from './brand-history.util';

function entry(
  changeAction: BrandHistoryEntryDto['changeAction'],
  changes: Record<string, unknown>[],
): BrandHistoryEntryDto {
  return {
    id: changeAction,
    brandEnum: 'Joyfit24',
    changeAction,
    changedAt: '2026-11-12T04:29:40.797Z',
    changedByName: 'Test HQ1',
    changes,
  } as unknown as BrandHistoryEntryDto;
}

function lines(...entries: BrandHistoryEntryDto[]) {
  return buildHistoryRows(entries, 'JOYFIT').flatMap((row) => row.changes);
}

describe('buildHistoryRows — 有効開始日 on both sides', () => {
  it('shows each side of a 予約登録 with its own date', () => {
    const [line] = lines(
      entry('fee_schedule_create', [
        {
          field: 'enrollmentFee',
          before: 2200,
          after: 3300,
          beforeEffectiveDate: '2026-10-15',
          afterEffectiveDate: '2036-07-01',
        },
      ]),
    );
    assert.deepEqual(line, {
      changedField: '予約登録: 入会金',
      beforeValue: '¥2,200（2026/10/15〜）',
      afterValue: '¥3,300（2036/07/01〜）',
    });
  });

  it('shows the cancelled 予約 and the price left in force for 予約取消', () => {
    const [line] = lines(
      entry('fee_schedule_cancel', [
        {
          field: 'enrollmentFee',
          before: 3300,
          after: 2200,
          beforeEffectiveDate: '2036-07-01',
          afterEffectiveDate: '2026-10-15',
        },
      ]),
    );
    assert.equal(line.changedField, '予約取消: 入会金');
    assert.equal(line.beforeValue, '¥3,300（2036/07/01〜）');
    assert.equal(line.afterValue, '¥2,200（2026/10/15〜）');
  });

  it('dates a 現行 correction on both sides', () => {
    const [line] = lines(
      entry('fee_update', [
        {
          field: 'registrationFee',
          before: 3000,
          after: 3300,
          beforeEffectiveDate: '2026-11-01',
          afterEffectiveDate: '2026-11-05',
        },
      ]),
    );
    assert.equal(line.changedField, '登録事務手数料 定価');
    assert.equal(line.beforeValue, '¥3,000（2026/11/01〜）');
    assert.equal(line.afterValue, '¥3,300（2026/11/05〜）');
  });

  it('keeps 「—」 for the empty side of 登録 / 削除 and no date on status lines', () => {
    const result = lines(
      entry('fee_master_register', [
        { field: 'feeMasterStatus', before: 'none', after: 'active' },
        {
          field: 'enrollmentFee',
          before: null,
          after: 0,
          beforeEffectiveDate: null,
          afterEffectiveDate: '2026-10-12',
        },
      ]),
      entry('fee_master_delete', [
        {
          field: 'enrollmentFee',
          before: 2200,
          after: null,
          beforeEffectiveDate: '2026-11-01',
          afterEffectiveDate: null,
        },
      ]),
    );
    assert.deepEqual(
      result.map((line) => [line.beforeValue, line.afterValue]),
      [
        ['未登録', '有効'],
        ['—', '¥0（2026/10/12〜）'],
        ['¥2,200（2026/11/01〜）', '—'],
      ],
    );
  });

  it('shows the amount alone when a date is missing or malformed', () => {
    const [line] = lines(
      entry('fee_update', [
        { field: 'enrollmentFee', before: 2200, after: 2310, afterEffectiveDate: '2026/11/05' },
      ]),
    );
    assert.equal(line.beforeValue, '¥2,200');
    assert.equal(line.afterValue, '¥2,310');
  });
});
