'use client';

import { useMemo } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import {
  adminOptionControllerListInfiniteOptions,
  adminPlanControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  LessonListItemDto,
  OptionListResponseDto,
  PlanListResponseDto,
} from '@/lib/api-real/types.gen';

import { RESTRICTION_CANDIDATE_PAGE_SIZE } from '../_constants/constants';

export type RestrictionKind = 'plan' | 'option';

export interface RestrictionCandidate {
  value: string;
  label: string;
}

const nextPage = (lastPage: { pagination: { page: number; totalPages: number } }) =>
  lastPage.pagination.page < lastPage.pagination.totalPages
    ? lastPage.pagination.page + 1
    : undefined;

/**
 * The 予約制限 candidates of the lesson's brand, searched on the server (plans by `nameQuery`,
 * options by `keyword` — name or option code) and read page by page as the picker scrolls, so
 * every plan / option can be found however many the brand has. Fetches only while `enabled`
 * (the picker is open).
 */
export function useRestrictionCandidates(
  kind: RestrictionKind,
  brand: LessonListItemDto['brand'] | undefined,
  search: string,
  enabled: boolean,
) {
  const plansQuery = useInfiniteQuery({
    ...adminPlanControllerListInfiniteOptions({
      query: {
        brandEnum: brand,
        nameQuery: search || undefined,
        sort: 'name',
        order: 'asc',
        limit: RESTRICTION_CANDIDATE_PAGE_SIZE,
      },
    }),
    enabled: enabled && kind === 'plan' && !!brand,
    initialPageParam: 1,
    getNextPageParam: (lastPage: PlanListResponseDto) => nextPage(lastPage),
  });
  const optionsQuery = useInfiniteQuery({
    ...adminOptionControllerListInfiniteOptions({
      query: {
        brandEnum: brand,
        keyword: search || undefined,
        sort: 'name',
        order: 'asc',
        limit: RESTRICTION_CANDIDATE_PAGE_SIZE,
      },
    }),
    enabled: enabled && kind === 'option' && !!brand,
    initialPageParam: 1,
    getNextPageParam: (lastPage: OptionListResponseDto) => nextPage(lastPage),
  });

  const candidates = useMemo<RestrictionCandidate[]>(
    () =>
      kind === 'plan'
        ? (plansQuery.data?.pages ?? []).flatMap((page) =>
            page.items.map((p) => ({ value: p.planId, label: p.name })),
          )
        : (optionsQuery.data?.pages ?? []).flatMap((page) =>
            page.items.map((o) => ({ value: o.id, label: o.name })),
          ),
    [kind, plansQuery.data, optionsQuery.data],
  );

  const query = kind === 'plan' ? plansQuery : optionsQuery;
  return {
    candidates,
    /** First page of the current search */
    isLoading: query.isFetching && !query.isFetchingNextPage,
    /** The first page failed (a later page failing keeps the rows already read) */
    isError: query.isError && !query.isFetchNextPageError,
    isFetchNextPageError: query.isFetchNextPageError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
    refetch: () => void query.refetch(),
  };
}
