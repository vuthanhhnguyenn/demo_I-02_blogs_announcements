import { useCallback, useRef } from 'react';

/**
 * Lets the first call through and drops the rest until `release` runs.
 *
 * A mutation's `isPending` flips a render later, so a fast double-click (or a held Enter) fires the
 * handler again before the button is disabled — each extra call is another POST, and the duplicates
 * of a decision come back as 500s. A ref flips synchronously, so it closes that window.
 */
export function useSubmitLock() {
  const locked = useRef(false);

  const run = useCallback((submit: () => void) => {
    if (locked.current) return;
    locked.current = true;
    submit();
  }, []);

  const release = useCallback(() => {
    locked.current = false;
  }, []);

  return { run, release };
}
