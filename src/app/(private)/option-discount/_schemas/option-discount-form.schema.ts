import { z } from 'zod';

import type {
  CreateOptionSetDto,
  OptionSetDetailDto,
  UpdateOptionSetDto,
} from '@/lib/api-real/types.gen';

const DISCOUNT_TYPES = ['fixed_amount', 'percentage'] as const satisfies ReadonlyArray<
  CreateOptionSetDto['discountType']
>;

const APPLICATION_CONDITIONS = [
  'simultaneous_only',
  'existing_members_included',
  'family_two_or_more',
] as const satisfies ReadonlyArray<CreateOptionSetDto['applicationCondition']>;

export const optionDiscountFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'セット割名は必須です')
      .max(100, 'セット割名は100文字以内で入力してください'),
    description: z.string().max(1000, '説明は1000文字以内で入力してください').default(''),
    // The API takes at least two distinct options (422 E-SET-003).
    optionIds: z.array(z.string()).min(2, '対象オプションを2つ以上選択してください'),
    discountType: z.enum(DISCOUNT_TYPES, { error: '割引タイプを選択してください' }),
    discountValue: z.preprocess(
      (value) => (value === '' || value === null || value === undefined ? undefined : value),
      z.coerce
        .number({ error: '割引金額/率は必須です' })
        .nonnegative('0以上の値を入力してください'),
    ),
    applicationCondition: z.enum(APPLICATION_CONDITIONS, {
      error: '適用条件を選択してください',
    }),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.discountType === 'percentage' && value.discountValue > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['discountValue'],
        message: '割引率は100%以下で入力してください',
      });
    }
    // A fixed amount is whole yen; only a percentage may carry decimals.
    if (value.discountType === 'fixed_amount' && !Number.isInteger(value.discountValue)) {
      ctx.addIssue({
        code: 'custom',
        path: ['discountValue'],
        message: '割引金額は整数で入力してください',
      });
    }
  });

export type OptionDiscountFormValues = z.input<typeof optionDiscountFormSchema>;
export type OptionDiscountFormSubmitValues = z.output<typeof optionDiscountFormSchema>;

export const emptyDefaults: OptionDiscountFormValues = {
  name: '',
  description: '',
  optionIds: [],
  discountType: undefined as unknown as OptionDiscountFormSubmitValues['discountType'],
  discountValue: undefined,
  applicationCondition:
    undefined as unknown as OptionDiscountFormSubmitValues['applicationCondition'],
  isActive: true,
};

export function toOptionDiscountFormValues(detail: OptionSetDetailDto): OptionDiscountFormValues {
  return {
    name: detail.name,
    description: detail.description ?? '',
    optionIds: detail.items.map((item) => item.optionId),
    discountType: detail.discountType,
    discountValue: detail.discountValue,
    applicationCondition: detail.applicationCondition,
    isActive: detail.isActive,
  };
}

/** Fields POST and PATCH share; status is create-only here — an edit goes through `/active`. */
function toOptionSetWriteFields(values: OptionDiscountFormSubmitValues) {
  return {
    name: values.name,
    description: values.description.trim() || null,
    optionIds: values.optionIds,
    discountType: values.discountType,
    discountValue: values.discountValue,
    applicationCondition: values.applicationCondition,
  };
}

export function toCreateOptionSetBody(values: OptionDiscountFormSubmitValues): CreateOptionSetDto {
  return { ...toOptionSetWriteFields(values), isActive: values.isActive };
}

/**
 * `optionIds` is sent only when the item set changed. The API re-checks every listed option
 * (FIT365 + active), so resending an unchanged set that holds an option deactivated since would
 * answer `422 E-SET-002` and block even a rename (verified on dev 2026-10-01); omitting it keeps
 * the current items.
 */
export function toUpdateOptionSetBody(
  values: OptionDiscountFormSubmitValues,
  currentOptionIds: readonly string[],
): UpdateOptionSetDto {
  const { optionIds, ...rest } = toOptionSetWriteFields(values);
  const current = new Set(currentOptionIds);
  const itemsChanged =
    optionIds.length !== current.size || optionIds.some((optionId) => !current.has(optionId));
  return itemsChanged ? { ...rest, optionIds } : rest;
}
