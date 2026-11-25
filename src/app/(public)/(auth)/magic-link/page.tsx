import { Suspense } from 'react';

import { AuthShell } from '@/components/common/auth/auth-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { MagicLinkVerify } from './_components/magic-link-verify';

function MagicLinkVerifyFallback() {
  return (
    <Card className="w-100">
      <CardContent className="flex items-center justify-center gap-3 py-10">
        <Skeleton className="h-5 w-32" />
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <AuthShell>
      <Suspense fallback={<MagicLinkVerifyFallback />}>
        <MagicLinkVerify />
      </Suspense>
    </AuthShell>
  );
}
