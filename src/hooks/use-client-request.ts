'use client';

import { useCallback, useEffect, useMemo } from 'react';

import type { RefreshResult } from '@/utils/auth.util';
import Cookies from 'universal-cookie';

import { withApiErrorStatus } from '@/lib/api-error.util';
import { Client, ResolvedRequestOptions } from '@/lib/api/client';
import { markSessionActivity } from '@/lib/auth/session-activity.util';
import ClientRequestService from '@/lib/services/ClientRequest.service';
import SyncRequestService from '@/lib/services/SyncRequest.service';

import { CookieNames } from '@/types/global.enum';
import { ApiRequest } from '@/types/global.type';

// A 401 on any of these is a terminal auth outcome, not "my session expired mid-use" — retrying
// via refresh would be wrong (login) or recursive (refresh/logout themselves).
const AUTH_ENDPOINTS_BYPASSING_REFRESH = [
  '/api/v1/auth/login',
  '/api/v1/auth/crm/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/crm/refresh',
  '/api/v1/auth/crm/logout',
];

// The logout response ends the session — counting it as "last operation" would make every other
// tab believe the session was just used and keep showing data from a dead session.
const LOGOUT_ENDPOINTS = ['/api/v1/auth/logout', '/api/v1/auth/crm/logout'];

/**
 * Attaches auth/refresh interceptors to a given hey-api client instance. Called once per
 * generated client (mock `@/lib/api`, real `@/lib/api-real`, ...) so both stay authenticated
 * during the parallel migration. Pass a shared `syncRequestService` across calls so a 401 on
 * either client dedupes into a single in-flight refresh. `refresh` is the backend-appropriate
 * refresh call for this specific client (research.md R7) — the mock and real clients each pass
 * their own, since their refresh endpoints return differently-shaped responses.
 *
 * `trackSessionActivity` marks every authenticated response as "last operation" for the idle
 * timeout (Y-13 FR-M007). Only the real backend's client sets it: the mock API never touches the
 * server-side session, so counting its calls would keep the FE clock alive past the real logout.
 */
export default function useClientRequest(
  client: Client,
  syncRequestService: SyncRequestService,
  refresh: (refreshToken: string) => Promise<RefreshResult>,
  { trackSessionActivity = false }: { trackSessionActivity?: boolean } = {},
) {
  const clientRequest = useMemo(() => {
    const clientRequestService = new ClientRequestService({
      client,
      syncRequestService,
      refresh,
    });

    return clientRequestService.getClient();
  }, [client, syncRequestService, refresh]);

  const handleRequest = useCallback(async (request: Request) => {
    const authorization = request.headers.get('Authorization');
    const cookies = new Cookies();
    const token = cookies.get(CookieNames.Session);

    if (!authorization) {
      request.headers.set('Authorization', `Bearer ${token?.access_token}`);
    }

    const cloneRequest = request.clone();
    (request as ApiRequest)._clone = cloneRequest;
    return request;
  }, []);

  const handleResponse = useCallback(
    async (
      response: Response,
      request: Request,
      options: ResolvedRequestOptions<'fields', boolean, string>,
    ) => {
      const status = response.status;
      switch (status) {
        case 401: {
          const isAuthRequest = AUTH_ENDPOINTS_BYPASSING_REFRESH.some((url) =>
            request.url.includes(url),
          );
          if (isAuthRequest) {
            return response;
          }
          return await clientRequest.handleRefreshToken(response, request as ApiRequest, options);
        }
        default:
          // Any non-401 answer passed the BFF guard, which re-arms the server's idle window.
          if (trackSessionActivity && !LOGOUT_ENDPOINTS.some((url) => request.url.includes(url))) {
            markSessionActivity();
          }
          return response;
      }
    },
    [clientRequest, trackSessionActivity],
  );

  /**
   * The client throws the parsed response body, which carries no HTTP status of its own.
   * Attaching it here is what lets a screen tell "not found" from "request failed"
   * (read it with `getApiErrorStatus`). The rejection is kept — callers already rely on
   * a failed request propagating out of `request()`.
   */
  const handleError = useCallback((error: unknown, response: Response | undefined) => {
    // A transport failure (offline, DNS, CORS) rejects before any response exists, so
    // `response` is undefined here. Reading `.status` off it threw a TypeError that
    // replaced the original rejection, and its English text then reached the operator
    // through the shared error toast — the raw error is passed through untouched instead.
    if (!response) return Promise.reject(error);
    return Promise.reject(withApiErrorStatus(error, response.status));
  }, []);

  const interceptorRequestId = useMemo(
    () => clientRequest.interceptors.request.use(handleRequest),
    [clientRequest, handleRequest],
  );

  const interceptorResponse = useMemo(
    () => clientRequest.interceptors.response.use(handleResponse),
    [clientRequest, handleResponse],
  );

  const interceptorError = useMemo(
    () => clientRequest.interceptors.error.use(handleError),
    [clientRequest, handleError],
  );

  useEffect(() => {
    return () => {
      clientRequest.interceptors.error.eject(interceptorError);
      clientRequest.interceptors.request.eject(interceptorRequestId);
      clientRequest.interceptors.response.eject(interceptorResponse);
    };
  }, [clientRequest, interceptorError, interceptorRequestId, interceptorResponse]);

  return null;
}
