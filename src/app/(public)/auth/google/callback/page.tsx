'use client'; // the ID token arrives in the URL fragment, which never reaches the server
import { useEffect, useRef } from 'react';

import { LOGIN_ERROR_CODES } from '@/constants/auth-error-codes.constants';
import { persistStaffSession } from '@/utils/auth.util';
import { safeRedirect } from '@/utils/global.util';
import { useMutation } from '@tanstack/react-query';

import { AuthShell } from '@/components/common/auth/auth-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

import { crmAuthControllerLoginMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { ErrorResponseDto } from '@/lib/api-real/types.gen';
import { type GoogleFlow, consumeGoogleRedirect } from '@/lib/auth/google-oidc';
import { navigate } from '@/lib/routes/routes.util';

interface RedirectContext {
  flow: GoogleFlow;
  redirectTo?: string;
  inviteToken?: string;
}

/**
 * Builds the URL that returns the staff member to the screen they started from, carrying an
 * `error` code the entry screen turns back into its own inline alert. Keeping every piece of
 * user-facing copy on the entry screens means this page needs no messages of its own.
 */
function entryScreenUrl(context: RedirectContext | null, error: string | null): string {
  const params = new URLSearchParams();

  if (context?.flow === 'login-initial') {
    if (context.inviteToken) params.set('token', context.inviteToken);
    if (error) params.set('error', error);
    const query = params.toString();
    return `${navigate('/login-initial')}${query ? `?${query}` : ''}`;
  }

  if (context?.redirectTo) params.set('redirect', context.redirectTo);
  if (error) params.set('error', error);
  const query = params.toString();
  return `${navigate('/login')}${query ? `?${query}` : ''}`;
}

function mapCrmError(flow: GoogleFlow, code?: string): string {
  const isAccountStatus =
    code === LOGIN_ERROR_CODES.STAFF_NOT_FOUND || code === LOGIN_ERROR_CODES.STAFF_DEACTIVATED;

  if (flow === 'login-initial') {
    const isInviteError =
      code === LOGIN_ERROR_CODES.INVITE_NOT_FOUND ||
      code === LOGIN_ERROR_CODES.INVITE_USED ||
      code === LOGIN_ERROR_CODES.INVITE_REVOKED ||
      code === LOGIN_ERROR_CODES.INVITE_EXPIRED;
    if (isInviteError) return 'expired';
    return isAccountStatus ? 'account-status' : 'retry';
  }

  if (isAccountStatus) return 'account-status';
  if (code === LOGIN_ERROR_CODES.ID_TOKEN_INVALID) return 'credentials';
  // Anything else is a CRM-side failure unrelated to the Google account that just signed in.
  return 'unexpected';
}

export default function GoogleCallbackPage() {
  // Survives the StrictMode double-effect, and guarantees the single-use redirect result is
  // consumed exactly once.
  const consumedRef = useRef(false);
  const contextRef = useRef<RedirectContext | null>(null);

  const { mutate } = useMutation({
    ...crmAuthControllerLoginMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: (data) => {
      const context = contextRef.current;
      // A malformed CRM response must not be persisted as a session — middleware would bounce it
      // straight back out with a confusing "session expired" message.
      if (!data?.accessToken || !data?.refreshToken) {
        window.location.replace(entryScreenUrl(context, mapCrmError(context?.flow ?? 'login')));
        return;
      }

      persistStaffSession(data);
      // Full navigation so proxy.ts and every server component re-evaluate against the freshly
      // written session cookie.
      window.location.replace(
        context?.flow === 'login-initial'
          ? navigate('/login-initial/success')
          : safeRedirect(context?.redirectTo),
      );
    },
    onError: (error: ErrorResponseDto) => {
      const context = contextRef.current;
      window.location.replace(
        entryScreenUrl(context, mapCrmError(context?.flow ?? 'login', error.code)),
      );
    },
  });

  useEffect(() => {
    if (consumedRef.current) return;
    consumedRef.current = true;

    const result = consumeGoogleRedirect();

    if (result.status === 'error') {
      const context: RedirectContext | null = result.flow
        ? { flow: result.flow, ...(result.inviteToken ? { inviteToken: result.inviteToken } : {}) }
        : null;

      // A cancelled chooser is a deliberate user action, not a failure worth an alert. Every
      // other reason is a configuration or tampering problem the staff member cannot act on, so
      // it degrades to each screen's generic retry copy — the reason goes to the console instead.
      if (result.reason === 'cancelled') {
        window.location.replace(entryScreenUrl(context, null));
        return;
      }
      console.error(`[google-oidc] sign-in failed: ${result.reason}`);
      window.location.replace(
        entryScreenUrl(context, result.flow === 'login-initial' ? 'retry' : 'unexpected'),
      );
      return;
    }

    contextRef.current = {
      flow: result.flow,
      ...(result.redirectTo ? { redirectTo: result.redirectTo } : {}),
      ...(result.inviteToken ? { inviteToken: result.inviteToken } : {}),
    };

    mutate({
      body: {
        idToken: result.idToken,
        ...(result.inviteToken ? { inviteToken: result.inviteToken } : {}),
      },
    });
  }, [mutate]);

  return (
    <AuthShell>
      <Card className="w-100">
        <CardContent className="flex items-center justify-center gap-3 py-10">
          <Spinner className="size-5" />
          <span className="text-muted-foreground text-sm">ログイン処理中...</span>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
