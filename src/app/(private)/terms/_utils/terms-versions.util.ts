import type { TermsRelatedVersionDto } from '@/lib/api-real/types.gen';

/**
 * Most recent first (US2-4 / FR-011): the API lists the lineage oldest first, so newest start
 * date leads; reversing first keeps the later-created entry ahead on an equal start date.
 */
export function sortVersionsNewestFirst(versions: readonly TermsRelatedVersionDto[]) {
  return [...versions].reverse().sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
}
