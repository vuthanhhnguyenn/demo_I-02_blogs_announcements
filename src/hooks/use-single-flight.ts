import { useCallback, useRef } from 'react';

/**
 * Synchronous re-entry guard for a mutation trigger. `isPending` only flips after a render, so a
 * double-click can fire the handler twice before the button is disabled; the ref closes that gap.
 * Call `acquire()` before `mutate` (bail out when it returns false) and pass `release` as the
 * mutation's `onSettled`.
 */
export function useSingleFlight() {
  const inFlight = useRef(false);

  const acquire = useCallback(() => {
    if (inFlight.current) return false;
    inFlight.current = true;
    return true;
  }, []);

  const release = useCallback(() => {
    inFlight.current = false;
  }, []);

  return { acquire, release };
}
