import { toast } from 'sonner';
import Cookies from 'universal-cookie';

import { AuthCrm } from '@/lib/api-real';
import { buildLoginUrl } from '@/lib/auth/login-url.util';
import { broadcastSessionEnded } from '@/lib/auth/session-activity.util';
import { navigate } from '@/lib/routes/routes.util';

import { CookieNames } from '@/types/global.enum';

export { buildLoginUrl } from '@/lib/auth/login-url.util';
export type { BuildLoginUrlOptions, LoginRedirectVariant } from '@/lib/auth/login-url.util';

export interface HandleLogoutOptions {
  /** Set when logout is triggered by an unrenewable session (FR-008), not an explicit "ログアウト" click. */
  sessionExpired?: boolean;
}

/**
 * Signs the staff member out. Best-effort invalidates the server-side session (FR-007) — called
 * BEFORE the cookie is removed so the request interceptor can still attach the bearer token
 * (research.md R8); a network failure or an already-gone session must never block local logout.
 */
// Every in-flight request that hits the dead session lands here; without this latch each one
// re-posts /auth/crm/logout and re-assigns location (one leave prompt per call on a dirty form).
let sessionExpiryLogoutStarted = false;

export async function handleLogout(options?: HandleLogoutOptions) {
  if (options?.sessionExpired) {
    if (sessionExpiryLogoutStarted) return;
    sessionExpiryLogoutStarted = true;
  }
  await AuthCrm.crmAuthControllerLogout().catch(() => {});

  // `path: '/'` is required, not cosmetic: the cookie is written with that path
  // (`persistStaffSession`), and universal-cookie deletes per path — without it the
  // session cookie survives a logout made from any page other than `/`, and the next
  // request to /login is bounced back by the proxy as an already-signed-in visitor.
  new Cookies().remove(CookieNames.Session, { path: '/' });
  // Other tabs of the same session must leave too, without waiting for a reload or a click.
  broadcastSessionEnded(options?.sessionExpired ? 'expired' : 'logout');
  // セッション切れの場合は「なぜ切れたか」と「どこへ戻るか」の両方を渡す。
  // 明示的なログアウトでは戻り先を持ち越さない。
  window.location.href = options?.sessionExpired
    ? buildLoginUrl({ redirectTo: window.location.href, variant: 'session-expired' })
    : buildLoginUrl();
}

export const getLoginUrl = () => {
  return buildLoginUrl({ redirectTo: window.location.href, variant: 'session-expired' });
};

export const safeRedirect = (redirectUrl?: string) => {
  if (!redirectUrl) {
    return navigate('/');
  }

  try {
    // Decode URL to handle encoded URL strings
    const decodedUrl = decodeURIComponent(redirectUrl);

    // Create a URL object for validation
    const url = new URL(decodedUrl, window.location.origin);

    // Only allow same-origin redirects
    if (url.origin !== window.location.origin) {
      console.warn('Redirect to external domain blocked for security');
      return navigate('/');
    }

    // Check protocol to ensure it is HTTP/HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.warn('Invalid protocol for redirect');
      return navigate('/');
    }

    return decodedUrl;
  } catch (error) {
    console.warn('Invalid redirect URL:', error);
    return navigate('/');
  }
};

export const CAN_USE_DOM: boolean =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';

/**
 * Copy text to clipboard and show success toast
 */
export async function copyToClipboard(
  text: string,
  successMessage: string = 'クリップボードにコピーしました',
) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
  }
}

export function formatGenderLabel(gender: string | undefined) {
  switch (gender) {
    case 'male':
      return '男性';
    case 'female':
      return '女性';
    case 'other':
      return 'その他';
    default:
      return gender;
  }
}
