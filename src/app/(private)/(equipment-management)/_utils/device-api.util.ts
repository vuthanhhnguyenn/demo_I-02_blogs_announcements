/**
 * Shared seams for the API-103 (connected devices) / API-104 (relay controllers) integration.
 * Both screens read the same `E-DEV-*` error family and share the same codegen defect, so the
 * helpers live once here (integration-plan D11).
 */
import { getApiErrorStatus } from '@/lib/api-error.util';

/** `E-DEV-*` codes the screens react to specifically; anything else falls to the global toast. */
export const DEVICE_ERROR_CODE = {
  validation: 'E-VAL-001',
  /** 404 — unknown or deleted connected device */
  deviceNotFound: 'E-DEV-001',
  /** 409 — serial number already used in the store */
  duplicateSerial: 'E-DEV-003',
  /** 422 — deviceType × authMethod incompatible */
  incompatibleAuthMethod: 'E-DEV-004',
  /** 422 — empty / oversized bulk batch, or a no-op transition */
  bulkRejected: 'E-DEV-005',
  /** 422 — contract type not offered by the store's brand */
  incompatibleContractType: 'E-DEV-006',
  /** 422 — unknown / deleted / cross-store relay controller */
  invalidController: 'E-DEV-008',
  /** 404 — unknown relay controller */
  controllerNotFound: 'E-DEV-010',
  /** 409 — the controller still has connected devices */
  controllerInUse: 'E-DEV-011',
  /** 422 — invalid controller settings (e.g. port count below the device count) */
  invalidControllerSettings: 'E-DEV-012',
  /** 409 — controller IP already used in the store */
  duplicateControllerIp: 'E-DEV-013',
  /** 409 — optimistic-lock conflict on a controller edit */
  staleController: 'E-DEV-014',
  /** 409 — 接点制御装置ID (relayId) already used by a live controller */
  duplicateRelayId: 'E-DEV-018',
} as const;

type ErrorDetail = { field?: unknown; code?: unknown };

/** Reads `ErrorResponseDto.code` off a thrown API error; undefined for transport errors. */
export function getDeviceErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** Field paths named by an `E-VAL-001` response (`details[].field`). */
export function getValidationErrorFields(error: unknown): string[] {
  if (!error || typeof error !== 'object' || !('details' in error)) return [];
  const { details } = error as { details?: unknown };
  if (!Array.isArray(details)) return [];
  return (details as ErrorDetail[])
    .map((detail) => detail.field)
    .filter((field): field is string => typeof field === 'string');
}

/**
 * 機器ID / 装置ID are the API's UUIDs, shown short — the ID format is the BE's call (specs 029 /
 * 008, Session 2026-10-12). The ids are UUIDv7 — the leading characters are a timestamp shared by
 * rows created together — so the random tail is shown; callers put the full id in `title`.
 */
export function formatShortId(id: string): string {
  return id.slice(-8);
}

/** HTTP status of a thrown API error (`status`, or `statusCode` on the real API's body), if any. */
function getDeviceErrorStatus(error: unknown): number | undefined {
  const status = getApiErrorStatus(error);
  if (status != null) return status;
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const { statusCode } = error as { statusCode?: unknown };
    if (typeof statusCode === 'number') return statusCode;
  }
  return undefined;
}

/**
 * The record is gone (deleted in another tab / by another user): the screen must leave the stale
 * detail or form for the list (BUG-E02-B-10 / C-09 / E-08 / F-08). The toast itself comes from the
 * global MutationCache.
 */
export function isDeviceNotFoundError(error: unknown): boolean {
  const code = getDeviceErrorCode(error);
  return (
    code === DEVICE_ERROR_CODE.deviceNotFound ||
    code === DEVICE_ERROR_CODE.controllerNotFound ||
    getDeviceErrorStatus(error) === 404
  );
}

/**
 * Someone else changed the record in between (stale edit, a device attached while the delete
 * dialog was open, …): the screen must refetch so it shows the current state (BUG-E02-E-07 / F-07).
 */
export function isDeviceConflictError(error: unknown): boolean {
  return getDeviceErrorStatus(error) === 409;
}
