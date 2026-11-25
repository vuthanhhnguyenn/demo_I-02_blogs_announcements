import type {
  CampaignDetailDto,
  CreateCampaignDto,
  UpdateCampaignDto,
} from '@/lib/api-real/types.gen';

import { asNullableEnum } from '../_utils/campaign-wire';
import {
  CAMPAIGN_FORM_DEFAULT_VALUES,
  type CampaignFormValues,
  type DiscountRowValues,
  EMPTY_DISCOUNT_ROW,
} from './campaign-form.schema';

type DiscountType = NonNullable<CampaignDetailDto['planDiscountType']>;

function toNumberOrNull(value: string): number | null {
  return value === '' ? null : Number(value);
}

function discountTypeOf(row: DiscountRowValues): DiscountType | null {
  if (row.amount !== '') return 'fixed_amount';
  if (row.rate !== '') return 'percentage';
  return null;
}

function discountValueOf(row: DiscountRowValues): number | null {
  if (row.amount !== '') return Number(row.amount);
  if (row.rate !== '') return Number(row.rate);
  return null;
}

/**
 * API-088 は対象ごとに割引 (type + value) を1つだけ持つ。フォームも対象ごとに1行のため、そのまま写す。
 */
function buildDiscountPayload(values: CampaignFormValues) {
  const rows = values.discountEnabled ? values.discountRows : [];

  const entryFee = rows.find((row) => row.target === 'entry_fee');
  const plan = rows.find((row) => row.target === 'plan');

  return {
    planDiscountType: asNullableEnum(plan ? discountTypeOf(plan) : null),
    planDiscountValue: plan ? discountValueOf(plan) : null,
    campaignOptionDiscounts: rows
      .filter((row) => row.target === 'option' && row.optionId)
      .map((row) => ({
        optionId: row.optionId,
        discountType: discountTypeOf(row) ?? undefined,
        discountValue: discountValueOf(row),
      })),
    enrollmentFeeDiscountType: asNullableEnum(entryFee ? discountTypeOf(entryFee) : null),
    enrollmentFeeDiscountValue: entryFee ? discountValueOf(entryFee) : null,
  };
}

function buildCreateBody(values: CampaignFormValues) {
  const referralOn = values.referralEnabled;
  const tiered = referralOn && values.referralTieredIncrease;
  return {
    name: values.name,
    campaignCode: values.campaignCode === '' ? null : values.campaignCode,
    remarks: values.remarks === '' ? null : values.remarks,
    isAccepting: values.isAccepting,
    capacityLimit: toNumberOrNull(values.entryCap),
    cancellationFeeMonths: toNumberOrNull(values.lockInMonths),
    recruitmentStart: values.recruitmentStart,
    recruitmentEnd: values.recruitmentEnd,
    usageStart: values.usageStart || null,
    usageEnd: values.usageEnd || null,
    applyStartMonth: values.applyStartMonth,
    applyStartSpecificN:
      values.applyStartMonth === 'specific_month'
        ? toNumberOrNull(values.applyStartSpecificN)
        : null,
    applyDurationMonths: toNumberOrNull(values.applyDurationMonths),
    planId: values.planId,
    ...buildDiscountPayload(values),
    campaignAutoOptions: values.autoGrantEnabled
      ? values.autoGrantOptionIds.map((optionId) => ({
          optionId,
          targetSexes: values.autoGrantTarget === 'conditional' ? values.autoGrantSexes : null,
        }))
      : [],
    referralBasePoints: referralOn ? toNumberOrNull(values.referralPoints) : null,
    referralPointsAnnualReset: referralOn && values.referralAnnualReset,
    referralTiers: tiered
      ? [
          {
            minReferralCount: Number(values.referralTierThreshold),
            points: Number(values.referralTierPoints),
          },
        ]
      : [],
  };
}

export function toCampaignCreateBody(values: CampaignFormValues): CreateCampaignDto {
  return {
    ...buildCreateBody(values),
    brandEnum: values.brandEnum,
    publishScope: values.publishScope,
    publishedStoreIds: values.publishScope === 'specific_stores' ? values.publishStoreIds : [],
  };
}

/**
 * PATCH writes only the acceptance controls (API-088 v0.16): any other key is 409 E-CMP-002 whatever its value,
 * and the published stores are saved through `PUT ~/published-stores`.
 *
 * Only the controls the operator changed (against `baseline`, the values the form opened with) are sent, so a
 * stale form cannot overwrite what another session changed in a control this operator never touched.
 */
export function toCampaignUpdateBody(
  values: CampaignFormValues,
  baseline: CampaignFormValues,
): UpdateCampaignDto {
  const body: UpdateCampaignDto = {};
  if (values.isAccepting !== baseline.isAccepting) body.isAccepting = values.isAccepting;
  if (values.entryCap !== baseline.entryCap) body.capacityLimit = toNumberOrNull(values.entryCap);
  return body;
}

function amountRateOf(type: DiscountType | null, value: number | null) {
  return {
    amount: type === 'fixed_amount' && value !== null ? String(value) : '',
    rate: type === 'percentage' && value !== null ? String(value) : '',
  };
}

/** 詳細レスポンスをフォームの初期値に戻す。編集・複製の双方から使う。 */
export function toCampaignFormValues(campaign: CampaignDetailDto): CampaignFormValues {
  const entryFeeRows: DiscountRowValues[] =
    campaign.enrollmentFeeDiscountType !== null && campaign.enrollmentFeeDiscountValue !== null
      ? [
          {
            target: 'entry_fee',
            optionId: '',
            ...amountRateOf(
              campaign.enrollmentFeeDiscountType,
              campaign.enrollmentFeeDiscountValue,
            ),
          },
        ]
      : [];
  const planRows: DiscountRowValues[] =
    campaign.planDiscountType !== null && campaign.planDiscountValue !== null
      ? [
          {
            target: 'plan',
            optionId: '',
            ...amountRateOf(campaign.planDiscountType, campaign.planDiscountValue),
          },
        ]
      : [];
  const optionRows: DiscountRowValues[] = campaign.campaignOptionDiscounts.map((entry) => ({
    target: 'option',
    optionId: entry.optionId,
    ...amountRateOf(entry.discountType, entry.discountValue),
  }));
  const discountRows = [...entryFeeRows, ...planRows, ...optionRows];

  const autoOptionSexes = campaign.campaignAutoOptions.find(
    (entry) => entry.targetSexes !== null,
  )?.targetSexes;
  const firstTier = campaign.referralTiers[0];
  const referralEnabled = campaign.referralBasePoints !== null;

  return {
    ...CAMPAIGN_FORM_DEFAULT_VALUES,
    name: campaign.name,
    campaignCode: campaign.campaignCode ?? '',
    brandEnum: campaign.brandEnum,
    entryCap: campaign.capacityLimit === null ? '' : String(campaign.capacityLimit),
    lockInMonths:
      campaign.cancellationFeeMonths === null ? '' : String(campaign.cancellationFeeMonths),
    remarks: campaign.remarks ?? '',
    publishScope: campaign.publishScope,
    publishStoreIds: campaign.publishedStores.map((store) => store.storeId),
    recruitmentStart: campaign.recruitmentStart,
    recruitmentEnd: campaign.recruitmentEnd,
    usageStart: campaign.usageStart ?? '',
    usageEnd: campaign.usageEnd ?? '',
    applyStartMonth: campaign.applyStartMonth ?? 'first_month',
    applyStartSpecificN:
      campaign.applyStartSpecificN === null ? '' : String(campaign.applyStartSpecificN),
    applyDurationMonths:
      campaign.applyDurationMonths === null ? '' : String(campaign.applyDurationMonths),
    planId: campaign.planId,
    discountEnabled: discountRows.length > 0,
    discountRows: discountRows.length > 0 ? discountRows : [EMPTY_DISCOUNT_ROW],
    referralEnabled,
    referralPoints: campaign.referralBasePoints === null ? '' : String(campaign.referralBasePoints),
    referralTieredIncrease: firstTier !== undefined,
    referralTierThreshold: firstTier ? String(firstTier.minReferralCount) : '',
    referralTierPoints: firstTier ? String(firstTier.points) : '',
    referralAnnualReset: campaign.referralPointsAnnualReset,
    autoGrantEnabled: campaign.campaignAutoOptions.length > 0,
    autoGrantTarget: autoOptionSexes ? 'conditional' : 'all',
    autoGrantSexes: autoOptionSexes ?? [],
    autoGrantOptionIds: campaign.campaignAutoOptions.map((entry) => entry.optionId),
    optionNames: Object.fromEntries(
      [...campaign.campaignOptionDiscounts, ...campaign.campaignAutoOptions].flatMap((entry) =>
        entry.optionName ? [[entry.optionId, entry.optionName]] : [],
      ),
    ),
    isAccepting: campaign.isAccepting,
  };
}

/**
 * G-03 FR-S003 複製: 全設定をコピーし、名称に「（コピー）」を付与、
 * 誤公開防止のため受付可否は停止で初期化する。
 */
export function toDuplicatedFormValues(campaign: CampaignDetailDto): CampaignFormValues {
  return {
    ...toCampaignFormValues(campaign),
    name: `${campaign.name}（コピー）`,
    campaignCode: '',
    isAccepting: false,
  };
}
