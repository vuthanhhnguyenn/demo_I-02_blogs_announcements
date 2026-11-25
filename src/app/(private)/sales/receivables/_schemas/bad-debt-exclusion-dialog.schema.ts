import { z } from 'zod';

/** API-117 §9.1.2 / §9.2.2: `reason` 1–500 chars */
export const BAD_DEBT_REASON_MAX_LENGTH = 500;

export const badDebtExclusionDialogSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, '理由を入力してください')
    .max(
      BAD_DEBT_REASON_MAX_LENGTH,
      `理由は${BAD_DEBT_REASON_MAX_LENGTH}文字以内で入力してください`,
    ),
});

export type BadDebtExclusionDialogValues = z.infer<typeof badDebtExclusionDialogSchema>;
