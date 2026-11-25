import { z } from 'zod';

import {
  FEE_ADJUSTMENT_PATTERNS,
  FEE_ADJUSTMENT_VALUE_RANGE,
  type FeeAdjustmentPattern,
} from '../_utils/billing-detail-api.util';

/** API-115 §10.1: `reason` max 500 */
export const FEE_ADJUSTMENT_REASON_MAX = 500;

export const billingFeeAdjustmentDialogSchema = z
  .object({
    pattern: z
      .enum(FEE_ADJUSTMENT_PATTERNS as [FeeAdjustmentPattern, ...FeeAdjustmentPattern[]])
      .default('fixed_amount'),
    value: z.string().default(''),
    reason: z
      .string()
      .max(
        FEE_ADJUSTMENT_REASON_MAX,
        `調整事由は${FEE_ADJUSTMENT_REASON_MAX}文字以内で入力してください`,
      )
      .default(''),
  })
  .superRefine((value, ctx) => {
    // API-115 §10.1.1: integer, range per pattern
    const { min, max } = FEE_ADJUSTMENT_VALUE_RANGE[value.pattern];
    const valueNumber = Number(value.value);
    if (value.value.trim().length === 0 || !Number.isInteger(valueNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: '調整値を入力してください',
      });
    } else if (valueNumber < min || valueNumber > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: `調整値は${min.toLocaleString('ja-JP')}〜${max.toLocaleString('ja-JP')}の範囲で入力してください`,
      });
    }

    if (value.reason.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: '調整事由を入力してください',
      });
    }
  });

export type BillingFeeAdjustmentDialogValues = z.input<typeof billingFeeAdjustmentDialogSchema>;
export type BillingFeeAdjustmentDialogSubmitValues = z.output<
  typeof billingFeeAdjustmentDialogSchema
>;
