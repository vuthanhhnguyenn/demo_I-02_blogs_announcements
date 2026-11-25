import { resolveApiErrorMessage } from '@/lib/api-error.util';

/** Error codes of `PATCH /admin/members/{memberId}` the screen branches on. */
export const MEMBER_UPDATE_ERROR_CODE = {
  emailDuplicate: 'E-MEM-203',
  phoneDuplicate: 'E-MEM-204',
} as const;

function getMemberErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/**
 * A duplicate (409) is reported on the field that collided rather than as a bare toast.
 * Email and phone are unique on the Yamauchi side, and only the error code says which of the
 * two was already taken — the wording itself is the server's.
 */
export function getDuplicateFieldError(
  error: unknown,
): { field: 'email' | 'phone'; message: string } | null {
  switch (getMemberErrorCode(error)) {
    case MEMBER_UPDATE_ERROR_CODE.emailDuplicate:
      return { field: 'email', message: resolveApiErrorMessage(error) };
    case MEMBER_UPDATE_ERROR_CODE.phoneDuplicate:
      return { field: 'phone', message: resolveApiErrorMessage(error) };
    default:
      return null;
  }
}
