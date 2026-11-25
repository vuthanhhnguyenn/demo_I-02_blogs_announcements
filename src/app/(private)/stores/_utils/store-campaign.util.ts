import type { CampaignSummaryDto } from '@/lib/api-real/types.gen';

import type { StoreCampaignAcceptState } from '../_constants/constants';

// 割引概要 removed by API-088 §3.3 (BE MR !691, Otaki Q&A ①): the store-campaign row
// carries no discount fields any more and the column is not in the FR.
// Kept for when the column comes back; it would read the campaign detail (EP 2) instead.
// const YEN = new Intl.NumberFormat('ja-JP');
//
// type DiscountType = CampaignSummaryDto['planDiscountType'];
//
// /** 50%OFF / ¥1,000引き / 無料 (100%) — the value part of a discount, as the prototype words it */
// function discountValueLabel(type: DiscountType, value: number): string {
//   if (type === 'percentage') return value >= 100 ? '無料' : `${value}%OFF`;
//   return `¥${YEN.format(value)}引き`;
// }
//
// /**
//  * 割引概要 of a campaign. Follows the prototype's `buildDiscountSummary` (`fitness-crm-ui`
//  * `src/data/campaigns.ts`) since the Y-02 requirements only name the column: 入会金 first, then
//  * `初月:`, then `翌月:`; legs joined by ` / `, several items inside one month joined by `・`;
//  * nothing discounted → 割引なし. The API sends the parts, so the summary is composed here: the
//  * main-contract discount shows its value only (the campaign targets one plan), an option discount
//  * is prefixed with the option name.
//  */
// export function buildCampaignDiscountSummary(campaign: CampaignSummaryDto): string {
//   const legs: string[] = [];
//
//   if (campaign.enrollmentFeeDiscountValue !== null) {
//     legs.push(
//       `入会金 ${discountValueLabel(campaign.enrollmentFeeDiscountType, campaign.enrollmentFeeDiscountValue)}`,
//     );
//   }
//
//   const months = [
//     { label: '初月', plan: campaign.planDiscountMonth1, optionKey: 'discountMonth1' },
//     { label: '翌月', plan: campaign.planDiscountMonth2, optionKey: 'discountMonth2' },
//   ] as const;
//
//   for (const { label, plan, optionKey } of months) {
//     const items: string[] = [];
//     if (plan && campaign.planDiscountValue !== null) {
//       items.push(discountValueLabel(campaign.planDiscountType, campaign.planDiscountValue));
//     }
//     for (const option of campaign.campaignOptionDiscounts) {
//       if (!option[optionKey]) continue;
//       const value = discountValueLabel(option.discountType, option.discountValue);
//       items.push(option.optionName ? `${option.optionName} ${value}` : value);
//     }
//     if (items.length > 0) legs.push(`${label}: ${items.join('・')}`);
//   }
//
//   return legs.length > 0 ? legs.join(' / ') : '割引なし';
// }

/** 受付可否 badge state — `acceptingStatus` is the source; `isAccepting` cannot express 上限到達 */
export function campaignAcceptState(campaign: CampaignSummaryDto): StoreCampaignAcceptState {
  switch (campaign.acceptingStatus) {
    case 'accepting':
      return 'accepting';
    case 'capacity_reached':
      return 'capacity_reached';
    default:
      return 'stopped';
  }
}
