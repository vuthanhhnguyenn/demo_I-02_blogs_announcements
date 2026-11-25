import { addDays, isBefore, parse, startOfToday } from 'date-fns';
import { z } from 'zod';

import { STATUS_CHANGE_REASON_MAX_LENGTH, proxyAgreedAtSchema } from './proxy-agreement.schema';

export const WITHDRAWAL_MIN_LEAD_DAYS = 7;

export const withdrawFormSchema = z
  .object({
    scheduled_date: z.string().min(1, '退会予定日は必須です'),
    // FR-014: one free-text field, sent as the application `memo`.
    reason: z
      .string()
      .trim()
      .min(1, '退会理由は必須です')
      .max(
        STATUS_CHANGE_REASON_MAX_LENGTH,
        `退会理由は${STATUS_CHANGE_REASON_MAX_LENGTH}文字以内で入力してください`,
      ),
    // A-01 FR-017: an application filed from the CRM counter is a proxy filing by definition —
    // `CreateWithdrawalApplicationDto.applicationSource` only takes `mobile_app` | `proxy`, and
    // the staff are not the member. Both halves are required because `ApplicationProxyDto`
    // requires both; sending one alone is a 422.
    proxy_agreed_at: proxyAgreedAtSchema,
    proxy_method: z.string().min(1, '合意方法は必須です'),
  })
  .superRefine((data, ctx) => {
    if (!data.scheduled_date) return;
    const scheduled = parse(data.scheduled_date, 'yyyy-MM-dd', new Date());
    // BR-WDR-001: 通常退会 needs at least 7 days' notice.
    if (isBefore(scheduled, addDays(startOfToday(), WITHDRAWAL_MIN_LEAD_DAYS))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scheduled_date'],
        message: `退会予定日は${WITHDRAWAL_MIN_LEAD_DAYS}日以上先の日付を指定してください`,
      });
    }
  });

export type WithdrawFormValues = z.infer<typeof withdrawFormSchema>;
