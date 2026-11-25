import { navigate } from '@/lib/routes/routes.util';

/** Why the user is being sent to /login — decides which notice the screen shows. */
export type LoginRedirectVariant = 'session-expired' | 'login-required';

export interface BuildLoginUrlOptions {
  /** Where to return after a successful sign-in. Validated by `safeRedirect` on the way back. */
  redirectTo?: string | null;
  variant?: LoginRedirectVariant;
}

/**
 * Builds the /login URL for every "you need to sign in" path.
 *
 * Both parameters must survive together: a notice without `redirect` drops the user
 * on `/` after signing in, and a `redirect` without `variant` never tells them why
 * they were signed out. Each caller used to set only one of the two.
 *
 * Kept free of client-only dependencies so `proxy.ts` (edge middleware) can use it.
 */
export function buildLoginUrl({ redirectTo, variant }: BuildLoginUrlOptions = {}): string {
  const params = new URLSearchParams();
  if (redirectTo) params.set('redirect', redirectTo);
  if (variant) params.set('variant', variant);
  const query = params.toString();
  return query ? `${navigate('/login')}?${query}` : navigate('/login');
}
