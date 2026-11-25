import { z } from 'zod';

import type { CreateOptionDto, OptionDetailDto, UpdateOptionDto } from '@/lib/api-real/types.gen';

type OptionSubcategoryValue = NonNullable<CreateOptionDto['subcategory']>;

export const OPTION_BRAND_VALUES = [
  'Joyfit',
  'Joyfit24',
  'JoyfitYoga',
  'JoyfitPlus',
  'Fit365',
] as const satisfies readonly CreateOptionDto['brandEnum'][];

/** Tier-1 categories only — the 3 system-reserved ones are rejected on write (422 E-OPT-008). */
export const OPTION_WRITABLE_CATEGORY_VALUES = [
  'supplement',
  'drink',
  'rental',
  'locker_option',
  'insurance',
  'service',
] as const satisfies readonly CreateOptionDto['category'][];

/** Every category an existing option can carry — edit loads tier-2 rows too, read-only. */
export const OPTION_CATEGORY_VALUES = [
  ...OPTION_WRITABLE_CATEGORY_VALUES,
  'lesson_plan',
  'oneday_pass',
  'one_time_pass',
] as const satisfies readonly OptionDetailDto['category'][];

export function isWritableCategory(
  category: OptionDetailDto['category'],
): category is CreateOptionDto['category'] {
  return (OPTION_WRITABLE_CATEGORY_VALUES as readonly string[]).includes(category);
}

export const OPTION_SUBCATEGORY_VALUES = [
  'protein',
  'supplement',
  'tanning',
  'collagen',
  'hydrogen_water',
  'body_planner',
  'shower',
] as const satisfies readonly OptionSubcategoryValue[];

/** FR-002 3-way 課金種別; the API stores it as `paymentType` + `isAutoAssigned`. */
export const OPTION_TYPE_VALUES = [
  'regular',
  'per_use',
  'auto_assigned',
] as const satisfies readonly OptionDetailDto['optionType'][];

export const OPTION_USABILITY_VALUES = [
  'unavailable',
  'add_cancel_only',
  'full',
  'change_cancel_only',
] as const satisfies readonly NonNullable<CreateOptionDto['usability']>[];

export const OPTION_PRORATION_METHOD_VALUES = [
  'proration',
  'fixed',
] as const satisfies readonly NonNullable<CreateOptionDto['prorationMethod']>[];

export const optionFormSchema = z.object({
  brandEnum: z.enum(OPTION_BRAND_VALUES, { error: 'ブランドを選択してください' }),
  name: z
    .string()
    .trim()
    .min(1, 'オプション名を入力してください')
    .max(100, 'オプション名は100文字以内で入力してください'),
  category: z.enum(OPTION_CATEGORY_VALUES, { error: 'オプション分類を選択してください' }),
  accountCode: z.string().max(30, '会計コードは30文字以内で入力してください').default(''),
  // 備考 — internal memo. The member-facing 説明文 is `publicDescription`, which the form
  // does not edit (no input in the prototype); edit keeps whatever the option already has.
  description: z.string().max(1000, '備考は1000文字以内で入力してください').default(''),
  // Shared input/validation rule for amounts: integer, 0 or more, at most 9 digits.
  // G-02 FR-002: 料金 is entered tax-inclusive, as the API stores it (API-085 v0.12).
  feeMonthly: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce
      .number({ error: '料金を入力してください' })
      .int('料金は整数で入力してください')
      .nonnegative('0以上の値を入力してください')
      .max(999999999, '料金は0円以上・9桁以内で入力してください'),
  ),
  // G-02 FR-002: fixed two-way choice — 10% (standard rate) / 8% (reduced rate).
  taxRate: z.coerce
    .number({ error: '税率を選択してください' })
    .refine((value) => value === 8 || value === 10, '税率を選択してください'),
  isProration: z.boolean().default(false),
  prorationMethod: z.enum(OPTION_PRORATION_METHOD_VALUES).nullable().default(null),
  optionType: z.enum(OPTION_TYPE_VALUES, { error: 'オプション種別を選択してください' }),
  subcategory: z.enum(OPTION_SUBCATEGORY_VALUES).nullable().default(null),
  usability: z.enum(OPTION_USABILITY_VALUES, { error: '利用可否ルールを選択してください' }),
  isChangeableOnPlanChange: z.boolean().default(false),
  // 利用できるエリア (G-02 FR-002): E-02 FR-016 area ids of the option's brand group.
  areaIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(false),
});

export type OptionFormValues = z.input<typeof optionFormSchema>;
export type OptionFormSubmitValues = z.output<typeof optionFormSchema>;

/** An existing option loaded into the edit form. */
export function toOptionFormValues(option: OptionDetailDto): OptionFormValues {
  return {
    brandEnum: option.brandEnum,
    name: option.name,
    category: option.category,
    accountCode: option.accountCode ?? '',
    description: option.description ?? '',
    feeMonthly: option.feeMonthly,
    taxRate: option.taxRate,
    isProration: option.isProration,
    prorationMethod: option.isProration ? option.prorationMethod : null,
    optionType: option.optionType,
    subcategory: option.subcategory ?? null,
    usability: option.usability,
    isChangeableOnPlanChange: option.isChangeableOnPlanChange,
    areaIds: [...option.areaIds],
    isActive: option.isActive,
  };
}

/** Fields POST and PATCH share; brand (create-only) and status (own endpoint) are not here. */
function toOptionWriteFields(values: OptionFormSubmitValues) {
  return {
    name: values.name,
    description: values.description.trim() || null,
    accountCode: values.accountCode.trim() || null,
    subcategory: values.subcategory,
    paymentType:
      values.optionType === 'per_use' ? ('per_use' as const) : ('monthly_billing' as const),
    isAutoAssigned: values.optionType === 'auto_assigned',
    feeMonthly: values.feeMonthly,
    taxRate: values.taxRate === 8 ? (8 as const) : (10 as const),
    isProration: values.isProration,
    // Optional (G-02 FR-002 marks it neither required nor does the API): left out when unset or
    // proration is off — create then takes the API default `proration`, update keeps the stored one.
    ...(values.isProration && values.prorationMethod
      ? { prorationMethod: values.prorationMethod }
      : {}),
    usability: values.usability,
    isChangeableOnPlanChange: values.isChangeableOnPlanChange,
    areaIds: values.areaIds,
  };
}

export function toCreateOptionBody(
  values: OptionFormSubmitValues & { category: CreateOptionDto['category'] },
): CreateOptionDto {
  return {
    ...toOptionWriteFields(values),
    brandEnum: values.brandEnum,
    category: values.category,
    // `null` means "no service type" — on create that is simply leaving it out.
    subcategory: values.subcategory ?? undefined,
    isActive: values.isActive,
  };
}

/**
 * `category` is sent only when it changed: a system-reserved (tier-2) option refuses any
 * `category` in the body (422 E-OPT-009), even its own value.
 */
export function toUpdateOptionBody(
  values: OptionFormSubmitValues,
  initialCategory: OptionDetailDto['category'],
): UpdateOptionDto {
  const body: UpdateOptionDto = toOptionWriteFields(values);
  if (values.category !== initialCategory && isWritableCategory(values.category)) {
    body.category = values.category;
  }
  return body;
}
