import { EMAIL_MAX_LENGTH } from '@/constants/app.constants';
import { z } from 'zod';

export const magicLinkFormSchema = z.object({
  // 入力欄では `maxLength` で切り詰めず、このスキーマでエラー表示する。
  // メッセージ未指定だと Zod 既定の英語文言が表示されるため、必ず日本語を明示する。
  email: z
    .string()
    .min(1, { message: 'メールアドレスは必須です' })
    .max(EMAIL_MAX_LENGTH, `メールアドレスは${EMAIL_MAX_LENGTH}文字以内で入力してください`)
    .email({ message: '正しいメールアドレスを入力してください' }),
});

export type MagicLinkFormSchema = z.infer<typeof magicLinkFormSchema>;
