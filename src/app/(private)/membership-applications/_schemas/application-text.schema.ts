import { REASON_MAX_LENGTH, TEXTAREA_MAX_LENGTH } from '@/constants/app.constants';
import { z } from 'zod';

/** メモ — `AddMemoDto.memo` maxLength. */
export const MEMO_MAX_LENGTH = 2000;

const maxLengthMessage = (label: string, max: number) =>
  `${label}は${max}文字以内で入力してください`;

/**
 * Free-text caps of the decision / memo inputs, as the API validates them: reject comment and
 * cancel reason 500 (`RejectApplicationDto` / `CancelApplicationDto`), staff waiver reason
 * 1–1000 (`ApproveApplicationDto.enrollmentFeeWaiver`), memo 2000. Reported as a field error —
 * the inputs carry no `maxLength` (C-BUG-02).
 */
export const rejectSupplementSchema = z
  .string()
  .max(REASON_MAX_LENGTH, { message: maxLengthMessage('補足', REASON_MAX_LENGTH) });

export const cancelReasonSchema = z
  .string()
  .max(REASON_MAX_LENGTH, { message: maxLengthMessage('取り消し理由', REASON_MAX_LENGTH) });

export const staffWaiverReasonSchema = z
  .string()
  .max(TEXTAREA_MAX_LENGTH, { message: maxLengthMessage('免除理由', TEXTAREA_MAX_LENGTH) });

export const memoSchema = z
  .string()
  .max(MEMO_MAX_LENGTH, { message: maxLengthMessage('メモ', MEMO_MAX_LENGTH) });

/** 申請ID・氏名 search — `GET /admin/applications` `query` maxLength. */
export const SEARCH_QUERY_MAX_LENGTH = 60;

export const searchQuerySchema = z.string().max(SEARCH_QUERY_MAX_LENGTH, {
  message: maxLengthMessage('検索キーワード', SEARCH_QUERY_MAX_LENGTH),
});

/** The first error message for `value`, or undefined when it passes. */
export function textError(schema: z.ZodType<string>, value: string): string | undefined {
  const result = schema.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}
