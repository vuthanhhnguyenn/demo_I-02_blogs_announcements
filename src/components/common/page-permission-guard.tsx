'use client';

/**
 * PagePermissionGuard — the app's page-level authorization gate.
 *
 * It lives on the client, not in the edge middleware, because the backend states
 * that the 51 position permission flags "are deliberately not JWT claims"
 * (`GET /crm/me`). The session cookie therefore cannot answer "may this staff
 * member open this page"; only `/crm/me` can. `src/proxy.ts` keeps the part a
 * cookie *can* answer (signed in or not) and this component owns the rest.
 *
 * It reads the same `evaluatePageAccess` the sidebar uses, so a page is never
 * reachable through a link the sidebar greys out, and never blocked while the
 * sidebar offers it.
 *
 * This is a UX gate, not a security boundary — the backend authorizes every
 * request on its own. Its job is to avoid rendering a screen that would only
 * fill up with 403s.
 */
import { type ReactNode, useEffect, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { handleLogout } from '@/utils/global.util';
import { ShieldOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { findPatternByPath, navigate } from '@/lib/routes/routes.util';

/** Shown while `/crm/me` is in flight — the permission answer isn't known yet. */
function PageGuardSkeleton() {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label="権限を確認中">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/**
 * `/crm/me` answered 403: the staff record is gone (E-AUTH-033) or deactivated
 * (E-AUTH-034). There is no page the session can usefully reach, so say why
 * rather than bouncing between guards.
 */
function AccountUnavailable() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-full">
        <ShieldOff className="text-destructive size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight">アカウントをご利用いただけません</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          アカウントが無効化されている可能性があります。
          <br />
          管理者にお問い合わせください。
        </p>
      </div>
    </div>
  );
}

/** `/crm/me` failed for a reason that is neither auth nor authorization. */
function ProfileUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="bg-muted flex size-16 items-center justify-center rounded-full">
        <ShieldOff className="text-muted-foreground size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight">権限情報を取得できませんでした</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          通信状況をご確認のうえ、再読み込みしてください。
        </p>
      </div>
      <Button onClick={onRetry}>再試行</Button>
    </div>
  );
}

export function PagePermissionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isError, error, checkPageAccess, refetch } = useAuthUser();

  const pattern = findPatternByPath(pathname);
  const status = isError ? getApiErrorStatus(error) : undefined;

  // A route with no pattern (a page not in routes.config) has no declared
  // requirement, so it is treated as unrestricted — same rule as PAGE_PERMISSIONS.
  const verdict = pattern ? checkPageAccess(pattern) : { allowed: true as const };
  const denied = !isLoading && !isError && !verdict.allowed;

  useEffect(() => {
    if (denied) router.replace(navigate('/403'));
  }, [denied, router]);

  // 401 means the refresh interceptor could not save the session either — the
  // cookie is stale. Go through `handleLogout` rather than routing to /login
  // directly: the stale cookie has to be removed first, otherwise the proxy sees
  // a "signed-in" visitor on /login and bounces them to `/`, losing the return
  // path the notice was supposed to come with.
  const loggingOutRef = useRef(false);
  useEffect(() => {
    if (status !== 401 || loggingOutRef.current) return;
    loggingOutRef.current = true;
    void handleLogout({ sessionExpired: true });
  }, [status]);

  if (isLoading) return <PageGuardSkeleton />;
  // Deactivated / removed staff: nothing to route to, so explain instead.
  if (status === 403) return <AccountUnavailable />;
  // 401: the effect above is navigating to /login — hold the skeleton meanwhile.
  if (status === 401) return <PageGuardSkeleton />;
  // Any other /crm/me failure (500, offline). Permissions are unknown, so the
  // safe answer is to show the failure rather than render a screen whose gates
  // would all silently read "denied".
  if (isError || !user) return <ProfileUnavailable onRetry={refetch} />;
  // Denied: the effect above is navigating to /403.
  if (!verdict.allowed) return <PageGuardSkeleton />;

  return <>{children}</>;
}
