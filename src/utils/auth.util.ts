import Cookies from 'universal-cookie';

import { Authentication as Auth } from '@/lib/api';
import { AuthCrm } from '@/lib/api-real';
import type { CrmLoginResponseDto } from '@/lib/api-real/types.gen';
import { markSessionActivity } from '@/lib/auth/session-activity.util';

import { CookieNames } from '@/types/global.enum';

/**
 * Decode a JWT token payload
 * @param token JWT token string
 * @returns Decoded payload object or null if invalid
 */
export function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Get the expiration date from a JWT token
 * @param token JWT token string
 * @returns Date object or null if invalid/no exp claim
 */
export function getTokenExpiration(token: string): Date | null {
  const payload = decodeJWT(token);
  if (payload && payload.exp) {
    // JWT exp is in seconds, Date constructor expects milliseconds
    return new Date(payload.exp * 1000);
  }
  return null;
}

/**
 * Persists a successful CRM login result (first-time or subsequent) into the same
 * `CookieNames.Session` cookie shape `useClientRequest.ts` reads for the Authorization header,
 * so the rest of the app's auth plumbing works unchanged regardless of which screen produced it.
 */
export function persistStaffSession(response: CrmLoginResponseDto) {
  // A fresh login opens a fresh idle window — never inherit the previous session's timestamp,
  // which would trip the idle logout right after signing in.
  markSessionActivity();
  const cookies = new Cookies();
  const expires = getTokenExpiration(response.refreshToken) ?? undefined;

  cookies.set(
    CookieNames.Session,
    {
      access_token: response.accessToken,
      refresh_token: response.refreshToken,
      token_type: 'Bearer',
    },
    {
      path: '/',
      ...(expires ? { expires } : {}),
    },
  );
}

/** Normalized refresh-token result — both backend adapters below produce this same shape (`data-model.md` `RefreshResult`), so `ClientRequestService` never needs to know which backend answered. */
export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

/**
 * Refresh adapter for the mock API (`research.md` R7). Normalizes `PostAuthRefreshResponse`'s
 * `{ accessToken, refresh_token }` into the shared `RefreshResult` shape.
 */
export async function refreshMockSession(refreshToken: string): Promise<RefreshResult> {
  const { data } = await Auth.postAuthRefresh({ body: { refresh_token: refreshToken } });
  if (!data?.accessToken || !data?.refresh_token) {
    throw new Error('Mock refresh response is missing accessToken/refresh_token');
  }
  return { accessToken: data.accessToken, refreshToken: data.refresh_token };
}

/**
 * Refresh adapter for the real fitness-api (`research.md` R7). Must be the CRM staff endpoint,
 * not the member one (`/api/v1/auth/refresh`) — the cookie holds a CRM refresh token issued by
 * `crm/login`, and the member endpoint rejects it as a non-CRM token (`E-AUTH-005`).
 * `crm/refresh` answers with `CrmLoginResponseDto`, so the access token field is `accessToken`.
 */
export async function refreshRealSession(refreshToken: string): Promise<RefreshResult> {
  const { data } = await AuthCrm.crmAuthControllerCrmRefresh({ body: { refreshToken } });
  if (!data?.accessToken || !data?.refreshToken) {
    throw new Error('CRM refresh response is missing accessToken/refreshToken');
  }
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}
