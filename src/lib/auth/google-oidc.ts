import { decodeJWT } from '@/utils/auth.util';

import { navigate } from '@/lib/routes/routes.util';

/**
 * Google sign-in via a plain OpenID Connect redirect (`response_type=id_token`), replacing the
 * Google Identity Services (GIS) JavaScript SDK.
 *
 * Why not GIS: its `renderButton` widget cannot be restyled into this app's button, so it had to
 * be overlaid invisibly on top of a decorative one — and GIS silently refuses to open its account
 * chooser for a button it considers not visible, which broke sign-in on the deployed origin with
 * no console error. The redirect flow has no SDK, no iframe, no popup, and no dependency on
 * third-party cookies or on Google's visibility heuristics, so an ordinary `<Button>` can drive it.
 *
 * Trade-off: the implicit flow returns the ID token in the URL fragment. The fragment is never
 * sent to the server, and `consumeGoogleRedirect` strips it from the URL and the session history
 * immediately, but it does briefly exist in `window.location`. The stricter alternative is the
 * authorization-code flow, which would need a server route holding a `GOOGLE_CLIENT_SECRET` —
 * Google's Web-application clients require the secret at the token endpoint even with PKCE.
 *
 * Google's authoritative token verification stays where it belongs: the CRM backend, which
 * receives this `idToken` and validates its signature. The checks below only guard against a
 * replayed or mismatched response reaching that call.
 */

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/** Must be registered verbatim (per origin) under the OAuth client's Authorized redirect URIs. */
export const GOOGLE_CALLBACK_PATH = navigate('/auth/google/callback');

const PENDING_STORAGE_KEY = 'google-oidc-pending';

export type GoogleFlow = 'login' | 'login-initial';

/** Reason codes surfaced to the entry screens as a `?error=` param. */
export type GoogleRedirectErrorReason =
  | 'cancelled'
  | 'no-pending-request'
  | 'state-mismatch'
  | 'nonce-mismatch'
  | 'audience-mismatch'
  | 'issuer-mismatch'
  | 'missing-token'
  | 'provider-error';

interface PendingRequest {
  state: string;
  nonce: string;
  flow: GoogleFlow;
  redirectTo?: string;
  inviteToken?: string;
}

export interface StartGoogleSignInParams {
  flow: GoogleFlow;
  /** Where to land after a successful `login` flow; ignored for `login-initial`. */
  redirectTo?: string | null;
  inviteToken?: string;
  /** Pre-selects the invited address on Google's chooser. */
  loginHint?: string;
}

export type GoogleRedirectResult =
  | {
      status: 'success';
      idToken: string;
      flow: GoogleFlow;
      redirectTo?: string;
      inviteToken?: string;
    }
  | {
      status: 'error';
      reason: GoogleRedirectErrorReason;
      /** Null when the pending request is gone and the originating screen is unknown. */
      flow: GoogleFlow | null;
      inviteToken?: string;
    };

export function isGoogleSignInConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
}

function readPendingRequest(): PendingRequest | null {
  try {
    const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingRequest) : null;
  } catch {
    return null;
  }
}

/**
 * Builds the authorization URL and leaves the page. `state` and `nonce` are held in
 * `sessionStorage` — same-origin and same-tab, which is exactly the scope of one sign-in attempt.
 */
export function startGoogleSignIn({
  flow,
  redirectTo,
  inviteToken,
  loginHint,
}: StartGoogleSignInParams): void {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    // NEXT_PUBLIC_* is inlined at build time — an empty value means the variable was missing from
    // the build environment, not from the runtime one.
    throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is empty in this build');
  }

  const pending: PendingRequest = {
    state: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    flow,
    ...(redirectTo ? { redirectTo } : {}),
    ...(inviteToken ? { inviteToken } : {}),
  };
  sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));

  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', `${window.location.origin}${GOOGLE_CALLBACK_PATH}`);
  url.searchParams.set('response_type', 'id_token');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('nonce', pending.nonce);
  url.searchParams.set('state', pending.state);
  // Always show the chooser: staff members share machines, and a silently reused Google session
  // would sign them into the wrong CRM account.
  url.searchParams.set('prompt', 'select_account');
  if (loginHint) url.searchParams.set('login_hint', loginHint);

  window.location.assign(url.toString());
}

/**
 * Reads the result Google appended to the URL, clears both the fragment and the pending request,
 * and returns what the callback screen should do next. Safe to call only once per redirect —
 * everything it reads is consumed.
 */
export function consumeGoogleRedirect(): GoogleRedirectResult {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const pending = readPendingRequest();

  sessionStorage.removeItem(PENDING_STORAGE_KEY);
  // Drop the ID token from the address bar and from the session history entry before rendering.
  window.history.replaceState(null, '', window.location.pathname);

  const flow = pending?.flow ?? null;
  const inviteToken = pending?.inviteToken;
  const fail = (reason: GoogleRedirectErrorReason): GoogleRedirectResult => ({
    status: 'error',
    reason,
    flow,
    ...(inviteToken ? { inviteToken } : {}),
  });

  // Google reports failures in the fragment for implicit responses, but falls back to the query
  // string for errors raised before the response type is honoured.
  const providerError = fragment.get('error') ?? query.get('error');
  if (providerError) {
    return fail(providerError === 'access_denied' ? 'cancelled' : 'provider-error');
  }

  if (!pending) return fail('no-pending-request');

  const returnedState = fragment.get('state') ?? query.get('state');
  if (returnedState !== pending.state) return fail('state-mismatch');

  const idToken = fragment.get('id_token');
  if (!idToken) return fail('missing-token');

  const payload = decodeJWT(idToken) as { nonce?: string; aud?: string; iss?: string } | null;
  if (payload?.nonce !== pending.nonce) return fail('nonce-mismatch');
  if (payload.aud !== process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return fail('audience-mismatch');
  if (!payload.iss || !GOOGLE_ISSUERS.includes(payload.iss)) return fail('issuer-mismatch');

  return {
    status: 'success',
    idToken,
    flow: pending.flow,
    ...(pending.redirectTo ? { redirectTo: pending.redirectTo } : {}),
    ...(inviteToken ? { inviteToken } : {}),
  };
}
