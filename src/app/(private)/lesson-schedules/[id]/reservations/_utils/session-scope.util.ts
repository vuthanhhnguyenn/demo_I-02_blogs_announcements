import { type AuthUser, UserRole } from '@/types/permission.type';

import { BOOKING_ERROR_CODE } from './booking-api.util';

/**
 * D-01 permission matrix: Trainer is scoped to only their own sessions for
 * schedule-edit/reservation/attendance/memo actions. Every other role that
 * already holds the base permission is unrestricted.
 *
 * Integration decision D3: the backend is the gate. `/crm/me` carries no trainer id,
 * and `GET /lesson-schedules/{id}` answers 404 `E-LSC-001` to a Trainer who is not
 * assigned to the schedule (the page maps that to `/403`). So once a Trainer sees the
 * schedule at all, it is their own session.
 */
export function isOwnSessionScope(user: AuthUser | null): boolean {
  return user !== null;
}

/**
 * Roles whose schedule read is limited (API-112 §6.10 Read row): Manager / Staff / Observer
 * to their stores, Trainer to their own sessions. HQ / system read every store.
 */
const SCOPED_READ_ROLES: ReadonlyArray<UserRole> = [
  UserRole.Manager,
  UserRole.Staff,
  UserRole.Observer,
  UserRole.Trainer,
];

/**
 * API-112 §5.1 / §6.10 #3: a schedule outside the caller's scope answers 404 `E-LSC-001`
 * (existence not disclosed), never 403. For a scoped role that 404 means "no access", so the
 * page sends it to `/403` (D-01 Bug-No9 — it was Trainer-only, so Staff saw load-error cards).
 * For HQ / system the same 404 is a real "not found" and keeps the page error state.
 */
export function isScheduleScopeDenied(
  role: UserRole | undefined,
  errorCode: string | undefined,
): boolean {
  return (
    role !== undefined &&
    SCOPED_READ_ROLES.includes(role) &&
    errorCode === BOOKING_ERROR_CODE.scheduleNotFound
  );
}

const MANAGE_ROLES = [
  UserRole.System,
  UserRole.Headquarter,
  UserRole.Manager,
  UserRole.Staff,
  UserRole.Trainer,
];

/** Roles allowed for a manage-permission RoleGatedButton, scoped by own-session for Trainer. */
export function scopedManageRoles(isOwnSession: boolean): UserRole[] {
  return isOwnSession ? MANAGE_ROLES : MANAGE_ROLES.filter((role) => role !== UserRole.Trainer);
}
