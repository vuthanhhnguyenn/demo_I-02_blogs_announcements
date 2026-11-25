import type { DefaultValues } from 'react-hook-form';

import { z } from 'zod';

/**
 * A-01 FR-S001 ポイント手動返還 — the dialog collects the amount and a mandatory reason.
 *
 * `brandGroup` is not a form field: the contract requires it to equal the member's own
 * brand group (points are brand-locked, BR-PNT-007), so it is read from the member record
 * at submit time instead of being offered as a choice.
 *
 * Both bounds mirror `CreatePointRefundDto`. The reason cap is 500 — the prototype's
 * textarea allows 1000, but the endpoint rejects anything longer with
 * `400 E-VAL-001 / too_long`, so the contract wins (PO, 2026-09-29). The textarea does not
 * cut the text at the cap; the inline message tells the operator it is too long.
 */
export const POINT_REFUND_MIN = 1;
export const POINT_REFUND_MAX = 100_000;
export const POINT_REFUND_REASON_MAX_LENGTH = 500;

export const PointRefundFormSchema = z.object({
  // Kept as the input's string and converted on submit: a number input still accepts exponent
  // notation, which a numeric coercion would silently turn from "1e2" into 100.
  points: z
    .string({ error: '返還ポイントを入力してください' })
    .trim()
    .min(1, '返還ポイントを入力してください')
    .superRefine((value, ctx) => {
      const amount = Number(value);
      if (!/^-?\d+(\.\d+)?$/.test(value) || !Number.isInteger(amount)) {
        ctx.addIssue({ code: 'custom', message: '返還ポイントは整数で入力してください' });
      } else if (amount < POINT_REFUND_MIN) {
        ctx.addIssue({
          code: 'custom',
          message: `返還ポイントは${POINT_REFUND_MIN}以上で入力してください`,
        });
      } else if (amount > POINT_REFUND_MAX) {
        ctx.addIssue({
          code: 'custom',
          message: `返還ポイントは${POINT_REFUND_MAX.toLocaleString()}以下で入力してください`,
        });
      }
    }),
  reason: z
    .string()
    .trim()
    .min(1, '返還理由を入力してください')
    .max(
      POINT_REFUND_REASON_MAX_LENGTH,
      `返還理由は${POINT_REFUND_REASON_MAX_LENGTH}文字以内で入力してください`,
    ),
});

export type PointRefundFormInput = z.input<typeof PointRefundFormSchema>;
export type PointRefundFormValues = z.output<typeof PointRefundFormSchema>;

export const POINT_REFUND_DEFAULT_VALUES: DefaultValues<PointRefundFormInput> = {
  points: undefined,
  reason: '',
};
