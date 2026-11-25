import type { AuthenticatedUser } from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import { deriveAcceptState } from '@/app/api/_mock-db/tables/campaign.table';
import type { CampaignRow } from '@/app/api/_schemas/campaign.schema';
import type { StoreCampaign } from '@/app/api/_schemas/store-campaign.schema';

/**
 * G-03 permission matrix, the "select store-use campaigns" row: allowed for System /
 * Headquarter / Staff, denied for Manager / Trainer / Observer. Covers linking and unlinking.
 */
export const CAMPAIGN_LINK_ROLES: readonly AuthenticatedUser['role'][] = [
  'System',
  'Headquarter',
  'Staff',
];

const YEN = new Intl.NumberFormat('ja-JP');

function discountLeg(
  label: string,
  enabled: boolean,
  type: CampaignRow['plan_discount_month1_type'],
  value: number | null,
): string | null {
  if (!enabled || value === null) return null;
  return type === 'percentage' ? `${label}${value}%OFF` : `${label}${YEN.format(value)}円割引`;
}

/**
 * Discount summary for the campaign table. The BE design's `StoreCampaignDto` carries no summary, so
 * the mock composes one from the plan discount legs plus the option-discount count
 * (`specs/027-store-detail/spec.md` Appendix A.7).
 */
export function buildDiscountSummary(campaign: CampaignRow): string {
  const legs = [
    discountLeg(
      '入会金',
      campaign.entry_fee_discount,
      campaign.entry_fee_discount_type,
      campaign.entry_fee_discount_value,
    ),
    discountLeg(
      '初月',
      campaign.plan_discount_month1,
      campaign.plan_discount_month1_type,
      campaign.plan_discount_month1_value,
    ),
    discountLeg(
      '2ヶ月目',
      campaign.plan_discount_month2,
      campaign.plan_discount_month2_type,
      campaign.plan_discount_month2_value,
    ),
  ].filter((leg): leg is string => leg !== null);

  if (campaign.option_discounts.length > 0) {
    legs.push(`オプション割引${campaign.option_discounts.length}件`);
  }
  return legs.length > 0 ? legs.join(' + ') : '割引設定なし';
}

/** G-03 FR-002 publication scope: all stores, or an explicit store list. */
export function isPublishedToStore(campaign: CampaignRow, storeId: string): boolean {
  return campaign.publish_scope === 'all_stores' || campaign.publish_store_ids.includes(storeId);
}

export function toStoreCampaign(
  campaign: CampaignRow,
  storeId: string,
  linkedAt: string | null,
): StoreCampaign {
  return {
    id: campaign.id,
    name: campaign.name,
    brand: campaign.brand_enum,
    discount_summary: buildDiscountSummary(campaign),
    period_start: campaign.recruitment_start,
    period_end: campaign.recruitment_end,
    accept_state: deriveAcceptState(campaign),
    published_to_store: isPublishedToStore(campaign, storeId),
    linked_at: linkedAt,
  };
}

/** Every non-deleted campaign that is not already linked to the store. */
export function listCandidateCampaigns(storeId: string, keyword?: string): StoreCampaign[] {
  const linked = new Set(db.storeCampaignLinks.getByStoreId(storeId).map((row) => row.campaign_id));
  const query = keyword?.trim().toLowerCase() ?? '';
  return db.campaigns
    .getList()
    .filter((campaign) => !linked.has(campaign.id))
    .filter(
      (campaign) =>
        query === '' ||
        campaign.name.toLowerCase().includes(query) ||
        campaign.id.toLowerCase().includes(query),
    )
    .map((campaign) => toStoreCampaign(campaign, storeId, null));
}
