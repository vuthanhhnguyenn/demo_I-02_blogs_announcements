import type { CampaignDetailDto } from '@/lib/api-real/types.gen';

/** The promo-code tab only needs these fields of the campaign detail. */
export type PromoCodeCampaignRef = {
  id: string;
  name: string;
  brandEnum: CampaignDetailDto['brandEnum'];
  /** All codes issued for the campaign (unfiltered); the code list API has no `totalAllItems`. */
  promotionCodeCount: number;
};

export function toPromoCodeCampaignRef(
  campaign: Pick<CampaignDetailDto, 'campaignId' | 'name' | 'brandEnum' | 'promotionCodeCount'>,
): PromoCodeCampaignRef {
  return {
    id: campaign.campaignId,
    name: campaign.name,
    brandEnum: campaign.brandEnum,
    promotionCodeCount: campaign.promotionCodeCount,
  };
}
