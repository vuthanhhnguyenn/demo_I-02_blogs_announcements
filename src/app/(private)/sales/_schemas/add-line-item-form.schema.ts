import { z } from 'zod';

/**
 * 明細追加 form — shared by the detail dialog (`POST billings/{billingId}/items`, API-115 §9.1) and
 * the register form (`POST billings` items[], API-115 §8.1.1). Field names are form-level; each
 * caller maps them onto the `source`-discriminated body (`contract` / `option_contract` / `custom`).
 *
 * Limits from API-115 §8.1.1: `description` 1..200, `unitPrice` integer (tax-excluded,
 * ±999,999,999), `changeReason` 1..500.
 */
export const LINE_ITEM_LABEL_MAX = 200;
export const LINE_ITEM_REASON_MAX = 500;
export const LINE_ITEM_UNIT_PRICE_MAX = 999_999_999;

export const addLineItemFormSchema = z
  .object({
    source: z.enum(['contract', 'manual']).default('contract'),
    contract_id: z.string().default(''),
    label: z
      .string()
      .max(LINE_ITEM_LABEL_MAX, `請求項目は${LINE_ITEM_LABEL_MAX}文字以内で入力してください`)
      .default(''),
    amount: z.string().default(''),
    tax_rate: z.enum(['10', '8']).default('10'),
    reason: z
      .string()
      .max(LINE_ITEM_REASON_MAX, `事由は${LINE_ITEM_REASON_MAX}文字以内で入力してください`)
      .default(''),
  })
  .superRefine((value, ctx) => {
    if (value.source === 'contract') {
      if (!value.contract_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contract_id'],
          message: '契約を選択してください',
        });
      }
      return;
    }

    if (value.label.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['label'],
        message: '請求項目を入力してください',
      });
    }

    const amountNumber = Number(value.amount);
    // Digits only: `Number()` alone would take `1e3` / `0x10` as an amount
    if (
      !/^\d+$/.test(value.amount.trim()) ||
      !Number.isInteger(amountNumber) ||
      amountNumber <= 0 ||
      amountNumber > LINE_ITEM_UNIT_PRICE_MAX
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: '請求額（税抜）を入力してください',
      });
    }

    if (value.reason.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: '事由を入力してください',
      });
    }
  });

export type AddLineItemFormValues = z.input<typeof addLineItemFormSchema>;
export type AddLineItemFormSubmitValues = z.output<typeof addLineItemFormSchema>;
