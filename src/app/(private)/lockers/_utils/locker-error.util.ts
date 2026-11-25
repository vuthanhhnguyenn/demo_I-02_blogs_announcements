import { toast } from 'sonner';

import { getApiErrorCode, resolveApiErrorMessage } from '@/lib/api-error.util';
import type { OpenLockerSlotsBulkErrorResponseDto } from '@/lib/api-real/types.gen';

/**
 * Locker error codes the screens branch on (API-100 / API-101 §11).
 * Toast copy comes from the BE `userMessage` through the shared MutationCache. The one exception
 * is a lost optimistic-lock race (D9): E-LOC-006's catalog text describes the reshape rule, so a
 * stale write is told apart here and gets 「他のユーザーが更新しました」.
 */
export const LockerErrorCode = {
  /** 409 — cabinet still has slots in use / pending release */
  CABINET_IN_USE: 'E-LOC-004',
  /** 409 — same location code already exists in the store */
  DUPLICATE_LOCATION: 'E-LOC-005',
  /** 422 — stale `expectedUpdatedAt` / reshape blocked by non-available slots */
  STALE_OR_RESHAPE_BLOCKED: 'E-LOC-006',
  /** 422 — slot PATCH rule (PIN on a non-dial lock, bottom-row toggle with fee override, …) */
  SLOT_RULE: 'E-LOC-007',
  /** 422 — slot not available for a contract */
  SLOT_NOT_AVAILABLE: 'E-LOC-010',
  /** 409 — member has unpaid balance */
  UNPAID_BALANCE: 'E-LOC-011',
  /** 422 — slot not pending release (open) */
  SLOT_NOT_PENDING_RELEASE: 'E-LOC-012',
  /** 422 — stale `expectedSlotUpdatedAt` */
  STALE_SLOT: 'E-LOC-013',
  /** 409 — main contract already holds a locker slot */
  CONTRACT_ALREADY_ASSIGNED: 'E-LOC-014',
  /** 422 — main contract in its cancellation-fee period (#36); only `pending_start` is exempt */
  FEE_PERIOD: 'E-LOC-015',
  /** 404 — locker contract not found */
  CONTRACT_NOT_FOUND: 'E-LOC-016',
  /** 403 — store out of the staff's scope */
  OUT_OF_SCOPE: 'E-LOC-100',
  /** 403 — trainer / observer write */
  READ_ONLY_ROLE: 'E-LOC-101',
  /** 429 — CSV export rate limit (5 / minute) */
  RATE_LIMITED: 'E-RATE-001',
} as const;

/** API-101 §10.1: E-LOC-013 also answers status rules; only its stale case ends with this */
const STALE_VERSION_MARKER = '(stale version detected)';

/**
 * The write lost an optimistic-lock race: the screen should refetch before the next try.
 * E-LOC-013 counts only with the stale marker — without it the slot's status broke a rule, and
 * the BE `userMessage` says which. E-LOC-006 carries no marker: the slot PATCH never sends a lock
 * change for an in-use slot, so there it is always a race; the cabinet edit page tells it apart
 * from the reshape rule itself.
 */
export function isLockerStaleWriteError(error: unknown): boolean {
  const code = getApiErrorCode(error);
  if (code === LockerErrorCode.STALE_OR_RESHAPE_BLOCKED) return true;
  if (code !== LockerErrorCode.STALE_SLOT) return false;
  const { userMessage } = error as { userMessage?: unknown };
  return typeof userMessage === 'string' && userMessage.trimEnd().endsWith(STALE_VERSION_MARKER);
}

/** `POST /locker-slots/open-bulk` is atomic; its error body still lists what failed and why */
export function getBulkOpenFailure(error: unknown): OpenLockerSlotsBulkErrorResponseDto | null {
  if (typeof error !== 'object' || error === null) return null;
  const body = error as Partial<OpenLockerSlotsBulkErrorResponseDto>;
  return Array.isArray(body.processed) && body.summary
    ? (body as OpenLockerSlotsBulkErrorResponseDto)
    : null;
}

/** D9: the copy for a write that lost an optimistic-lock race (spec E-LOC-006) */
export const LOCKER_STALE_WRITE_MESSAGE = '他のユーザーが更新しました';

/**
 * Error toast for a mutation that opted out of the shared one (`meta: { suppressErrorToast: true }`)
 * because a stale write needs its own copy. Callers refetch through their `onSettled` invalidation.
 */
export function toastLockerWriteError(error: unknown): void {
  toast.error(
    isLockerStaleWriteError(error) ? LOCKER_STALE_WRITE_MESSAGE : resolveApiErrorMessage(error),
  );
}
