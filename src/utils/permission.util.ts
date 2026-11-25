/**
 * Authorization evaluation. Every gate in the app funnels through here so there
 * is one place to reason about (and one place to change when the backend does).
 *
 * A permission is granted when both layers agree:
 *
 *   role tier (ROLE_PERMISSIONS, static — the feature's 権限マトリクス)
 *     AND
 *   position grant (PERMISSION_FLAG_RULES against /crm/me's live flags)
 *
 * `roleGrantsPermission`/`hasPermissions` are role-only and exist for callers
 * that genuinely have no `AuthUser` (position flags are not JWT claims, so the
 * edge middleware falls in this category); anything deciding whether an
 * action may run should go through `evaluatePermission` instead — role alone
 * no longer answers the question.
 */
import {
  FLAG_EXEMPT_ROLES,
  PAGE_PERMISSIONS,
  PERMISSION_FLAG_RULES,
  ROLE_PERMISSIONS,
} from '@/constants/permission.constants';

import type { RoutePattern } from '@/lib/routes/routes.type';

import { type AuthUser, Permission, UserRole } from '@/types/permission.type';

// ---------------------------------------------------------------------------
// Layer 1 — role tier
// ---------------------------------------------------------------------------

/**
 * Returns true if the role's tier includes the permission at all.
 * `null` (an unrecognised role) is denied rather than treated as unrestricted.
 */
export function roleGrantsPermission(role: UserRole | null, permission: Permission): boolean {
  if (!role) return false;
  const granted = ROLE_PERMISSIONS[role] as readonly Permission[] | undefined;
  return granted?.includes(permission) ?? false;
}

/** Returns true if the given role holds all of the specified permissions. */
export function hasPermissions(role: UserRole | null, permissions: readonly Permission[]): boolean {
  return permissions.every((p) => roleGrantsPermission(role, p));
}

// ---------------------------------------------------------------------------
// Layer 2 — position flags from /crm/me
// ---------------------------------------------------------------------------

/**
 * Returns true if the user's position flags satisfy the permission.
 *
 * - No rule for the permission → `true`. Those permissions have no backend flag
 *   behind them (master data, ordering, …) and are governed by the role tier alone.
 * - A rule with several flags → **any** of them is enough (they are alternatives).
 * - `system` bypasses this layer entirely (see `FLAG_EXEMPT_ROLES`).
 */
export function flagsGrantPermission(user: AuthUser, permission: Permission): boolean {
  if (FLAG_EXEMPT_ROLES.includes(user.role)) return true;

  const required = PERMISSION_FLAG_RULES[permission];
  if (!required || required.length === 0) return true;

  return required.some((flag) => user.flags[flag] === true);
}

// ---------------------------------------------------------------------------
// Combined evaluation — the entry point for all UI gates
// ---------------------------------------------------------------------------

/** The reason a permission was denied — lets callers explain themselves in the UI. */
export type PermissionDenial = 'role' | 'position';

export type PermissionVerdict = { allowed: true } | { allowed: false; reason: PermissionDenial };

/**
 * Evaluates one permission for a user, reporting *why* it was denied so the UI
 * can distinguish "your role never has this" from "your 職位 wasn't granted it" —
 * two situations that need very different copy.
 */
export function evaluatePermission(
  user: AuthUser | null,
  permission: Permission,
): PermissionVerdict {
  if (!user) return { allowed: false, reason: 'role' };
  if (!roleGrantsPermission(user.role, permission)) return { allowed: false, reason: 'role' };
  if (!flagsGrantPermission(user, permission)) return { allowed: false, reason: 'position' };
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Page-level access
// ---------------------------------------------------------------------------

/** The `PermissionVerdict` for a route, for callers that want the deny reason. */
export function evaluatePageAccess(
  user: AuthUser | null,
  pattern: RoutePattern,
): PermissionVerdict {
  const required = PAGE_PERMISSIONS[pattern];
  if (!required) return { allowed: true };
  return evaluatePermission(user, required);
}

/**
 * Returns true if the given route is restricted to Headquarter/System only.
 * Determined by checking whether only those two roles hold the required page-view permission.
 */
export function isPageHqOnly(pattern: RoutePattern): boolean {
  const required = PAGE_PERMISSIONS[pattern];
  if (!required) return false;
  const accessibleRoles = Object.values(UserRole).filter((role) =>
    roleGrantsPermission(role, required),
  );
  return (
    accessibleRoles.length > 0 &&
    accessibleRoles.every((r) => r === UserRole.System || r === UserRole.Headquarter)
  );
}
