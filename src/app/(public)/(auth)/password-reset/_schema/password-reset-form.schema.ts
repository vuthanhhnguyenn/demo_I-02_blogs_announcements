import { COGNITO_EMAIL_MAX_LENGTH } from '@/constants/app.constants';
import { z } from 'zod';

export const passwordResetFormSchema = z.object({
  // 入力欄では `maxLength` で切り詰めず、超過分もそのまま入力させたうえでこのスキーマで
  // エラー表示する。メッセージを省略すると Zod 既定の英語文言が画面に出てしまうため必須。
  // この画面は Cognito を直接呼ぶ（経路②のスタッフ専用）ため、上限は Cognito の username 上限
  // 128 文字（API-070 §3.5.6）。超過時は Cognito を呼ばない。
  email: z
    .string()
    .min(1, { message: 'メールアドレスは必須です' })
    .max(
      COGNITO_EMAIL_MAX_LENGTH,
      `メールアドレスは${COGNITO_EMAIL_MAX_LENGTH}文字以内で入力してください`,
    )
    .email({ message: '正しいメールアドレスを入力してください' }),
});

export type PasswordResetFormSchema = z.infer<typeof passwordResetFormSchema>;
