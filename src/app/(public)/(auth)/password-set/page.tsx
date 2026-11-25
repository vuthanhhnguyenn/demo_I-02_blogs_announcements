'use client'; // reads the `email`/`code` search params
import { Suspense } from 'react';

import { useSearchParams } from 'next/navigation';

import { COGNITO_EMAIL_MAX_LENGTH } from '@/constants/app.constants';

import { AuthShell } from '@/components/common/auth/auth-shell';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { PasswordResetConfirmForm } from './_components/password-reset-confirm-form';
import { PasswordResetExpiredState } from './_components/password-reset-expired-state';

function PasswordSetFallback() {
  return (
    <Card className="w-100">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

// Cognito's ForgotPassword confirmation code is always a 6-digit number; anything else (or a
// non-email-shaped `email` param) can never be a genuine link Cognito issued, so it's rejected
// up front instead of rendering a working-looking form that can only fail on submit.
const CODE_PATTERN = /^\d{6}$/;

function isEmailShaped(value: string) {
  // Cognito usernames cap at 128 chars, so a longer address can never be in a link it issued.
  if (value.length > COGNITO_EMAIL_MAX_LENGTH) return false;
  const at = value.indexOf('@');
  if (at <= 0 || at !== value.lastIndexOf('@')) return false;
  const domain = value.slice(at + 1);
  const dot = domain.indexOf('.');
  return dot > 0 && dot < domain.length - 1 && !/\s/.test(value);
}

function PasswordSetContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const code = searchParams.get('code');

  // data-model.md ResetLinkParams — a missing/malformed URL is, by design, indistinguishable
  // from a genuinely expired link; no Cognito call is made in that case.
  if (!email || !code || !isEmailShaped(email) || !CODE_PATTERN.test(code)) {
    return <PasswordResetExpiredState />;
  }

  return <PasswordResetConfirmForm email={email} code={code} />;
}

export default function Page() {
  return (
    <AuthShell>
      <Suspense fallback={<PasswordSetFallback />}>
        <PasswordSetContent />
      </Suspense>
    </AuthShell>
  );
}
