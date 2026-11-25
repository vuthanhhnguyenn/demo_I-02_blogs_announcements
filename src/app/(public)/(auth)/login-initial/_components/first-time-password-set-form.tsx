'use client'; // Cognito challenge submission + inline error state
import { useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  PASSWORD_POLICY_REJECTED_MESSAGE,
  PASSWORD_REUSED_MESSAGE,
  type PasswordSetFormValues,
} from '@/app/(public)/(auth)/_schemas/password-set-form.schema';
import { LOGIN_ERROR_CODES } from '@/constants/auth-error-codes.constants';
import { persistStaffSession } from '@/utils/auth.util';
import { useMutation } from '@tanstack/react-query';

import { CognitoAuthError, useCognitoAuth } from '@/hooks/use-cognito-auth';

import { PasswordSetForm } from '@/components/common/auth/password-set-form';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { crmAuthControllerLoginMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { ErrorResponseDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

interface FirstTimePasswordSetFormProps {
  challenge: { username: string; session: string; inviteToken: string };
  onExpired: () => void;
}

type InlineError = 'retry' | 'account-status' | 'password-policy' | 'password-reused' | null;

/**
 * FR-005/FR-006 forced new-password screen for the Cognito temporary-password flow.
 * Wraps the shared `PasswordSetForm` with this flow's title/copy and Cognito submit logic.
 */
export function FirstTimePasswordSetForm({ challenge, onExpired }: FirstTimePasswordSetFormProps) {
  const router = useRouter();
  const { respondToNewPassword } = useCognitoAuth();
  const [inlineError, setInlineError] = useState<InlineError>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginMutation = useMutation({
    ...crmAuthControllerLoginMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: (data) => {
      persistStaffSession(data);
      router.push(navigate('/login-initial/success'));
    },
    onError: (error: ErrorResponseDto) => {
      if (
        error.code === LOGIN_ERROR_CODES.STAFF_NOT_FOUND ||
        error.code === LOGIN_ERROR_CODES.STAFF_DEACTIVATED
      ) {
        setInlineError('account-status');
      } else if (
        error.code === LOGIN_ERROR_CODES.INVITE_NOT_FOUND ||
        error.code === LOGIN_ERROR_CODES.INVITE_USED ||
        error.code === LOGIN_ERROR_CODES.INVITE_REVOKED ||
        error.code === LOGIN_ERROR_CODES.INVITE_EXPIRED
      ) {
        onExpired();
      } else {
        setInlineError('retry');
      }
    },
  });

  async function onSubmit(data: PasswordSetFormValues) {
    setInlineError(null);
    setIsSubmitting(true);
    try {
      const result = await respondToNewPassword({
        username: challenge.username,
        session: challenge.session,
        newPassword: data.newPassword,
      });

      if (result.AuthenticationResult?.IdToken) {
        loginMutation.mutate({
          body: {
            idToken: result.AuthenticationResult.IdToken,
            inviteToken: challenge.inviteToken,
          },
        });
      }
    } catch (error) {
      if (error instanceof CognitoAuthError) {
        // IdP のポリシーがフォームより厳しい場合、原因が分かる文言を出す（汎用の再試行案内では伝わらない）。
        // FR-M002: 直近3世代のパスワード再利用（一時パスワードを含む）は IdP が拒否する。
        if (error.type === 'InvalidPasswordException') {
          setInlineError('password-policy');
        } else if (error.type === 'PasswordHistoryPolicyViolationException') {
          setInlineError('password-reused');
        } else {
          setInlineError('retry');
        }
      } else {
        throw error;
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PasswordSetForm
      title="パスワードを設定"
      description="初回ログインでは新しいパスワードの設定が必要です"
      submitLabel="パスワードを設定する"
      isSubmitting={isSubmitting || loginMutation.isPending}
      onSubmit={onSubmit}
      banner={
        <>
          {inlineError === 'retry' && (
            <Alert variant="destructive">
              <AlertDescription>
                パスワードの設定に失敗しました。もう一度お試しください。
              </AlertDescription>
            </Alert>
          )}
          {inlineError === 'password-policy' && (
            <Alert variant="destructive">
              <AlertDescription>{PASSWORD_POLICY_REJECTED_MESSAGE}</AlertDescription>
            </Alert>
          )}
          {inlineError === 'password-reused' && (
            <Alert variant="destructive">
              <AlertDescription>{PASSWORD_REUSED_MESSAGE}</AlertDescription>
            </Alert>
          )}
          {inlineError === 'account-status' && (
            <Alert variant="destructive">
              <AlertDescription>
                このアカウントはご利用いただけません。本部管理者にお問い合わせください。
              </AlertDescription>
            </Alert>
          )}
        </>
      }
    />
  );
}
