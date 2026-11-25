import { z } from 'zod';

import { isManualBillingMonthAllowed } from '../_utils/billing-month.util';

/** API-115 §8.1 `POST /admin/sales/billings` — header fields */
export const manualRegistrationFormSchema = z.object({
  store_id: z.string().min(1, '店舗を選択してください'),
  member_id: z.string().min(1, '利用者を選択してください'),
  billing_month: z
    .string()
    .min(1, '適用月を入力してください')
    // API-115 §8.1: 適用月 is the current month or later (else 400 E-VAL-001)
    .refine(isManualBillingMonthAllowed, '適用月は当月以降を選択してください'),
  notes: z.string().max(1000, 'メモは1000文字以内で入力してください').default(''),
});

export type ManualRegistrationFormValues = z.input<typeof manualRegistrationFormSchema>;
export type ManualRegistrationFormSubmitValues = z.output<typeof manualRegistrationFormSchema>;

/**
 * The register screen's 明細追加 dialog (draft line before the billing exists). Bounds follow
 * API-115 §8.1.1 `source = custom`: `description` 1–200, integer `unitPrice`, `taxRate` 8 / 10,
 * `changeReason` ≤ 500 (required by FR-011 for a custom line).
 */
export const manualDraftLineItemSchema = z
  .object({
    source: z.enum(['contract', 'manual']).default('contract'),
    contract_key: z.string().default(''),
    label: z.string().max(200, '請求項目は200文字以内で入力してください').default(''),
    amount: z.string().default(''),
    tax_rate: z.enum(['10', '8']).default('10'),
    reason: z.string().max(500, '事由は500文字以内で入力してください').default(''),
  })
  .superRefine((value, ctx) => {
    if (value.source === 'contract') {
      if (!value.contract_key) {
        ctx.addIssue({ code: 'custom', path: ['contract_key'], message: '契約を選択してください' });
      }
      return;
    }

    if (value.label.trim().length === 0) {
      ctx.addIssue({ code: 'custom', path: ['label'], message: '請求項目を入力してください' });
    }

    const amountNumber = Number(value.amount);
    // Digits only: `Number()` alone would take `1e3` / `0x10` as an amount
    if (
      !/^\d+$/.test(value.amount.trim()) ||
      !Number.isInteger(amountNumber) ||
      amountNumber <= 0 ||
      amountNumber > 999_999_999
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount'],
        message: '請求額（税抜）を入力してください',
      });
    }

    if (value.reason.trim().length === 0) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: '事由を入力してください' });
    }
  });

export type ManualDraftLineItemValues = z.input<typeof manualDraftLineItemSchema>;
export type ManualDraftLineItemSubmitValues = z.output<typeof manualDraftLineItemSchema>;
