'use client';

import { useMemo } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import { adminTermsControllerListInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  TermsDocumentListResponseDto,
  TermsDocumentSummaryDto,
} from '@/lib/api-real/types.gen';

import type { BrandGroup } from '../../_utils/brand-group.util';

const TERMS_PAGE_SIZE = 20;

/** Terms types never asked on enrolment (API-098 `termsConsents`). */
const EXCLUDED_TERMS_TYPES: readonly string[] = ['withdrawal', 'suspension'];

/**
 * A terms document's brand → brand group. Dev data carries both the contract's `Fit365` /
 * `Joyfit…` values and upper-case `FIT365` / `JOYFIT`, so the match is case-insensitive.
 * Null = company-wide.
 */
function termsBrandGroup(brandEnum: string | null): BrandGroup | null {
  const brand = brandEnum?.toLowerCase();
  if (!brand) return null;
  return brand.startsWith('fit365') ? 'FIT365' : 'JOYFIT';
}

/**
 * The terms the applicant consents to on the admin form (API-098 `termsConsents`, API-076 §3):
 * published documents that require consent, minus withdrawal / suspension terms. Fetched on
 * form load; once a brand is picked only that brand group's and company-wide terms remain.
 * Paged by `TERMS_PAGE_SIZE` with infinite scroll in the 規約同意 card; `hasNextPage` stays true
 * until every page is loaded, and the form blocks submit until then so no consent is missed.
 */
export function useEnrollmentTerms(brandGroup: BrandGroup | undefined) {
  const terms = useInfiniteQuery({
    ...adminTermsControllerListInfiniteOptions({
      query: { status: 'published', limit: TERMS_PAGE_SIZE, sort: 'displayOrder', order: 'asc' },
    }),
    staleTime: 5 * 60 * 1000,
    retry: false,
    initialPageParam: 1,
    // totalPages is 0 on an empty result (API-076 envelope), so `page < totalPages` ends it too.
    getNextPageParam: (lastPage: TermsDocumentListResponseDto) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = terms;

  return useMemo(() => {
    const items: TermsDocumentSummaryDto[] = (
      data?.pages.flatMap((page) => page.items) ?? []
    ).filter((t) => {
      const group = termsBrandGroup(t.brandEnum);
      return (
        t.requiresConsent &&
        !t.isDeleted &&
        !EXCLUDED_TERMS_TYPES.includes(t.termsType) &&
        (!brandGroup || group === null || group === brandGroup)
      );
    });
    return {
      terms: items,
      isLoading,
      isError,
      hasNextPage,
      isFetchingNextPage,
      fetchNextPage,
    };
  }, [brandGroup, data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage]);
}
