'use client'; // interactive form/lockout state + starts the Google sign-in redirect
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import Link from 'next/link';

import { TEXT_MAX_LENGTH } from '@/constants/app.constants';
import { LOGIN_ERROR_CODES } from '@/constants/auth-error-codes.constants';
import { persistStaffSession } from '@/utils/auth.util';
import { safeRedirect } from '@/utils/global.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Info, ShieldAlert, UserX } from 'lucide-react';

import { CognitoAuthError, useCognitoAuth } from '@/hooks/use-cognito-auth';
import { useResetOnRestore } from '@/hooks/use-reset-on-restore.hook';

import { GoogleIcon } from '@/components/common/auth/google-icon';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

import { crmAuthControllerLoginMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { ErrorResponseDto } from '@/lib/api-real/types.gen';
import { isGoogleSignInConfigured, startGoogleSignIn } from '@/lib/auth/google-oidc';
import { navigate } from '@/lib/routes/routes.util';

import { type LoginSchema, loginSchema } from '../_schema/login.schema';

interface LoginFormProps {
  initialVariant?: 'session-expired' | 'magic-link-invalid' | 'login-required';
  redirectTo?: string | null;
  /** `?error=` code handed back by the Google callback screen (see google-oidc.ts). */
  initialErrorCode?: string | null;
}

// SignInError view-model — data-model.md. Only one alert is ever shown at a time.
type SignInError =
  | 'session-expired'
  | 'login-required'
  | 'locked'
  | 'account-status'
  | 'credentials'
  | 'unexpected'
  | 'magic-link-invalid'
  | null;

// research.md R5 — Cognito surfaces both a plain wrong password and an account lockout as the
// same NotAuthorizedException `__type`; the lockout phrase in the message is the only signal.
// An unrecognized message degrades safely to the generic credentials error, never a false lockout.
const COGNITO_LOCKOUT_MESSAGE_PATTERN = /password attempts exceeded|attempt limit exceeded/i;

// The Google flow leaves this screen entirely, so its failures come back as a `?error=` code
// instead of as mutation state. Anything unrecognized is ignored rather than shown as an alert.
function resolveInitialError(
  initialVariant: LoginFormProps['initialVariant'],
  initialErrorCode: string | null | undefined,
): SignInError {
  if (initialVariant === 'session-expired') return 'session-expired';
  if (initialVariant === 'magic-link-invalid') return 'magic-link-invalid';
  if (initialVariant === 'login-required') return 'login-required';
  switch (initialErrorCode) {
    case 'account-status':
    case 'credentials':
    case 'unexpected':
      return initialErrorCode;
    default:
      return null;
  }
}

export function LoginForm({ initialVariant, redirectTo, initialErrorCode }: LoginFormProps) {
  const [signInError, setSignInError] = useState<SignInError>(() =>
    resolveInitialError(initialVariant, initialErrorCode),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isCognitoSubmitting, setIsCognitoSubmitting] = useState(false);
  const [isRedirectingToGoogle, setIsRedirectingToGoogle] = useState(false);
  const isGoogleAvailable = isGoogleSignInConfigured();

  const isLocked = signInError === 'locked';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  });

  const loginMutation = useMutation({
    ...crmAuthControllerLoginMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: (data) => {
      // FR-011 — the identity-provider step succeeding is not enough; a malformed/incomplete
      // CRM response (missing tokens) must NOT be persisted as a session, since middleware would
      // just bounce it back out later with a confusing "session expired" message.
      if (!data?.accessToken || !data?.refreshToken) {
        setSignInError('unexpected');
        return;
      }
      persistStaffSession(data);
      // Full navigation (not router.push) so proxy.ts and every server component re-evaluate
      // against the freshly written session cookie — matches the prior mock login page's approach.
      window.location.href = safeRedirect(redirectTo ?? undefined);
    },
    onError: (error: ErrorResponseDto) => {
      if (
        error.code === LOGIN_ERROR_CODES.STAFF_NOT_FOUND ||
        error.code === LOGIN_ERROR_CODES.STAFF_DEACTIVATED
      ) {
        setSignInError('account-status');
      } else if (error.code === LOGIN_ERROR_CODES.ID_TOKEN_INVALID) {
        setSignInError('credentials');
      } else {
        // FR-011 — anything else (a 500, an unrecognized error shape) is a CRM-side failure
        // unrelated to the credentials the staff member typed; the wrong-password copy would
        // mislead them into re-checking a password that was never the problem.
        setSignInError('unexpected');
      }
    },
  });

  function handleGoogleSignIn() {
    setSignInError(null);
    setIsRedirectingToGoogle(true);
    try {
      startGoogleSignIn({ flow: 'login', redirectTo });
    } catch (error) {
      // Only thrown when the client id is missing from the build; the redirect itself cannot fail.
      console.error(error);
      setIsRedirectingToGoogle(false);
      setSignInError('unexpected');
    }
  }

  // Backing out of Google's account chooser restores this page from the bfcache with the redirect
  // flag still set, which would leave the button spinning and disabled for good.
  useResetOnRestore(useCallback(() => setIsRedirectingToGoogle(false), []));

  const { initiateAuth } = useCognitoAuth();

  async function onSubmit(data: LoginSchema) {
    setSignInError(null);
    setIsCognitoSubmitting(true);
    try {
      const result = await initiateAuth({ email: data.email, password: data.password });

      // research.md R4 — a NEW_PASSWORD_REQUIRED challenge here means an out-of-band admin reset,
      // not a real first login; this screen has no password-set UI, so it's a generic failure.
      if (!result.AuthenticationResult?.IdToken) {
        setSignInError('credentials');
        return;
      }

      loginMutation.mutate({ body: { idToken: result.AuthenticationResult.IdToken } });
    } catch (error) {
      if (error instanceof CognitoAuthError) {
        setSignInError(
          COGNITO_LOCKOUT_MESSAGE_PATTERN.test(error.message) ? 'locked' : 'credentials',
        );
      } else {
        throw error;
      }
    } finally {
      setIsCognitoSubmitting(false);
    }
  }

  return (
    <Card className="w-100">
      <CardHeader>
        <CardTitle className="text-lg">ログイン</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {signInError === 'session-expired' && (
          <Alert className="border-info/50 bg-info/15">
            <Info className="text-info size-4" />
            <AlertDescription className="text-info">
              セッションの有効期限が切れました。再度ログインしてください。
            </AlertDescription>
          </Alert>
        )}
        {/* セッション Cookie が無い状態。期限切れか未ログインか区別できないため断定しない */}
        {signInError === 'login-required' && (
          <Alert className="border-info/50 bg-info/15">
            <Info className="text-info size-4" />
            <AlertDescription className="text-info">
              ログインが必要です。続行するにはログインしてください。
            </AlertDescription>
          </Alert>
        )}
        {signInError === 'locked' && (
          <Alert variant="destructive">
            <ShieldAlert className="size-4" />
            <AlertDescription>
              アカウントが一時的にロックされています。しばらく待ってからもう一度お試しください（最大で約15分）。
            </AlertDescription>
          </Alert>
        )}
        {signInError === 'account-status' && (
          <Alert variant="destructive">
            <UserX className="size-4" />
            <AlertDescription>
              CRMに登録されていないアカウントです。管理者にお問い合わせください。
            </AlertDescription>
          </Alert>
        )}
        {signInError === 'credentials' && (
          <Alert variant="destructive">
            <AlertDescription>メールアドレスまたはパスワードが正しくありません。</AlertDescription>
          </Alert>
        )}
        {signInError === 'unexpected' && (
          <Alert variant="destructive">
            <AlertDescription>
              エラーが発生しました。しばらくしてから再度お試しください。
            </AlertDescription>
          </Alert>
        )}
        {signInError === 'magic-link-invalid' && (
          <Alert variant="destructive">
            <AlertDescription>
              ログインリンクが無効か、有効期限が切れています。お手数ですが、もう一度お試しください。
            </AlertDescription>
          </Alert>
        )}

        {/* An ordinary button: the OIDC redirect flow needs no SDK widget to overlay. */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full gap-2"
          onClick={handleGoogleSignIn}
          disabled={isLocked || isRedirectingToGoogle || !isGoogleAvailable}
        >
          {isRedirectingToGoogle ? <Spinner /> : <GoogleIcon />}
          Googleでログイン
        </Button>
        {!isGoogleAvailable && (
          <p className="text-destructive text-sm">
            Googleログインは現在利用できません。管理者にお問い合わせください。
          </p>
        )}

        <div className="flex items-center gap-2">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs">または</span>
          <Separator className="flex-1" />
        </div>

        {/* noValidate: zod owns validation. Without it the browser rejects a malformed
            type="email" value first and shows its own English bubble ("A part following
            '@' should not contain the symbol ' '.") instead of the Japanese message. */}
        <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@joyfit.co.jp"
              autoComplete="email"
              disabled={isLocked}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-destructive text-sm">{String(errors.email.message)}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="パスワードを入力"
                autoComplete="current-password"
                className="pr-10"
                maxLength={TEXT_MAX_LENGTH}
                disabled={isLocked}
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 h-full w-10 hover:bg-transparent"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                disabled={isLocked}
              >
                {showPassword ? (
                  <EyeOff className="text-muted-foreground size-4" />
                ) : (
                  <Eye className="text-muted-foreground size-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-destructive text-sm">{String(errors.password.message)}</p>
            )}
          </div>
          <Button
            className="w-full"
            size="lg"
            type="submit"
            disabled={isLocked || isCognitoSubmitting || loginMutation.isPending}
          >
            ログイン
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-1">
        <Button
          variant="link"
          className="text-sm"
          nativeButton={false}
          render={<Link href={navigate('/password-reset')}>パスワードをお忘れの方</Link>}
        />
        <Button
          variant="link"
          className="text-sm"
          nativeButton={false}
          render={<Link href={navigate('/magic-link-login')}>マジックリンクでログイン</Link>}
        />
      </CardFooter>
    </Card>
  );
}
