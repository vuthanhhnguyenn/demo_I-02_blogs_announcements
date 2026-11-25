'use client'; // reads the `redirect`/`variant`/`error` search params
import { Suspense } from 'react';

import { useSearchParams } from 'next/navigation';

import { AuthShell } from '@/components/common/auth/auth-shell';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { LoginForm } from './_components/login-form';

function LoginFallback() {
  return (
    <Card className="w-100">
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const variant = searchParams.get('variant');
  // Set by the Google callback screen when the redirect sign-in failed.
  const error = searchParams.get('error');

  return (
    <LoginForm
      initialVariant={
        variant === 'session-expired' ||
        variant === 'magic-link-invalid' ||
        variant === 'login-required'
          ? variant
          : undefined
      }
      redirectTo={redirect}
      initialErrorCode={error}
    />
  );
}

export default function Page() {
  return (
    <AuthShell>
      <Suspense fallback={<LoginFallback />}>
        <LoginContent />
      </Suspense>
    </AuthShell>
  );
}
