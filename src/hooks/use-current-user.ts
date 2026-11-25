'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  adminStaffPermissionControllerGetStaffOptions,
  crmAuthControllerCrmMeOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { findUnknownPermissionFlags, toAuthUser } from '@/lib/auth/current-user.mapper';

import { UserRole } from '@/types/permission.type';

/**
 * Fetches the authenticated staff member from `GET /crm/me` and maps the payload
 * onto the app's `AuthUser` model (`src/lib/auth/current-user.mapper.ts`).
 *
 * The backend reads the 51 position permission flags fresh on every call, so this
 * response — not any JWT claim — is the authority on what the UI may offer.
 * `staleTime: Infinity` keeps that from re-fetching on every mount; a position
 * change lands after `invalidateCurrentUser()` or a reload.
 *
 * Must be used inside <AuthUserProvider> after the initial render.
 */
export function useCurrentUser() {
  const meQuery = useQuery({
    ...crmAuthControllerCrmMeOptions(),
    select: (data) => {
      if (process.env.NODE_ENV !== 'production') {
        const unknown = findUnknownPermissionFlags(data.permissions);
        if (unknown.length > 0) {
          // The API added flags this build has no name for — they are ignored by
          // every gate until STAFF_PERMISSION_FLAGS is regenerated.
          console.warn('[permissions] unknown flags from /crm/me:', unknown.join(', '));
        }
      }
      return toAuthUser(data);
    },
    staleTime: Infinity, // user profile only changes on explicit mutation → invalidate there
    retry: false,
  });

  // A Manager's scope is `staff_stores`, not their home store, and `/crm/me` does not carry
  // it — only the staff detail does (`managedStoreIds`). The user stays "loading" until it
  // arrives so nothing scopes itself to the home store in the meantime.
  const me = meQuery.data;
  const isManager = me?.role === UserRole.Manager;
  const managedQuery = useQuery({
    ...adminStaffPermissionControllerGetStaffOptions({ path: { id: me?.staffId ?? '' } }),
    enabled: isManager,
    staleTime: Infinity,
    retry: false,
    // A failure keeps the previous behaviour (no managed stores known) rather than locking
    // the manager out of the whole app; the screens then send no store scope of their own.
    meta: { suppressErrorToast: true },
  });

  const data = useMemo(
    () =>
      me && isManager ? { ...me, managedStoreIds: managedQuery.data?.managedStoreIds ?? [] } : me,
    [me, isManager, managedQuery.data],
  );

  return {
    data,
    isLoading: meQuery.isLoading || (isManager && managedQuery.isLoading),
    isError: meQuery.isError,
    error: meQuery.error,
    refetch: async () => {
      await meQuery.refetch();
      if (isManager) await managedQuery.refetch();
    },
  };
}

/** Query key of `/crm/me`, for invalidating the profile after a permission-affecting mutation. */
export function currentUserQueryKey() {
  return crmAuthControllerCrmMeOptions().queryKey;
}
