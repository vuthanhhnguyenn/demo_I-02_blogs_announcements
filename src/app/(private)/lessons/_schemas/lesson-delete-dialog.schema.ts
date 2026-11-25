import { z } from 'zod';

/** API-111 DELETE `deleteReason`: required, at most 500 characters. */
export const LESSON_DELETE_REASON_MAX_LENGTH = 500;

export const lessonDeleteReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, '理由を入力してください')
    .max(
      LESSON_DELETE_REASON_MAX_LENGTH,
      `理由は${LESSON_DELETE_REASON_MAX_LENGTH}文字以内で入力してください`,
    ),
});

export type LessonDeleteReasonValues = z.infer<typeof lessonDeleteReasonSchema>;
