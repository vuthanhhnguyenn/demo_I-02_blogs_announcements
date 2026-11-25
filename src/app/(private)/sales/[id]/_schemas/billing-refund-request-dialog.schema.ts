import { z } from 'zod';

/** API-118 §4 `applicationReason` 1..500 (FR-004 返金事由 required) */
export const REFUND_REASON_MAX = 500;

export const billingRefundRequestDialogSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, '返金事由を入力してください')
    .max(REFUND_REASON_MAX, `返金事由は${REFUND_REASON_MAX}文字以内で入力してください`),
});

export type BillingRefundRequestDialogValues = z.infer<typeof billingRefundRequestDialogSchema>;
