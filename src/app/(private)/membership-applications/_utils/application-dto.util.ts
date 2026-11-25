/**
 * The one seam for API-098 fields the backend still declares as bare `type: object`, which
 * codegen turns into `{ [key: string]: unknown }` (integration-plan.md D1). Each reader narrows
 * the documented runtime shape with guards — no `as` casts leak into components.
 *
 * Round 2: store / plan / campaign / options / promotion code / proxy / actor / blacklist
 * records / `calculatedAmounts` are typed by the refreshed contract and read directly; only the
 * two waiver objects remain loose.
 */
import type { ApplicationStaffRefDto } from '@/lib/api-real/types.gen';

type Loose = { [key: string]: unknown } | null | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStaffRef(ref: unknown): ApplicationStaffRefDto | null {
  if (!isRecord(ref)) return null;
  const staffId = str(ref.staffId);
  return staffId ? { staffId, displayName: str(ref.displayName) } : null;
}

/** `enrollmentFeeWaiver` — `{ type, reason, appliedAt, appliedBy }`; null = no waiver. */
export interface EnrollmentFeeWaiver {
  type: 'campaign' | 'reenrollment' | 'staff';
  reason: string | null;
  appliedAt: string | null;
  appliedBy: ApplicationStaffRefDto | null;
}

export function readEnrollmentFeeWaiver(waiver: Loose): EnrollmentFeeWaiver | null {
  if (!isRecord(waiver)) return null;
  const type = waiver.type;
  if (type !== 'campaign' && type !== 'reenrollment' && type !== 'staff') return null;
  return {
    type,
    reason: str(waiver.reason),
    appliedAt: str(waiver.appliedAt),
    appliedBy: readStaffRef(waiver.appliedBy),
  };
}

/** `reenrollmentWaiver` — rule state; null = the brand has no rule (hide the row). */
export interface ReenrollmentWaiver {
  ruleDays: number;
  eligible: boolean;
  daysSinceWithdrawal: number | null;
  excludedReason: string | null;
}

export function readReenrollmentWaiver(waiver: Loose): ReenrollmentWaiver | null {
  if (!isRecord(waiver)) return null;
  const ruleDays = num(waiver.ruleDays);
  if (ruleDays === null) return null;
  return {
    ruleDays,
    eligible: waiver.eligible === true,
    daysSinceWithdrawal: num(waiver.daysSinceWithdrawal),
    excludedReason: str(waiver.excludedReason),
  };
}

/**
 * Whether the blacklist screen flagged the applicant: any outcome other than `unchecked` /
 * `none` (`name_dob` / `email` / `phone` / `address` / `multiple`).
 *
 * TODO(round2) B17: dev still serves the undocumented `clear` on flagged rows (the rows
 * `blacklistFlagged=true` returns, with non-empty `matchedRecords`), so it counts as flagged
 * here too. Typed as `string` for that reason.
 */
export function isBlacklistFlagged(matchResult: string): boolean {
  return matchResult !== 'unchecked' && matchResult !== 'none';
}
