'use client'; // holds interactive password-visibility and submit state
import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { TEXT_MAX_LENGTH } from '@/constants/app.constants';
import { LOGIN_ERROR_CODES } from '@/constants/auth-error-codes.constants';
import { persistStaffSession } from '@/utils/auth.util';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';

import { CognitoAuthError, useCognitoAuth } from '@/hooks/use-cognito-auth';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { crmAuthControllerLoginMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { ErrorResponseDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

interface CognitoLoginFormProps {
  email: string;
  inviteToken: string;
  onChallenge: (challenge: { username: string; session: string }) => void;
  onExpired: () => void;
}

type InlineError = 'retry' | 'account-status' | 'required' | 'generic' | null;

export function CognitoLoginForm({
  email,
  inviteToken,
  onChallenge,
  onExpired,
}: CognitoLoginFormProps) {
  const router = useRouter();
  const { initiateAuth } = useCognitoAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  async function handleLogin() {
    setInlineError(null);

    if (!password.trim()) {
      setInlineError('required');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await initiateAuth({ email, password });

      if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED' && result.Session) {
        onChallenge({ username: email, session: result.Session });
        return;
      }

      if (result.AuthenticationResult?.IdToken) {
        loginMutation.mutate({
          body: { idToken: result.AuthenticationResult.IdToken, inviteToken },
        });
      }
    } catch (error) {
      if (error instanceof CognitoAuthError) {
        // Spec Edge Case (spec.md L64) — only a genuine wrong-password rejection gets the
        // FR-009 retry copy; any other Cognito failure (transient/service error) is unrelated
        // to the credentials the staff member typed, so it gets the generic retry message.
        setInlineError(error.type === 'NotAuthorizedException' ? 'retry' : 'generic');
      } else {
        throw error;
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {inlineError === 'retry' && (
        <Alert variant="destructive">
          <AlertDescription>
            仮パスワードが正しくありません。もう一度お試しください。
          </AlertDescription>
        </Alert>
      )}
      {inlineError === 'required' && (
        <Alert variant="destructive">
          <AlertDescription>仮パスワードを入力してください。</AlertDescription>
        </Alert>
      )}
      {inlineError === 'generic' && (
        <Alert variant="destructive">
          <AlertDescription>
            エラーが発生しました。しばらくしてから再度お試しください。
          </AlertDescription>
        </Alert>
      )}
      {inlineError === 'account-status' && (
        <Alert variant="destructive">
          <AlertDescription>
            このアカウントはご利用いただけません。本部管理者にお問い合わせください。
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="password">仮パスワード</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="仮パスワードを入力"
            autoComplete="current-password"
            className="pr-10"
            maxLength={TEXT_MAX_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 h-full w-10 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="text-muted-foreground size-4" />
            ) : (
              <Eye className="text-muted-foreground size-4" />
            )}
          </Button>
        </div>
      </div>
      <Button
        className="w-full"
        size="lg"
        onClick={handleLogin}
        disabled={isSubmitting || loginMutation.isPending}
      >
        ログイン
      </Button>
    </>
  );
}
