import { COGNITO_EMAIL_MAX_LENGTH } from '@/constants/app.constants';
import { z } from 'zod';

export const loginSchema = z.object({
  // メール＋パスワードのログインは Cognito InitiateAuth を直接呼ぶ（経路②）ため、上限は
  // Cognito の username 上限 128 文字（API-070 §3.5.6）。Google ログインはこのフォームを通らない。
  email: z
    .string()
    .min(1, { message: 'メールアドレスは必須です' })
    .max(COGNITO_EMAIL_MAX_LENGTH, {
      message: `メールアドレスは${COGNITO_EMAIL_MAX_LENGTH}文字以内で入力してください`,
    })
    .check(z.email({ error: '有効なメールアドレスを入力してください' })),
  password: z.string().min(1, { message: 'パスワードは必須です' }),
});

export type LoginSchema = z.infer<typeof loginSchema>;
