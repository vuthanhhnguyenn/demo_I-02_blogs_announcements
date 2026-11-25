import { useCallback, useRef } from 'react';

/**
 * Drops a call while the previous one is still in flight.
 *
 * `mutation.isPending` only flips after a re-render, so two clicks in the same tick both see
 * `false` and fire two requests (2× DELETE → 204 + 404, 2× duplicate/create → one 500). A ref
 * flips synchronously. `run` gets a `release` to call once the request settles.
 */
export function useSingleFlight() {
  const busyRef = useRef(false);

  return useCallback((run: (release: () => void) => void) => {
    if (busyRef.current) return;
    busyRef.current = true;
    run(() => {
      busyRef.current = false;
    });
  }, []);
}
