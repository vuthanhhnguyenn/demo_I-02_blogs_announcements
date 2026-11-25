import { z } from 'zod';

import type { CreatePlanDto } from '@/lib/api-real/types.gen';

/**
 * 利用可能時間 rows, in the order the form lists them. 祝日 is the 8th row the client asked for
 * on 2026-08-24 (qa-185 §4); the API's `dayOfWeek` enum already carries it.
 */
export const PLAN_USAGE_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'holiday',
] as const;

export type PlanUsageDay = (typeof PLAN_USAGE_DAYS)[number];

export const PLAN_USAGE_DAY_LABELS: Record<PlanUsageDay, string> = {
  monday: '月',
  tuesday: '火',
  wednesday: '水',
  thursday: '木',
  friday: '金',
  saturday: '土',
  sunday: '日',
  holiday: '祝日',
};

/** 終日 is stored as the fixed 00:00〜24:00 window; unticking hands back an editable 23:59. */
export const ALL_DAY_OPEN = '00:00';
export const ALL_DAY_CLOSE = '24:00';
export const LAST_MINUTE_OF_DAY = '23:59';

/**
 * One row of the 曜日別 grid. `isAllDay` is a UI-only flag: the client confirmed at qa-185 §4 that
 * ticking 終日 means `openTime = 00:00` / `closeTime = 24:00` with `isClosed = false`. A row whose
 * two times are left empty is a closed day (`isClosed = true`, both times `null`) — that is how the
 * API's 休業 rows survive a round trip through a form that has no 休業 control of its own.
 */
export const usageHourSchema = z.object({
  dayOfWeek: z.enum(PLAN_USAGE_DAYS),
  openTime: z.string().default(''),
  closeTime: z.string().default(''),
  isAllDay: z.boolean().default(false),
});

// G-01 puts no digit limit on prices, so follow the shared money-input rule
// (integer, 0 or more, at most 9 digits). Unparseable text reaches the schema as NaN
// (see `numberInputHandlers`) and is reported as such, not as a missing value.
const yenAmount = (label: string, requiredMessage = `${label}を入力してください`) =>
  z
    .number({
      error: (issue) => (Number.isNaN(issue.input) ? '数字を入力してください' : requiredMessage),
    })
    // `max` runs first: zod's `int()` also rejects numbers past Number.MAX_SAFE_INTEGER, and the
    // form shows only the first issue, so a 17+ digit value would otherwise read as non-integer.
    .max(999_999_999, `${label}は9桁以内で入力してください`)
    .int(`${label}は整数で入力してください`)
    .nonnegative(`${label}は0円以上で入力してください`);

const optionalYenAmount = (label: string) => yenAmount(label).nullable().optional();

/** CreatePlanDto.monthlyVisitLimit / suspendableMonths: contract minimum is 1 (null = no limit). */
const optionalPositiveCount = z
  .number({ error: '数字を入力してください' })
  .int('整数で入力してください')
  .min(1, '1以上の値を入力してください')
  .nullable()
  .optional();

const optionalMonthCount = z
  .number({ error: '数字を入力してください' })
  .int('整数で入力してください')
  .nonnegative('0以上の値を入力してください')
  .nullable()
  .optional();

const optionalAge = z
  .number({ error: '数字を入力してください' })
  .int('整数で入力してください')
  .nonnegative('0以上の値を入力してください')
  .max(120, '120以下で入力してください')
  .nullable()
  .optional();

/** CreatePlanDto description / publicDescription / remarks maxLength. */
export const TEXT_AREA_MAX_LENGTH = 4000;

/**
 * 利用可能時間 row rules: a row with both times blank is a 休業 day (kept by design), but a single
 * blank time or a window that ends at or before it starts is rejected here instead of at the API.
 */
const usageHoursSchema = z.array(usageHourSchema).superRefine((rows, ctx) => {
  rows.forEach((row, index) => {
    if (row.isAllDay) return;
    const hasOpen = !!row.openTime;
    const hasClose = !!row.closeTime;
    if (hasOpen !== hasClose) {
      ctx.addIssue({
        code: 'custom',
        path: [index, hasOpen ? 'closeTime' : 'openTime'],
        message: hasOpen ? '終了時刻を入力してください' : '開始時刻を入力してください',
      });
    } else if (hasOpen && row.closeTime <= row.openTime) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'closeTime'],
        message: '終了時刻は開始時刻より後に設定してください',
      });
    }
  });
});

/**
 * The form speaks the API-087 vocabulary directly (`nameForMember`, `minAge`, …) so almost no
 * field has to be translated on the way in or out. The exceptions are UI-only: `isAllDay` on a
 * usage-hour row; `thumbnailS3Key`, which the API stores as a separate `plans/{planId}/images`
 * sub-resource rather than a body field; and `priceTaxIncluded` — G-01 FR-M002's 料金（税込）, sent
 * as `priceMonthly`, which the API stores tax-inclusive (API-087 v0.14).
 */
export const contractFormSchema = z
  .object({
    // Basic info
    name: z
      .string()
      .trim()
      .min(1, '主契約名を入力してください')
      .max(100, '主契約名は100文字以内で入力してください'),
    contractType: z.enum(
      [
        'general',
        'oneDay',
        'family',
        'kids',
        'student',
        'corporate',
        'welfare',
        'prepaid',
        'special',
      ],
      { error: '契約タイプを選択してください' },
    ),
    // G-01 FR-M002: 店舗 is set only for 特殊契約 / API-087 E-PLN-007
    storeId: z.string().nullable().optional(),
    otherStoreAvailable: z.boolean().optional(),

    // Brand & attributes — `brandEnum` / `parentPlanId` are immutable after creation
    // (400 E-VAL-001 on PATCH), so the edit screen renders them read-only (qa-186 §3).
    brandEnum: z.enum(['Joyfit', 'Joyfit24', 'JoyfitYoga', 'JoyfitPlus', 'Fit365'], {
      error: 'ブランドを選択してください',
    }),
    parentPlanId: z.string().nullable().optional(),
    legacyCode: z
      .string()
      .trim()
      .max(50, '旧コードは50文字以内で入力してください')
      .nullable()
      .optional(),
    isMultiUsable: z.boolean().default(false),
    hasCompanionBenefit: z.boolean().default(false),
    nameForMember: z
      .string()
      .trim()
      .max(100, '会員公開用主契約名は100文字以内で入力してください')
      .nullable()
      .optional(),
    description: z
      .string()
      .trim()
      .max(TEXT_AREA_MAX_LENGTH, `${TEXT_AREA_MAX_LENGTH}文字以内で入力してください`)
      .nullable()
      .optional(),

    // Member-facing settings
    corporateId: z.string().nullable().optional(),
    termsId: z.string().nullable().optional(),
    /** UI-only — stored through `POST /admin/plans/{planId}/images`, never in the plan body. */
    thumbnailS3Key: z.string().nullable().optional(),
    publicDescription: z
      .string()
      .trim()
      .max(TEXT_AREA_MAX_LENGTH, `${TEXT_AREA_MAX_LENGTH}文字以内で入力してください`)
      .nullable()
      .optional(),
    remarks: z
      .string()
      .trim()
      .max(TEXT_AREA_MAX_LENGTH, `${TEXT_AREA_MAX_LENGTH}文字以内で入力してください`)
      .nullable()
      .optional(),

    // Pricing
    priceTaxIncluded: yenAmount('料金', '料金を入力してください'),
    suspensionFee: optionalYenAmount('休会時請求金額'),
    cancellationFee: optionalYenAmount('違約金'),
    taxRate: z
      .number({ error: '税率を選択してください' })
      .min(0, '税率は0以上で入力してください')
      .max(100, '税率は100以下で入力してください'),
    accountingCode: z
      .string()
      .trim()
      .max(50, '会計コードは50文字以内で入力してください')
      .nullable()
      .optional(),
    enrollmentFee: optionalYenAmount('入会金'),
    registrationFee: optionalYenAmount('登録事務手数料'),
    cardIssueFee: optionalYenAmount('会員カード発行料'),
    maintenanceFee: optionalYenAmount('セキュリティ管理／施設メンテナンス料'),

    // Conditions
    usageStartDate: z
      .string({ error: '利用開始日を選択してください' })
      .min(1, '利用開始日を選択してください'),
    monthlyVisitLimit: optionalPositiveCount,
    usageHours: usageHoursSchema.default(
      PLAN_USAGE_DAYS.map((dayOfWeek) => ({
        dayOfWeek,
        openTime: ALL_DAY_OPEN,
        closeTime: ALL_DAY_CLOSE,
        isAllDay: true,
      })),
    ),

    // Suspension / withdrawal
    suspendableMonths: optionalPositiveCount,
    cancellationFeeMonths: optionalMonthCount,
    prepaidMonths: optionalMonthCount,
    sameMonthWithdrawalAllowed: z.boolean().default(false),

    // Restrictions — the API models 年齢制限 as the numeric pair `minAge` / `maxAge`
    minAge: optionalAge,
    maxAge: optionalAge,
    limitOfSex: z.enum(['none', 'male', 'female']).optional(),
    // 利用できるエリア (G-01 FR-M002): E-02 FR-016 area ids of the plan's brand group.
    areaIds: z.array(z.string()).default([]),
    isChangeable: z.boolean().optional(),
    isCopyable: z.boolean().optional(),
    hasBilling: z.boolean().optional(),

    // Status
    isActive: z.boolean().default(true),
  })
  .refine((values) => values.contractType !== 'special' || !!values.storeId, {
    message: '特殊契約の場合は店舗を選択してください',
    path: ['storeId'],
  })
  .refine((values) => values.contractType !== 'corporate' || !!values.corporateId, {
    message: '法人会員の場合は企業を選択してください',
    path: ['corporateId'],
  })
  .refine(
    (values) => values.minAge == null || values.maxAge == null || values.minAge <= values.maxAge,
    {
      message: '年齢の下限は上限以下で入力してください',
      path: ['minAge'],
    },
  );

export type ContractFormValues = z.input<typeof contractFormSchema>;
export type ContractFormSubmitValues = z.output<typeof contractFormSchema>;

/** Compile-time proof that the form's vocabulary is the API's, not a parallel one. */
export type ContractFormApiFields = Extract<keyof ContractFormSubmitValues, keyof CreatePlanDto>;
