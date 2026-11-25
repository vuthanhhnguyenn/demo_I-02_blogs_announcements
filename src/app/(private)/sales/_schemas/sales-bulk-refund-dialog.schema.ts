import { z } from 'zod';

import type { AdminRefundControllerBulkCreateData } from '@/lib/api-real/types.gen';

export type BulkRefundReasonCode = AdminRefundControllerBulkCreateData['body']['reasonCode'];

export const BULK_REFUND_REASON_CODES = [
  'duplicate_billing',
  'contract_cancellation',
  'billing_error',
  'member_request',
  'other',
] as const satisfies readonly BulkRefundReasonCode[];

/** API-118 §4B: `reasonCode` required, `note` optional 1–1000 chars */
export const salesBulkRefundDialogSchema = z.object({
  reason_code: z
    .string()
    .pipe(z.enum(BULK_REFUND_REASON_CODES, { error: '返金理由を選択してください' })),
  detail: z.string().max(1000, '詳細・備考は1000文字以内で入力してください').default(''),
});

export type SalesBulkRefundDialogValues = z.input<typeof salesBulkRefundDialogSchema>;
export type SalesBulkRefundDialogSubmitValues = z.output<typeof salesBulkRefundDialogSchema>;
