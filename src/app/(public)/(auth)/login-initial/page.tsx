'use client'; // reads the `token`/`error` search params and drives client-side view-state transitions
import { Suspense, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { AuthShell } from '@/components/common/auth/auth-shell';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { crmAuthControllerInviteVerifyOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import { ExpiredState } from './_components/expired-state';
import { FirstTimePasswordSetForm } from './_components/first-time-password-set-form';
import { LoginForm } from './_components/login-form';

interface CognitoChallengeState {
  username: string;
  session: string;
  inviteToken: string;
}

function VerifyingState() {
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

function LoginInitialContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  // Set by the Google callback screen: `expired` means the invite itself is no longer usable,
  // which is the same terminal state `onExpired` produces for the Cognito branch.
  const errorCode = searchParams.get('error');
  const [challenge, setChallenge] = useState<CognitoChallengeState | null>(null);
  const [forceExpired, setForceExpired] = useState(false);

  const { data, isLoading, isError } = useQuery({
    ...crmAuthControllerInviteVerifyOptions({ query: { token: token ?? '' } }),
    enabled: !!token,
    meta: { suppressErrorToast: true },
  });

  if (!token || forceExpired || errorCode === 'expired' || isError) {
    return <ExpiredState />;
  }

  if (isLoading || !data) {
    return <VerifyingState />;
  }

  if (challenge) {
    return (
      <FirstTimePasswordSetForm challenge={challenge} onExpired={() => setForceExpired(true)} />
    );
  }

  return (
    <LoginForm
      email={data.email}
      authProvider={data.authProvider}
      inviteToken={token}
      onChallenge={({ username, session }) =>
        setChallenge({ username, session, inviteToken: token })
      }
      onExpired={() => setForceExpired(true)}
      initialErrorCode={errorCode}
    />
  );
}

export default function Page() {
  return (
    <AuthShell>
      <Suspense fallback={<VerifyingState />}>
        <LoginInitialContent />
      </Suspense>
    </AuthShell>
  );
}
