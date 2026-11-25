'use client';

import { useBackToListHref } from '@/hooks/use-return-to.hook';

import { BackLink } from './back-link';

/**
 * Breadcrumb 「〇〇管理に戻る」 that returns to the list with its search/paging kept
 * (`?returnTo=`, see use-return-to.hook). Client-only, so server pages can drop it in as-is.
 */
export function BackToListLink({ label, listPath }: { label: string; listPath: string }) {
  const href = useBackToListHref(listPath);
  return <BackLink label={label} href={href} />;
}
