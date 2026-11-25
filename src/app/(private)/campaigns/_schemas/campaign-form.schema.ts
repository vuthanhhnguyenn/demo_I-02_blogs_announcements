import { z } from 'zod';

import { CAMPAIGN_BRAND_VALUES } from '../_constants/constants';

const NUMERIC_MAX = 999_999_999;
const NUMERIC_MAX_LABEL = '999,999,999';

/** 数値入力は空文字を許すため文字列で保持し、送信時に number|null へ寄せる。 */
const numericText = (message: string, options?: { min?: number; max?: number }) =>
  z
    .string()
    .trim()
    .refine(
      (value) => {
        if (value === '') return true;
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return false;
        if (options?.min !== undefined && parsed < options.min) return false;
        if (options?.max !== undefined && parsed > options.max) return false;
        return true;
      },
      { message },
    );

/** 割引率は0〜100、小数第1位まで (API-088: `percentage` = 0–100 with one decimal max)。 */
const percentageText = (message: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) => {
        if (value === '') return true;
        if (!/^\d+(\.\d)?$/.test(value)) return false;
        const parsed = Number(value);
        return parsed >= 0 && parsed <= 100;
      },
      { message },
    );

/**
 * 割引行 — 対象 (主契約 / オプション / 入会金) ごとに割引額か割引率のいずれかを設定する。
 */
export const discountRowSchema = z.object({
  target: z.enum(['plan', 'option', 'entry_fee']),
  optionId: z.string().trim(),
  amount: numericText(`割引額は0〜${NUMERIC_MAX_LABEL}の整数で入力してください`, {
    min: 0,
    max: NUMERIC_MAX,
  }),
  rate: percentageText('割引率は0〜100（小数第1位まで）で入力してください'),
});

export type DiscountRowValues = z.infer<typeof discountRowSchema>;

export const EMPTY_DISCOUNT_ROW: DiscountRowValues = {
  target: 'plan',
  optionId: '',
  amount: '',
  rate: '',
};

/** Errors about the amount/rate pair — bound to `amount`, but both inputs are flagged in the UI. */
export const DISCOUNT_VALUE_MISSING_MESSAGE = '割引額または割引率を入力してください';
export const DISCOUNT_VALUE_CONFLICT_MESSAGE = '割引額と割引率は同時に設定できません';
export const DISCOUNT_VALUE_PAIR_MESSAGES: readonly string[] = [
  DISCOUNT_VALUE_MISSING_MESSAGE,
  DISCOUNT_VALUE_CONFLICT_MESSAGE,
];

function validateDiscountRows(rows: DiscountRowValues[], ctx: z.RefinementCtx) {
  const path = 'discountRows';
  const entryFeeIndexes = rows.flatMap((row, index) => (row.target === 'entry_fee' ? [index] : []));
  entryFeeIndexes.slice(1).forEach((index) => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path, index, 'target'],
      message: '入会金の割引は1行のみ設定できます',
    });
  });

  rows.forEach((row, index) => {
    const hasAmount = row.amount !== '';
    const hasRate = row.rate !== '';

    if (row.target === 'option' && !row.optionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path, index, 'optionId'],
        message: 'オプションを選択してください',
      });
    }
    if (!hasAmount && !hasRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path, index, 'amount'],
        message: DISCOUNT_VALUE_MISSING_MESSAGE,
      });
    }
    if (hasAmount && hasRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path, index, 'amount'],
        message: DISCOUNT_VALUE_CONFLICT_MESSAGE,
      });
    }
  });
}

/**
 * API-088 stores ONE discount (type + value) per target, so the same target (plan / option) can only
 * appear once. The form mirrors that: one row per target.
 */
function validateUniqueTargets(rows: DiscountRowValues[], ctx: z.RefinementCtx) {
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    if (row.target === 'entry_fee' || (row.target === 'option' && !row.optionId)) return;
    const key = row.target === 'option' ? `option:${row.optionId}` : row.target;
    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountRows', index, 'target'],
        message: '同じ対象の割引は1行にまとめてください',
      });
    }
    seen.add(key);
  });
}

const entryCapSchema = numericText(
  `先着件数上限は1〜${NUMERIC_MAX_LABEL}の整数で入力してください`,
  { min: 1, max: NUMERIC_MAX },
);
const publishScopeSchema = z.enum(['all_stores', 'specific_stores']).default('all_stores');
const publishStoreIdsSchema = z.array(z.string()).default([]);

function validatePublishStores(
  value: { publishScope: string; publishStoreIds: string[] },
  ctx: z.RefinementCtx,
) {
  if (value.publishScope === 'specific_stores' && value.publishStoreIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['publishStoreIds'],
      message: '公開対象店舗を1つ以上選択してください',
    });
  }
}

export const campaignFormSchema = z
  .object({
    // Section 1: 基本情報
    name: z
      .string()
      .trim()
      .min(1, 'キャンペーン名を入力してください')
      .max(100, 'キャンペーン名は100文字以内で入力してください'),
    campaignCode: z
      .string()
      .trim()
      .max(50, 'キャンペーンコードは50文字以内で入力してください')
      .default(''),
    brandEnum: z.enum(CAMPAIGN_BRAND_VALUES, { error: 'ブランドを選択してください' }),
    entryCap: entryCapSchema,
    lockInMonths: numericText(`縛り期間は0〜${NUMERIC_MAX_LABEL}の整数で入力してください`, {
      min: 0,
      max: NUMERIC_MAX,
    }),
    remarks: z.string().trim().max(4000, '備考は4000文字以内で入力してください').default(''),

    // Section 2: 公開店舗設定
    publishScope: publishScopeSchema,
    publishStoreIds: publishStoreIdsSchema,

    // Section 3: 期間設定
    recruitmentStart: z.string().min(1, '募集期間の開始日を選択してください'),
    recruitmentEnd: z.string().min(1, '募集期間の終了日を選択してください'),
    usageStart: z.string().min(1, '利用開始期間の開始日を選択してください'),
    usageEnd: z.string().min(1, '利用開始期間の終了日を選択してください'),
    applyStartMonth: z.enum(['first_month', 'next_month', 'specific_month']).default('first_month'),
    applyStartSpecificN: numericText(`開始月は1〜${NUMERIC_MAX_LABEL}の整数で入力してください`, {
      min: 1,
      max: NUMERIC_MAX,
    }),
    applyDurationMonths: numericText(`適用期間は1〜${NUMERIC_MAX_LABEL}の整数で入力してください`, {
      min: 1,
      max: NUMERIC_MAX,
    }),

    // Section 4: 適用主契約・適用条件
    planId: z.string().trim().min(1, '適用主契約を選択してください'),

    // Section 5: 割引設定
    discountEnabled: z.boolean().default(false),
    discountRows: z.array(discountRowSchema).default([EMPTY_DISCOUNT_ROW]),

    // Section 6: 紹介キャンペーン設定
    referralEnabled: z.boolean().default(false),
    referralPoints: numericText(`特典ポイントは0〜${NUMERIC_MAX_LABEL}の整数で入力してください`, {
      min: 0,
      max: NUMERIC_MAX,
    }),
    referralTieredIncrease: z.boolean().default(false),
    referralTierThreshold: numericText(
      `段階的増加の開始人数は1〜${NUMERIC_MAX_LABEL}で入力してください`,
      { min: 1, max: NUMERIC_MAX },
    ),
    referralTierPoints: numericText(
      `段階的増加後のポイントは0〜${NUMERIC_MAX_LABEL}で入力してください`,
      { min: 0, max: NUMERIC_MAX },
    ),
    referralAnnualReset: z.boolean().default(true),

    // Section 7: 自動付与設定
    autoGrantEnabled: z.boolean().default(false),
    autoGrantTarget: z.enum(['all', 'conditional']).default('all'),
    autoGrantSexes: z.array(z.enum(['male', 'female', 'other', 'prefer_not_to_say'])).default([]),
    autoGrantOptionIds: z.array(z.string()).default([]),

    /**
     * Display-only id → name map for the options picked in sections 5 and 7. Not sent to the API: it lets a saved
     * option keep its name when it is outside the loaded picker page (paginated, active-only).
     */
    optionNames: z.record(z.string(), z.string()).default({}),

    // Section 8: 受付可否
    isAccepting: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (
      value.recruitmentStart &&
      value.recruitmentEnd &&
      value.recruitmentStart > value.recruitmentEnd
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recruitmentEnd'],
        message: '募集期間の終了日は開始日以降にしてください',
      });
    }

    if (value.usageStart && value.usageEnd && value.usageStart > value.usageEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['usageEnd'],
        message: '利用開始期間の終了日は開始日以降にしてください',
      });
    }

    if (value.applyStartMonth === 'specific_month' && value.applyStartSpecificN === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['applyStartSpecificN'],
        message: 'X月指定の場合は開始月を入力してください',
      });
    }

    if (value.applyDurationMonths === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['applyDurationMonths'],
        message: '適用期間を入力してください',
      });
    }

    validatePublishStores(value, ctx);

    if (value.discountEnabled) {
      validateDiscountRows(value.discountRows, ctx);
      validateUniqueTargets(value.discountRows, ctx);
    }

    if (value.referralEnabled && value.referralPoints === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['referralPoints'],
        message: '紹介者への特典ポイントを入力してください',
      });
    }

    if (value.referralEnabled && value.referralTieredIncrease) {
      if (value.referralTierThreshold === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['referralTierThreshold'],
          message: '段階的増加の開始人数を入力してください',
        });
      }
      if (value.referralTierPoints === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['referralTierPoints'],
          message: '段階的増加後のポイントを入力してください',
        });
      }
    }

    if (value.autoGrantEnabled) {
      if (value.autoGrantOptionIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['autoGrantOptionIds'],
          message: '自動付与するオプションを1つ以上選択してください',
        });
      }
      if (value.autoGrantTarget === 'conditional' && value.autoGrantSexes.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['autoGrantSexes'],
          message: '条件ありの場合は性別条件を1つ以上選択してください',
        });
      }
    }
  });

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

/**
 * A registered campaign keeps its content (G-03 #276, API-088 v0.16): only the acceptance flag, the capacity
 * limit and the published stores can change, so only those are validated and the locked fields pass through.
 */
export const campaignEditFormSchema = z
  .looseObject({
    entryCap: entryCapSchema,
    publishScope: publishScopeSchema,
    publishStoreIds: publishStoreIdsSchema,
    isAccepting: z.boolean(),
  })
  .superRefine(validatePublishStores);

export const CAMPAIGN_FORM_DEFAULT_VALUES: CampaignFormValues = {
  name: '',
  campaignCode: '',
  brandEnum: 'Fit365',
  entryCap: '',
  lockInMonths: '',
  remarks: '',
  publishScope: 'all_stores',
  publishStoreIds: [],
  recruitmentStart: '',
  recruitmentEnd: '',
  usageStart: '',
  usageEnd: '',
  applyStartMonth: 'first_month',
  applyStartSpecificN: '',
  applyDurationMonths: '',
  planId: '',
  discountEnabled: false,
  discountRows: [EMPTY_DISCOUNT_ROW],
  referralEnabled: false,
  referralPoints: '',
  referralTieredIncrease: false,
  referralTierThreshold: '',
  referralTierPoints: '',
  referralAnnualReset: true,
  autoGrantEnabled: false,
  autoGrantTarget: 'all',
  autoGrantSexes: [],
  autoGrantOptionIds: [],
  optionNames: {},
  isAccepting: true,
};
