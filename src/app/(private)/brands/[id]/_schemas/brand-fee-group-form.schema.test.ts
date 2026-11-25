/**
 * Unit test for the 費用マスタ sheet schema (BUG-021-U4-02, BUG-021-U4-07).
 *
 * The repo has no test runner wired into `package.json` yet — run this file with
 * Node's built-in runner through tsx (which resolves the `@/…` tsconfig paths):
 *
 * ```sh
 * npx tsx --test "src/app/(private)/brands/[id]/_schemas/brand-fee-group-form.schema.test.ts"
 * ```
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FUTURE_CURRENT_DATE_MESSAGE,
  MAX_FEE_VALUE_MESSAGE,
  MAX_FEE_VALUE_YEN,
  REQUIRED_DATE_MESSAGE,
  buildBrandFeeGroupFormSchema,
} from './brand-fee-group-form.schema';

function dateString(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}/${month}/${day}`;
}

const TODAY = dateString(0);
const TOMORROW = dateString(1);
const LAST_MONTH = dateString(-30);

type ItemInput = {
  effectiveStartDate?: string;
  originalEffectiveStartDate?: string | null;
  currentValueIncludingTaxYen?: number;
  scheduledChanges?: { effectiveStartDate: string; valueIncludingTaxYen: number }[];
};

function item(input: ItemInput = {}) {
  return {
    feeType: 'enrollmentFee',
    itemName: '入会金',
    originalEffectiveStartDate: LAST_MONTH,
    effectiveStartDate: LAST_MONTH,
    currentValueIncludingTaxYen: 2200,
    scheduledChanges: [],
    ...input,
  };
}

/** `path → messages` for every issue, e.g. `feeItems.1.effectiveStartDate`. */
function issuesOf(mode: 'edit' | 'register', feeItems: unknown[]): Map<string, string[]> {
  const result = buildBrandFeeGroupFormSchema(mode).safeParse({ feeItems });
  const issues = new Map<string, string[]>();
  if (result.success) return issues;
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    issues.set(key, [...(issues.get(key) ?? []), issue.message]);
  }
  return issues;
}

describe('buildBrandFeeGroupFormSchema — 変更', () => {
  it('accepts a valid card', () => {
    assert.equal(issuesOf('edit', [item(), item()]).size, 0);
  });

  it('rejects a future 現行 date (Δ11)', () => {
    const issues = issuesOf('edit', [item({ effectiveStartDate: TOMORROW })]);
    assert.deepEqual(issues.get('feeItems.0.effectiveStartDate'), [FUTURE_CURRENT_DATE_MESSAGE]);
  });

  it('accepts today as the 現行 date', () => {
    assert.equal(issuesOf('edit', [item({ effectiveStartDate: TODAY })]).size, 0);
  });

  it('shows Δ11 together with an empty 予約 row on the same item (BUG-021-U4-02)', () => {
    const issues = issuesOf('edit', [
      item(),
      item({
        effectiveStartDate: TOMORROW,
        scheduledChanges: [{ effectiveStartDate: '', valueIncludingTaxYen: Number.NaN }],
      }),
    ]);
    assert.deepEqual(issues.get('feeItems.1.effectiveStartDate'), [FUTURE_CURRENT_DATE_MESSAGE]);
    assert.deepEqual(issues.get('feeItems.1.scheduledChanges.0.effectiveStartDate'), [
      REQUIRED_DATE_MESSAGE,
    ]);
    assert.deepEqual(issues.get('feeItems.1.scheduledChanges.0.valueIncludingTaxYen'), [
      '定価（税込）を入力してください',
    ]);
  });

  it('shows the TC-032 set plus Δ11 all at once (TC-104)', () => {
    const emptyRow = { effectiveStartDate: '', valueIncludingTaxYen: Number.NaN };
    const issues = issuesOf('edit', [
      item({ currentValueIncludingTaxYen: Number.NaN, scheduledChanges: [emptyRow] }),
      item({
        effectiveStartDate: TOMORROW,
        currentValueIncludingTaxYen: -1,
        scheduledChanges: [emptyRow],
      }),
    ]);
    assert.ok(issues.has('feeItems.0.currentValueIncludingTaxYen'));
    assert.ok(issues.has('feeItems.0.scheduledChanges.0.effectiveStartDate'));
    assert.ok(issues.has('feeItems.0.scheduledChanges.0.valueIncludingTaxYen'));
    assert.ok(issues.has('feeItems.1.currentValueIncludingTaxYen'));
    assert.ok(issues.has('feeItems.1.scheduledChanges.0.effectiveStartDate'));
    assert.ok(issues.has('feeItems.1.scheduledChanges.0.valueIncludingTaxYen'));
    assert.deepEqual(issues.get('feeItems.1.effectiveStartDate'), [FUTURE_CURRENT_DATE_MESSAGE]);
    assert.equal(issues.has('feeItems.0.effectiveStartDate'), false);
  });

  it('gives an empty 定価 only the "required" message', () => {
    const issues = issuesOf('edit', [item({ currentValueIncludingTaxYen: Number.NaN })]);
    assert.deepEqual(issues.get('feeItems.0.currentValueIncludingTaxYen'), [
      '定価（税込）を入力してください',
    ]);
  });

  it('caps 定価 at the API maximum on both 現行 and 予約 (Y-07 - Bug No.1)', () => {
    const issues = issuesOf('edit', [
      item({
        currentValueIncludingTaxYen: 9_999_999_999,
        scheduledChanges: [
          { effectiveStartDate: TOMORROW, valueIncludingTaxYen: MAX_FEE_VALUE_YEN + 1 },
        ],
      }),
    ]);
    assert.deepEqual(issues.get('feeItems.0.currentValueIncludingTaxYen'), [MAX_FEE_VALUE_MESSAGE]);
    assert.deepEqual(issues.get('feeItems.0.scheduledChanges.0.valueIncludingTaxYen'), [
      MAX_FEE_VALUE_MESSAGE,
    ]);
  });

  it('accepts 定価 equal to the API maximum', () => {
    const issues = issuesOf('edit', [item({ currentValueIncludingTaxYen: MAX_FEE_VALUE_YEN })]);
    assert.equal(issues.size, 0);
  });

  it('rejects a 現行 date before the price in force', () => {
    const issues = issuesOf('edit', [item({ effectiveStartDate: dateString(-60) })]);
    assert.match(
      issues.get('feeItems.0.effectiveStartDate')?.[0] ?? '',
      /より前の日付は指定できません/,
    );
  });

  it('still checks 予約 dates while another row is incomplete', () => {
    const issues = issuesOf('edit', [
      item({
        scheduledChanges: [
          { effectiveStartDate: LAST_MONTH, valueIncludingTaxYen: 2310 },
          { effectiveStartDate: '', valueIncludingTaxYen: Number.NaN },
        ],
      }),
    ]);
    assert.deepEqual(issues.get('feeItems.0.scheduledChanges.0.effectiveStartDate'), [
      '現行の有効開始日と重複しています',
    ]);
  });
});

describe('buildBrandFeeGroupFormSchema — 登録', () => {
  const blank = { originalEffectiveStartDate: null };

  it('rejects a future 有効開始日 (BUG-021-U4-07)', () => {
    const issues = issuesOf('register', [
      item({ ...blank, effectiveStartDate: TOMORROW }),
      item({ ...blank, effectiveStartDate: LAST_MONTH }),
    ]);
    assert.deepEqual(issues.get('feeItems.0.effectiveStartDate'), [FUTURE_CURRENT_DATE_MESSAGE]);
    assert.equal(issues.has('feeItems.1.effectiveStartDate'), false);
  });

  it('shows Δ11 together with an empty 定価', () => {
    const issues = issuesOf('register', [
      item({ ...blank, effectiveStartDate: TOMORROW, currentValueIncludingTaxYen: Number.NaN }),
    ]);
    assert.deepEqual(issues.get('feeItems.0.effectiveStartDate'), [FUTURE_CURRENT_DATE_MESSAGE]);
    assert.ok(issues.has('feeItems.0.currentValueIncludingTaxYen'));
  });

  it('has no "not before the price in force" rule', () => {
    const issues = issuesOf('register', [
      item({ originalEffectiveStartDate: TODAY, effectiveStartDate: LAST_MONTH }),
    ]);
    assert.equal(issues.size, 0);
  });

  it('caps 定価 at the API maximum (Y-07 - Bug No.1)', () => {
    const issues = issuesOf('register', [
      item({ ...blank, currentValueIncludingTaxYen: MAX_FEE_VALUE_YEN + 1 }),
    ]);
    assert.deepEqual(issues.get('feeItems.0.currentValueIncludingTaxYen'), [MAX_FEE_VALUE_MESSAGE]);
  });

  it('requires the date', () => {
    const issues = issuesOf('register', [item({ ...blank, effectiveStartDate: '' })]);
    assert.deepEqual(issues.get('feeItems.0.effectiveStartDate'), [REQUIRED_DATE_MESSAGE]);
  });
});
