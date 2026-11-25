import type { BrandFeeGroup } from '../_types/brand-fee.type';
import { formatYen } from './brand-fee.util';

/** Same placeholder the fee card shows for an item with no current price. */
const EMPTY_VALUE = '—';

/** 「入会金 ¥2,200・登録事務手数料 ¥3,300」 — the items and amounts as they stand, not fixed copy. */
export function buildFeeItemsSummary(feeGroup: BrandFeeGroup): string {
  return feeGroup.feeItems
    .map(
      (item) =>
        `${item.itemName} ${
          item.currentValueIncludingTaxYen === null
            ? EMPTY_VALUE
            : formatYen(item.currentValueIncludingTaxYen)
        }`,
    )
    .join('・');
}

export function countScheduledChanges(feeGroup: BrandFeeGroup): number {
  return feeGroup.feeItems.reduce((total, item) => total + item.scheduledChanges.length, 0);
}

/**
 * The prototype's 「変わらないもの」 list — only facts the requirements state: the sub-brand is a
 * fixed value (Y-07 FR-002 / 260928_v3 FR-001) and an enrolled member's fees are fixed at
 * enrollment (G-05 FR-005).
 */
export function buildUnchangedItems(feeGroup: BrandFeeGroup): string[] {
  return [
    `${feeGroup.ownerLabel}（店舗で選ぶ区分）`,
    `${feeGroup.ownerName} の店舗・会員の登録`,
    '入会済みの会員の入会時の費用（入会した時の金額で確定しています）',
  ];
}
