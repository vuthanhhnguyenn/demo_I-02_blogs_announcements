'use client'; // reads ?token= and fires the one-time verify mutation on mount
import { useEffect, useRef } from 'react';

import { useSearchParams } from 'next/navigation';

import { LOGIN_ERROR_CODES } from '@/constants/auth-error-codes.constants';
import { persistStaffSession } from '@/utils/auth.util';
import { useMutation } from '@tanstack/react-query';

import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

import { crmAuthControllerCrmMagicLinkVerifyMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { ErrorResponseDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

export function MagicLinkVerify() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  // research.md R15 — a synchronous ref latch survives StrictMode's back-to-back effect
  // invocations, which a useState flag would not; the token is genuinely single-use.
  const hasStartedRef = useRef(false);

  const { mutate } = useMutation({
    ...crmAuthControllerCrmMagicLinkVerifyMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: (data) => {
      if (!data?.accessToken || !data?.refreshToken) {
        window.location.replace(`${navigate('/login')}?variant=magic-link-invalid`);
        return;
      }
      persistStaffSession(data);
      // Full navigation so proxy.ts and every server component re-evaluate against the freshly
      // written session cookie. FR-018 — always the dashboard, never a `redirect` target.
      window.location.replace(navigate('/'));
    },
    onError: (error: ErrorResponseDto) => {
      window.location.replace(
        error.code === LOGIN_ERROR_CODES.STAFF_DEACTIVATED
          ? `${navigate('/login')}?variant=account-status`
          : `${navigate('/login')}?variant=magic-link-invalid`,
      );
    },
  });

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    if (!token || !token.trim()) {
      window.location.replace(`${navigate('/login')}?variant=magic-link-invalid`);
      return;
    }

    mutate({ body: { token } });
  }, [mutate, token]);

  return (
    <Card className="w-100">
      <CardContent className="flex items-center justify-center gap-3 py-10">
        <Spinner className="size-5" />
        <span className="text-muted-foreground text-sm">ログイン処理中...</span>
      </CardContent>
    </Card>
  );
}
