'use client'; // interactive form state + Cognito ForgotPassword submission
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import Link from 'next/link';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle } from 'lucide-react';

import { CognitoAuthError, useCognitoAuth } from '@/hooks/use-cognito-auth';
import { useResendCooldown } from '@/hooks/use-resend-cooldown';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { navigate } from '@/lib/routes/routes.util';

import {
  type PasswordResetFormSchema,
  passwordResetFormSchema,
} from '../_schema/password-reset-form.schema';

// research.md R3 / Y-13 FR-M006_L221 — account existence must never be inferable from this screen.
// Cognito does not consistently signal an unknown address: besides `UserNotFoundException` it can
// reject with `InvalidParameterException` ("no registered/verified email or phone_number"), and the
// branch it picks depends on the username string itself, so two unregistered addresses one character
// apart used to render different screens. Hence a deny-list: every account-state rejection renders
// the success screen, and only a failure to perform the send at all surfaces as an error.
// Kept in step with the ForgotPassword error list in the Cognito API reference; the ones left out
// (UserNotFound, InvalidParameter, NotAuthorized, UserLambdaValidation) describe the account.
// Split by what the user can do about it: wait and retry, or ask an administrator.
const RETRYABLE_SEND_FAILURE_TYPES = new Set([
  'LimitExceededException',
  'TooManyRequestsException',
  'InternalErrorException',
  'ServiceUnavailableException',
]);
/** Delivery and user pool configuration/permission failures — retrying cannot fix these. */
const MISCONFIGURED_SEND_FAILURE_TYPES = new Set([
  'CodeDeliveryFailureException',
  'InvalidEmailRoleAccessPolicyException',
  'InvalidSmsRoleAccessPolicyException',
  'InvalidSmsRoleTrustRelationshipException',
  'InvalidLambdaResponseException',
  'UnexpectedLambdaException',
  'ResourceNotFoundException',
  'OperationNotEnabledException',
  'ForbiddenException',
]);

type SendError = 'retryable' | 'misconfigured';

const SEND_ERROR_MESSAGES: Record<SendError, string> = {
  retryable: 'メールの送信に失敗しました。時間をおいて再度お試しください。',
  misconfigured: 'メールの送信に失敗しました。管理者にお問い合わせください。',
};

export function PasswordResetForm() {
  const { forgotPassword } = useCognitoAuth();
  const [phase, setPhase] = useState<'form' | 'sent'>('form');
  const [sentEmail, setSentEmail] = useState('');
  const cooldown = useResendCooldown();
  const [sendError, setSendError] = useState<SendError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetFormSchema>({
    resolver: zodResolver(passwordResetFormSchema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  });

  function markSent(email: string) {
    setSentEmail(email);
    setPhase('sent');
    cooldown.start();
  }

  async function send(email: string) {
    setSendError(null);
    setIsSubmitting(true);
    try {
      await forgotPassword({ email });
      markSent(email);
    } catch (error) {
      if (error instanceof CognitoAuthError) {
        if (MISCONFIGURED_SEND_FAILURE_TYPES.has(error.type)) {
          setSendError('misconfigured');
          return;
        }
        // Unknown / unverified / disabled account — indistinguishable from a successful send by design.
        if (!RETRYABLE_SEND_FAILURE_TYPES.has(error.type)) {
          markSent(email);
          return;
        }
      }
      // Throttling, a Cognito outage, or a network failure: the mail genuinely was not sent, and a
      // non-CognitoAuthError (fetch rejection) must surface here too rather than escape unhandled.
      setSendError('retryable');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(data: PasswordResetFormSchema) {
    await send(data.email);
  }

  function handleResend() {
    if (cooldown.isCoolingDown) return;
    void send(sentEmail);
  }

  return (
    <Card className="w-100">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">パスワードの再設定</CardTitle>
        <CardDescription>登録済みのメールアドレスを入力してください</CardDescription>
      </CardHeader>
      <CardContent>
        {phase === 'form' ? (
          <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
            {sendError && (
              <Alert variant="destructive">
                <AlertDescription>{SEND_ERROR_MESSAGES[sendError]}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@joyfit.co.jp"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-destructive text-sm">{String(errors.email.message)}</p>
              )}
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              リセットリンクを送信
            </Button>
            {/* Y-13 FR-M006: 経路①（Google SSO）スタッフ向け案内。BEで経路判定できないためUIで常時補足 */}
            <p className="text-muted-foreground text-xs">
              Googleアカウント（直営店など）でログインしている方は、パスワードは google.com
              から変更してください。
            </p>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="bg-success/10 rounded-full p-4">
                <CheckCircle className="text-success size-8" />
              </div>
            </div>
            <div>
              <p className="font-medium">メールを送信しました</p>
              {/* An email address is one unbreakable token; without `wrap-anywhere` a long one
                  (~60+ chars) overruns the fixed-width card instead of wrapping. */}
              <p className="text-muted-foreground mt-1 text-sm wrap-anywhere">
                {sentEmail} 宛にリセットリンクを送信しました
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={cooldown.isCoolingDown}
            >
              {cooldown.isCoolingDown
                ? `メールを再送信 (${cooldown.secondsLeft}秒)`
                : 'メールを再送信'}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Button
          variant="link"
          className="text-sm"
          nativeButton={false}
          render={<Link href={navigate('/login')}>ログインに戻る</Link>}
        />
      </CardFooter>
    </Card>
  );
}
