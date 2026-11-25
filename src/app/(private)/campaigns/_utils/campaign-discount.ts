import type { CampaignDetailDto } from '@/lib/api-real/types.gen';

type CampaignDiscountType = NonNullable<CampaignDetailDto['planDiscountType']>;

/** 詳細画面の割引1行。対象 (主契約 / オプション) と対象名、値の表示文言を持つ。 */
export type CampaignDiscountLine = {
  target: '主契約' | 'オプション';
  targetName: string;
  value: string;
};

/** 割引の値部分の表示文言 (例: 50%OFF / 1,000円引き / 無料)。割引率100%は「無料」。 */
export function formatDiscountValue(type: CampaignDiscountType | null, value: number | null) {
  if (type === null || value === null) return '';
  if (type === 'percentage') return value >= 100 ? '無料' : `${value}%OFF`;
  return `${value.toLocaleString()}円引き`;
}

/** 割引1行の表示文言 (例: レギュラー会員 50%OFF / 水素水 1,000円引き)。 */
export function formatDiscountLine(line: { targetName: string; value: string }): string {
  return line.value ? `${line.targetName} ${line.value}` : line.targetName;
}

/** 入会金割引の表示文言。設定が無いときは null。 */
export function entryFeeDiscountText(campaign: CampaignDetailDto): string | null {
  return (
    formatDiscountValue(campaign.enrollmentFeeDiscountType, campaign.enrollmentFeeDiscountValue) ||
    null
  );
}

/** 主契約・オプションの割引行 (主契約 → オプションの順)。 */
export function buildDiscountLines(campaign: CampaignDetailDto): CampaignDiscountLine[] {
  const lines: CampaignDiscountLine[] = [];

  if (campaign.planDiscountType !== null && campaign.planDiscountValue !== null) {
    lines.push({
      target: '主契約',
      targetName: campaign.planName,
      value: formatDiscountValue(campaign.planDiscountType, campaign.planDiscountValue),
    });
  }

  campaign.campaignOptionDiscounts.forEach((entry) => {
    if (entry.discountType === null || entry.discountValue === null) return;
    lines.push({
      target: 'オプション',
      targetName: entry.optionName,
      value: formatDiscountValue(entry.discountType, entry.discountValue),
    });
  });

  return lines;
}

/**
 * 割引設定から割引概要を自動生成する (V0: 手入力欄は持たない)。入会金 → 主契約・オプション の順。
 * 例: 入会金 無料 / レギュラー会員 50%OFF
 */
export function buildDiscountSummary(campaign: CampaignDetailDto): string {
  const entryFee = entryFeeDiscountText(campaign);
  const lines = buildDiscountLines(campaign);
  const segments = [
    entryFee ? `入会金 ${entryFee}` : null,
    lines.length > 0 ? lines.map(formatDiscountLine).join('・') : null,
  ].filter((segment): segment is string => segment !== null);

  return segments.length > 0 ? segments.join(' / ') : '割引なし';
}
