import { useCallback, useRef } from 'react';

/**
 * Drops repeat calls of a write action while the first one is still running.
 *
 * `disabled={mutation.isPending}` only takes effect after the next render, so two or three clicks
 * landing in the same tick each fire a request. A ref flips synchronously and closes that gap
 * (same idea as the inline `isSubmittingRef` in unlink-store-dialog.tsx).
 *
 * Wrap the click/submit handler: `const run = useInFlightGuard(); onClick={() => run(() => save())}`.
 * The action must return the promise of the write (e.g. `mutation.mutateAsync(...)`) so the guard
 * is released when the write settles, success or failure.
 */
export function useInFlightGuard() {
  const inFlightRef = useRef(false);

  return useCallback(async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    try {
      return await action();
    } finally {
      inFlightRef.current = false;
    }
  }, []);
}
