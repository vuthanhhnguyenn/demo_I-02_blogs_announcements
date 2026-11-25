'use client';

import { type ReactNode, createContext, useCallback, useContext, useMemo } from 'react';

import {
  type PermissionVerdict,
  evaluatePageAccess,
  evaluatePermission,
} from '@/utils/permission.util';

import { useCurrentUser } from '@/hooks/use-current-user';

import type { RoutePattern } from '@/lib/routes/routes.type';

import {
  type AuthUser,
  Permission,
  type StaffPermissionFlag,
  UserRole,
} from '@/types/permission.type';

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------
interface AuthUserContextValue {
  user: AuthUser | null;
  /** True until `/crm/me` has resolved. Gates must deny while this is true. */
  isLoading: boolean;
  /** `/crm/me` failed (401 revoked session, 403 deactivated staff, network). */
  isError: boolean;
  error: unknown;
  /** Re-fetches `/crm/me`. Call after a mutation that can change the caller's own 職位. */
  refetch: () => void;
  /** Returns true if the user's role is among the provided list */
  hasRole: (roles: readonly UserRole[]) => boolean;
  /** Role tier AND live position flags must both allow the permission */
  hasPermission: (permission: Permission) => boolean;
  /** True if the user holds at least one of the permissions */
  hasAnyPermission: (permissions: readonly Permission[]) => boolean;
  /** True only if the user holds every one of the permissions */
  hasAllPermissions: (permissions: readonly Permission[]) => boolean;
  /** `hasPermission` plus the reason for a denial ('role' vs 'position') */
  checkPermission: (permission: Permission) => PermissionVerdict;
  /** Raw backend flag read — for the rare case with no matching `Permission` */
  hasFlag: (flag: StaffPermissionFlag) => boolean;
  /** Whether the user may open a route pattern */
  canAccessPage: (pattern: RoutePattern) => boolean;
  /** `canAccessPage` plus the reason for a denial */
  checkPageAccess: (pattern: RoutePattern) => PermissionVerdict;
}

const AuthUserContext = createContext<AuthUserContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider — feeds itself from useCurrentUser (React Query)
// ---------------------------------------------------------------------------

export function AuthUserProvider({ children }: { children: ReactNode }) {
  const { data: user = null, isLoading, isError, error, refetch: refetchUser } = useCurrentUser();

  const refetch = useCallback(() => {
    void refetchUser();
  }, [refetchUser]);

  const hasRole = useCallback(
    (roles: readonly UserRole[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const checkPermission = useCallback(
    (permission: Permission) => evaluatePermission(user, permission),
    [user],
  );

  const hasPermission = useCallback(
    (permission: Permission) => evaluatePermission(user, permission).allowed,
    [user],
  );

  const hasAnyPermission = useCallback(
    (permissions: readonly Permission[]) =>
      permissions.some((p) => evaluatePermission(user, p).allowed),
    [user],
  );

  const hasAllPermissions = useCallback(
    (permissions: readonly Permission[]) =>
      permissions.every((p) => evaluatePermission(user, p).allowed),
    [user],
  );

  const hasFlag = useCallback((flag: StaffPermissionFlag) => user?.flags[flag] === true, [user]);

  const checkPageAccess = useCallback(
    (pattern: RoutePattern) => evaluatePageAccess(user, pattern),
    [user],
  );

  const canAccessPage = useCallback(
    (pattern: RoutePattern) => evaluatePageAccess(user, pattern).allowed,
    [user],
  );

  const value = useMemo<AuthUserContextValue>(
    () => ({
      user,
      isLoading,
      isError,
      error,
      refetch,
      hasRole,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      checkPermission,
      hasFlag,
      canAccessPage,
      checkPageAccess,
    }),
    [
      user,
      isLoading,
      isError,
      error,
      refetch,
      hasRole,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      checkPermission,
      hasFlag,
      canAccessPage,
      checkPageAccess,
    ],
  );

  return <AuthUserContext.Provider value={value}>{children}</AuthUserContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuthUser(): AuthUserContextValue {
  const ctx = useContext(AuthUserContext);
  if (!ctx) {
    throw new Error('useAuthUser must be used inside <AuthUserProvider>');
  }
  return ctx;
}
