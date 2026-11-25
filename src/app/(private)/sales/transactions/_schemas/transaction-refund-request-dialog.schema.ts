import { z } from 'zod';

import { parseRefundAmount } from '../../_utils/refund-amount.util';

/** API-118 §4: `applicationReason` 1–500 chars */
export const REFUND_REASON_MAX_LENGTH = 500;

/**
 * FR-004 / S1–S2: partial refund per 明細. Each line's amount is optional (blank or 0 = not
 * refunded) but must be a whole yen ≤ that line's `refundableAmount` (BR-REF-003); at least one
 * line must be refunded. `caps` is indexed like `lines`.
 */
export const createTransactionRefundRequestDialogSchema = (caps: number[]) =>
  z
    .object({
      lines: z.array(
        z.object({
          billingItemId: z.string(),
          amount: z.string(),
        }),
      ),
      reason: z
        .string()
        .max(
          REFUND_REASON_MAX_LENGTH,
          `返金事由は${REFUND_REASON_MAX_LENGTH}文字以内で入力してください`,
        ),
    })
    .superRefine((value, ctx) => {
      if (value.reason.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reason'],
          message: '返金事由を入力してください',
        });
      }

      let refundedLineCount = 0;
      value.lines.forEach((line, index) => {
        const raw = line.amount.trim();
        if (raw.length === 0) return;
        const amount = parseRefundAmount(raw);
        // Half-width digits only: `-1`, `10.5`, `1e2` and full-width `１００` are refused, not coerced
        if (amount === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['lines', index, 'amount'],
            message: '返金額は0以上の整数で入力してください',
          });
          return;
        }
        if (amount > (caps[index] ?? 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['lines', index, 'amount'],
            message: '返金可能残高を超えています',
          });
          return;
        }
        if (amount > 0) refundedLineCount += 1;
      });

      if (refundedLineCount === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lines'],
          message: '返金する明細の金額を入力してください',
        });
      }
    });

export type TransactionRefundRequestDialogValues = z.input<
  ReturnType<typeof createTransactionRefundRequestDialogSchema>
>;
export type TransactionRefundRequestDialogSubmitValues = z.output<
  ReturnType<typeof createTransactionRefundRequestDialogSchema>
>;
