import { useCallback, useRef } from 'react';

/**
 * Same-tick double-submit guard. Two clicks inside one event loop turn both reach the submit
 * handler before React re-renders the button as disabled, so `isPending` alone cannot stop them.
 * `tryStart()` is true for the first caller only; call `release()` when the submit failed so the
 * form can be submitted again (leave it held on success — the screen navigates away).
 */
export function useSingleSubmit() {
  const busyRef = useRef(false);
  const tryStart = useCallback(() => {
    if (busyRef.current) return false;
    busyRef.current = true;
    return true;
  }, []);
  const release = useCallback(() => {
    busyRef.current = false;
  }, []);
  return { tryStart, release };
}
