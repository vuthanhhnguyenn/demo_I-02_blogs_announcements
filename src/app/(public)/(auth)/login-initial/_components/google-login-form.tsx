'use client'; // starts the Google sign-in redirect
import { useCallback, useState } from 'react';

import { useResetOnRestore } from '@/hooks/use-reset-on-restore.hook';

import { GoogleIcon } from '@/components/common/auth/google-icon';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

import { isGoogleSignInConfigured, startGoogleSignIn } from '@/lib/auth/google-oidc';

interface GoogleLoginFormProps {
  inviteToken: string;
  /** Pre-selects the invited address on Google's account chooser. */
  email: string;
  /** `?error=` code handed back by the Google callback screen (see google-oidc.ts). */
  initialErrorCode?: string | null;
}

type InlineError = 'retry' | 'account-status' | null;

function resolveInitialError(initialErrorCode: string | null | undefined): InlineError {
  switch (initialErrorCode) {
    case 'retry':
    case 'account-status':
      return initialErrorCode;
    default:
      return null;
  }
}

/**
 * The whole sign-in happens off-screen: `startGoogleSignIn` leaves the page, and the callback
 * screen performs the CRM login and comes back here with an `?error=` code if it failed. Invite
 * errors never reach this component — the callback sends those to `?error=expired`, which the
 * page renders as the expired state instead of this form.
 */
export function GoogleLoginForm({ inviteToken, email, initialErrorCode }: GoogleLoginFormProps) {
  const [inlineError, setInlineError] = useState<InlineError>(() =>
    resolveInitialError(initialErrorCode),
  );
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isGoogleAvailable = isGoogleSignInConfigured();

  function handleGoogleSignIn() {
    setInlineError(null);
    setIsRedirecting(true);
    try {
      startGoogleSignIn({ flow: 'login-initial', inviteToken, loginHint: email });
    } catch (error) {
      // Only thrown when the client id is missing from the build; the redirect itself cannot fail.
      console.error(error);
      setIsRedirecting(false);
      setInlineError('retry');
    }
  }

  // Backing out of Google's account chooser restores this page from the bfcache with the redirect
  // flag still set, which would leave the button spinning and disabled for good.
  useResetOnRestore(useCallback(() => setIsRedirecting(false), []));

  return (
    <>
      {inlineError === 'retry' && (
        <Alert variant="destructive">
          <AlertDescription>
            Googleログインに失敗しました。もう一度お試しください。
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
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full gap-2"
        onClick={handleGoogleSignIn}
        disabled={isRedirecting || !isGoogleAvailable}
      >
        {isRedirecting ? <Spinner /> : <GoogleIcon />}
        Googleでログイン
      </Button>
      {!isGoogleAvailable && (
        <p className="text-destructive text-sm">
          Googleログインは現在利用できません。管理者にお問い合わせください。
        </p>
      )}
    </>
  );
}
