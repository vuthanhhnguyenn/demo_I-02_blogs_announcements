import { TEXT_MAX_LENGTH } from '@/constants/app.constants';
import { z } from 'zod';

/**
 * Y-13 FR-M002 (L181) のパスワードポリシー: 8文字以上、英大文字・英小文字・数字をそれぞれ1文字以上。
 * 記号は要件に含まれない。
 */
export function checkPasswordRequirements(password: string) {
  return {
    length: password.length >= 8,
    upperLower: /[A-Z]/.test(password) && /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

/** IdP 側がフォームより厳しいポリシーを返した場合に表示する文言。 */
export const PASSWORD_POLICY_REJECTED_MESSAGE =
  'パスワードがポリシーを満たしていません。8文字以上で、英大文字・英小文字・数字をそれぞれ1文字以上含めてください。';

/** IdP が直近3世代のパスワード再利用を拒否した場合（`PasswordHistoryPolicyViolationException`）に表示する文言。 */
export const PASSWORD_REUSED_MESSAGE =
  '過去に使用したパスワードは設定できません。直近3回以内に使用したパスワード以外を設定してください。';

export function isPasswordPolicySatisfied(password: string) {
  return Object.values(checkPasswordRequirements(password)).every(Boolean);
}

export function getPasswordStrength(requirements: ReturnType<typeof checkPasswordRequirements>) {
  return Object.values(requirements).filter(Boolean).length;
}

export const passwordSetFormSchema = z
  .object({
    // メッセージ未指定だと Zod 既定の英語文言がそのまま画面に出るため、必ず日本語を明示する。
    newPassword: z
      .string()
      .max(TEXT_MAX_LENGTH, `パスワードは${TEXT_MAX_LENGTH}文字以内で入力してください`)
      .refine(isPasswordPolicySatisfied, {
        message: 'パスワードの要件を満たしていません',
      }),
    confirmPassword: z
      .string()
      .max(TEXT_MAX_LENGTH, `パスワードは${TEXT_MAX_LENGTH}文字以内で入力してください`),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

export type PasswordSetFormValues = z.infer<typeof passwordSetFormSchema>;
