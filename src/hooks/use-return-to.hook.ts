'use client';

import { useCallback } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

const RETURN_TO_PARAM = 'returnTo';

/**
 * List side: appends the list's current URL (path + search/paging query) as `?returnTo=`
 * to a link that leaves the list, so the target page's breadcrumb can come back to the
 * same search conditions and page instead of the bare list URL.
 *
 * Pass `returnTo` to forward an already-known list URL instead (e.g. detail → edit keeps
 * the list URL the detail was opened from).
 */
export function useWithReturnTo() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (href: string, returnTo?: string) => {
      const query = searchParams.toString();
      const current = returnTo ?? (query ? `${pathname}?${query}` : pathname);
      const separator = href.includes('?') ? '&' : '?';
      return `${href}${separator}${RETURN_TO_PARAM}=${encodeURIComponent(current)}`;
    },
    [pathname, searchParams],
  );
}

/**
 * Target side: the href for the breadcrumb's 「〇〇に戻る」 link. Uses `?returnTo=` only when
 * it points back at `listPath` (never an arbitrary/external URL); otherwise the bare list.
 */
export function useBackToListHref(listPath: string) {
  const returnTo = useSearchParams().get(RETURN_TO_PARAM);
  const isListUrl =
    returnTo !== null && (returnTo === listPath || returnTo.startsWith(`${listPath}?`));
  return isListUrl ? returnTo : listPath;
}
