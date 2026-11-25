import type { StoreBusinessHourDto } from '@/lib/api-real/types.gen';

import type { BusinessHourDay } from '../_schemas/store-form.schema';

/**
 * Store error codes the UI reacts to specifically — decision D12.
 *
 * Always matched on `ErrorResponseDto.code`, never on the Japanese message body: the message is
 * backend copy and can change without notice.
 */
export const STORE_ERROR_CODE = {
  /** 404 — the store does not exist */
  notFound: 'E-STR-001',
  /** 409 — `clubCode` already taken */
  duplicateClubCode: 'E-STR-002',
  /** 422 — a non-closed business-hour / exception row is missing openTime or closeTime */
  businessHourTimesRequired: 'E-STR-003',
  /** 409 — a business exception (特別営業日 / 臨時休業日) already exists on that date */
  duplicateExceptionDate: 'E-STR-004',
  /** 422 — brand or status transition refused (brand is editable only while `preparing`) */
  transitionRefused: 'E-STR-006',
  /** 422 — 1DayPass price outside ¥700–¥1,800 */
  oneDayPassPriceOutOfRange: 'E-STR-009',
  /** 404 — unknown plan id, or a plan belonging to another brand group */
  unknownPlan: 'E-STR-010',
  /** 404 — unknown option id */
  unknownOption: 'E-STR-011',
  /** 422 — mutual use across brand groups */
  crossBrandMutualUse: 'E-STR-012',
  /** 404 — unknown FC company */
  unknownFcCompany: 'E-FC-002',
  /** 401/403 — not authenticated / not permitted */
  unauthenticated: 'E-AUTH-100',
  forbidden: 'E-AUTH-103',
} as const;

/** Reads `ErrorResponseDto.code` off a thrown API error; undefined for transport errors */
export function getStoreErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** Reads the HTTP status off a thrown API error, whichever shape the client used */
export function getStoreErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { status?: unknown; statusCode?: unknown };
  if (typeof candidate.status === 'number') return candidate.status;
  if (typeof candidate.statusCode === 'number') return candidate.statusCode;
  return undefined;
}

/** True for "the store does not exist" — accepts a bare 404 too, as the positions screen learned to */
export function isStoreNotFoundError(error: unknown): boolean {
  return (
    getStoreErrorCode(error) === STORE_ERROR_CODE.notFound || getStoreErrorStatus(error) === 404
  );
}

/** True for "you may not do this" — drives the 403 boundary on the detail screen */
export function isStoreForbiddenError(error: unknown): boolean {
  const code = getStoreErrorCode(error);
  return (
    code === STORE_ERROR_CODE.forbidden ||
    code === STORE_ERROR_CODE.unauthenticated ||
    getStoreErrorStatus(error) === 403
  );
}

/**
 * The form's text inputs produce `''` for "cleared", and the master models "unset" as `null`, so a
 * cleared optional field travels as an explicit `null` (an omitted field means「変更しない」on
 * PATCH — spec 028 FR-070b).
 */
export function emptyToNull<T extends string | number>(value: T | null | undefined): T | null {
  if (value === undefined || value === null || value === '') return null;
  return value;
}

/** The form's day key → the wire's `dayOfWeek` */
export const WEEKDAY_TO_API: Record<BusinessHourDay, StoreBusinessHourDto['dayOfWeek']> = {
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday',
  holiday: 'holiday',
};

/** The wire's `dayOfWeek` → the form's day key */
export const WEEKDAY_FROM_API: Record<StoreBusinessHourDto['dayOfWeek'], BusinessHourDay> = {
  monday: 'mon',
  tuesday: 'tue',
  wednesday: 'wed',
  thursday: 'thu',
  friday: 'fri',
  saturday: 'sat',
  sunday: 'sun',
  holiday: 'holiday',
};
