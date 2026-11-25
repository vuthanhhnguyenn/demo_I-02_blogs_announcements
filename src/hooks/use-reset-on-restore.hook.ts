'use client';

import { useEffect } from 'react';

/**
 * Runs `reset` when the browser restores the page from its back/forward cache.
 *
 * A bfcache restore is not a reload: the JS heap — and with it every piece of React state —
 * comes back exactly as it was left. Any "we are navigating away" flag therefore survives the
 * Back button and has to be cleared by hand, or the control it guards stays stuck (Y-13 不具合08:
 * the Google sign-in button kept its spinner and stayed disabled after backing out of Google).
 *
 * `pageshow` is the only event that fires on a bfcache restore, and `persisted` is what tells a
 * restore apart from the initial load. Browsers that decline to bfcache a page reload it instead,
 * which resets the state on its own — so both paths end up clean.
 */
export function useResetOnRestore(reset: () => void): void {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) reset();
    }

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [reset]);
}
