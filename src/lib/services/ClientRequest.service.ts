import type { RefreshResult } from '@/utils/auth.util';
import { getTokenExpiration } from '@/utils/auth.util';
import { handleLogout } from '@/utils/global.util';
import Cookies from 'universal-cookie';

import { Client, ResolvedRequestOptions } from '@/lib/api/client';

import { CookieNames } from '@/types/global.enum';
import { ApiRequest } from '@/types/global.type';

import SyncRequestService from './SyncRequest.service';

export interface ClientRequestServiceProps {
  client: Client;
  syncRequestService?: SyncRequestService;
  /** Backend-appropriate refresh call (`research.md` R7) — mock and real clients each get their own. */
  refresh: (refreshToken: string) => Promise<RefreshResult>;
}

export interface GetClientRequest extends Client {
  handleRefreshToken: (
    response: Response,
    request: ApiRequest,
    options: ResolvedRequestOptions<'fields', boolean, string>,
  ) => Promise<Response>;
}

export default class ClientRequestService {
  client: Client;
  #syncRequestService?: SyncRequestService | null;
  #refresh: (refreshToken: string) => Promise<RefreshResult>;

  constructor(props: ClientRequestServiceProps) {
    this.client = props.client;
    this.#syncRequestService = props.syncRequestService ?? null;
    this.#refresh = props.refresh;
  }

  get #promise(): Promise<string | null> | null {
    return this.#syncRequestService?.promise ?? null;
  }

  set #promise(promise: Promise<string | null> | null) {
    if (this.#syncRequestService) {
      this.#syncRequestService.promise = promise;
    }
  }

  getClient(): GetClientRequest {
    (this.client as GetClientRequest).handleRefreshToken = this.#handleRefreshToken.bind(this);
    return this.client as GetClientRequest;
  }

  async #refetchRequest(token: string, request: ApiRequest, response: Response): Promise<Response> {
    try {
      request._clone.headers.set('Authorization', `Bearer ${token}`);
      const data = await fetch(request._clone);
      // The refresh succeeded but the replay is still rejected: the session is dead on the
      // server side (revoked / deactivated), so end it the same way a failed refresh does.
      // Any other failure (403 / 422 / 500) stays an ordinary error for the screen.
      if (data.status === 401) {
        await handleLogout({ sessionExpired: true });
        return response;
      }
      if (!data.ok) {
        return response;
      }

      return data;
    } catch {
      return response;
    }
  }

  async #handleRefreshToken(response: Response, request: ApiRequest): Promise<Response> {
    let resolve: (value: string | null) => void = () => {};
    let reject: (reason?: Response) => void = () => {};
    try {
      if (this.#promise) {
        const token = await this.#promise;
        if (!token) {
          return response;
        }

        return this.#refetchRequest(token, request, response);
      }

      if (this.#syncRequestService === null) {
        this.#promise = new Promise(() => {});
        await handleLogout({ sessionExpired: true });
        return response;
      }

      this.#promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });

      const cookies = new Cookies();
      const refreshToken = cookies.get(CookieNames.Session)?.refresh_token;
      if (!refreshToken) {
        await handleLogout({ sessionExpired: true });
        reject(response);
        return response;
      }

      const result = await this.#refresh(refreshToken);

      this.#promise = null;
      resolve(result.accessToken);

      // Cookie expiry is derived from the new access token's own `exp` claim, not either
      // backend's separate expiry field (research.md R7, consistent with persistStaffSession).
      const expiration = getTokenExpiration(result.refreshToken);
      cookies.set(
        CookieNames.Session,
        {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          token_type: 'Bearer',
        },
        {
          path: '/',
          ...(expiration ? { expires: expiration } : {}),
        },
      );
      return await this.#refetchRequest(result.accessToken, request, response);
    } catch {
      if (this.#promise) {
        await handleLogout({ sessionExpired: true });
        reject(response);
        return response;
      }

      this.#promise = null;
      return response;
    }
  }
}
