'use client'; // Cognito ConfirmForgotPassword submission + inline error/phase state
import { useState } from 'react';

import Link from 'next/link';

import {
  PASSWORD_POLICY_REJECTED_MESSAGE,
  PASSWORD_REUSED_MESSAGE,
  type PasswordSetFormValues,
} from '@/app/(public)/(auth)/_schemas/password-set-form.schema';
import { CheckCircle } from 'lucide-react';

import { CognitoAuthError, useCognitoAuth } from '@/hooks/use-cognito-auth';

import { PasswordSetForm } from '@/components/common/auth/password-set-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { navigate } from '@/lib/routes/routes.util';

import { PasswordResetExpiredState } from './password-reset-expired-state';

interface PasswordResetConfirmFormProps {
  email: string;
  code: string;
}

// Collapsed per contracts/cognito-forgot-password.md — the spec doesn't require distinguishing
// *why* a link no longer works, only that it doesn't (FR-009).
// `LimitExceededException` is deliberately NOT here: it is AWS's per-user hourly attempt cap, the
// code itself is still valid, and sending the user back to request another mail only burns more
// of the same quota (Y-13 Bug-02).
const EXPIRED_ERROR_TYPES = new Set([
  'ExpiredCodeException',
  'CodeMismatchException',
  'UserNotFoundException',
]);

type Phase = 'form' | 'done' | 'expired';
type SubmitError = 'retry' | 'password-policy' | 'password-reused' | 'limit-exceeded';

const SUBMIT_ERROR_MESSAGES: Record<SubmitError, string> = {
  retry: 'パスワードの設定に失敗しました。もう一度お試しください。',
  'password-policy': PASSWORD_POLICY_REJECTED_MESSAGE,
  'password-reused': PASSWORD_REUSED_MESSAGE,
  'limit-exceeded': '試行回数の上限に達しました。しばらく時間をおいてから再度お試しください。',
};

function toSubmitError(type: string): SubmitError {
  switch (type) {
    // IdP のポリシーがフォームより厳しい場合、原因が分かる文言を出す。
    case 'InvalidPasswordException':
      return 'password-policy';
    // FR-M002: 直近3世代のパスワード再利用は不可。
    case 'PasswordHistoryPolicyViolationException':
      return 'password-reused';
    case 'LimitExceededException':
      return 'limit-exceeded';
    default:
      return 'retry';
  }
}

export function PasswordResetConfirmForm({ email, code }: PasswordResetConfirmFormProps) {
  const { confirmForgotPassword } = useCognitoAuth();
  const [phase, setPhase] = useState<Phase>('form');
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(data: PasswordSetFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await confirmForgotPassword({ email, code, newPassword: data.newPassword });
      setPhase('done');
    } catch (error) {
      if (error instanceof CognitoAuthError) {
        if (EXPIRED_ERROR_TYPES.has(error.type)) {
          setPhase('expired');
        } else {
          setSubmitError(toSubmitError(error.type));
        }
      } else {
        throw error;
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (phase === 'expired') {
    return <PasswordResetExpiredState />;
  }

  if (phase === 'done') {
    return (
      <Card className="w-100">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-success/10 rounded-full p-4">
              <CheckCircle className="text-success size-8" />
            </div>
          </div>
          <div className="space-y-1 text-center">
            <CardTitle className="text-lg">パスワードを設定しました</CardTitle>
            <CardDescription>新しいパスワードでログインできます。</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href={navigate('/login')}>ログイン画面へ</Link>}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <PasswordSetForm
      title="新しいパスワードを設定"
      description="安全なパスワードを設定してください"
      submitLabel="パスワードを設定する"
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      banner={
        submitError && (
          <Alert variant="destructive">
            <AlertDescription>{SUBMIT_ERROR_MESSAGES[submitError]}</AlertDescription>
          </Alert>
        )
      }
    />
  );
}
