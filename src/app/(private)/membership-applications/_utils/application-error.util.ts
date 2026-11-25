/** API-098 error codes the screens react to specifically (integration-plan.md D11). */
export const APPLICATION_ERROR_CODE = {
  /** 409 — not in a status that allows the operation */
  invalidStatus: 'E-ENR-002',
  /** 409 — daily same-day cancel limit reached */
  sameDayCancelLimit: 'E-ENR-005',
  /** 409 — the status changed since the screen loaded (expectedStatus mismatch) */
  statusChanged: 'E-ENR-007',
  /** 404 — not found / outside the caller's scope */
  notFound: 'E-ENR-012',
  /** 409 — usage already started; cancellation refused */
  usageStarted: 'E-ENR-201',
  /** 409 — blacklist screen not completed; approval refused */
  blacklistUnchecked: 'E-ENR-204',
} as const;

/** Reads `ErrorResponseDto.code` off a thrown API error; undefined for transport errors. */
export function getApplicationErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** A stale-state answer: the screen should refetch rather than retry blindly. */
export function isStaleStateError(error: unknown): boolean {
  const code = getApplicationErrorCode(error);
  return (
    code === APPLICATION_ERROR_CODE.invalidStatus || code === APPLICATION_ERROR_CODE.statusChanged
  );
}
