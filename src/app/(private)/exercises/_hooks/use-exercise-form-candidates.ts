import { useMemo } from 'react';

import { keepPreviousData, useInfiniteQuery, useQueries } from '@tanstack/react-query';

import { getNextPageFromPagination } from '@/hooks/use-load-all-pages.hook';

import { isRecordNotFoundError } from '@/lib/api-error.util';
import {
  adminExerciseMasterControllerDetailOptions,
  adminExerciseMasterControllerListInfiniteOptions,
  adminTrainingEquipmentControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AdminExerciseMasterControllerListResponse,
  AdminTrainingEquipmentControllerListResponse,
  ExerciseEquipmentRefDto,
} from '@/lib/api-real/types.gen';

import { EXERCISE_CANDIDATE_PAGE_SIZE } from '../_constants/constants';

/** The pieces of an infinite query a candidate list needs to page on scroll. */
function toPaging(query: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => Promise<unknown>;
}) {
  return {
    // A failed page keeps `hasNextPage` true; stop there instead of re-requesting it on every scroll.
    hasMore: query.hasNextPage && !query.isFetchNextPageError,
    isFetchingMore: query.isFetchingNextPage,
    /** A later page failed: the rows already loaded stay usable, the list offers a retry. */
    loadFailed: query.isFetchNextPageError,
    loadMore: () => void query.fetchNextPage(),
  };
}

export type CandidatePaging = ReturnType<typeof toPaging>;

/** 関連エクササイズ candidates (FR-013): server-side keyword, 20 per page, loaded on scroll. */
export function useRelatedExerciseCandidates(keyword: string) {
  const query = useInfiniteQuery({
    ...adminExerciseMasterControllerListInfiniteOptions({
      query: { limit: EXERCISE_CANDIDATE_PAGE_SIZE, keyword: keyword || undefined },
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: AdminExerciseMasterControllerListResponse) =>
      getNextPageFromPagination(lastPage),
    placeholderData: keepPreviousData,
  });

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  return {
    items,
    isLoading: query.isLoading,
    // Only a failed first page is a list error; a failed later page is retried inside the list.
    isError: query.isError && !query.isFetchNextPageError,
    ...toPaging(query),
  };
}

type EquipmentCandidateParams = {
  keyword: string;
  toolId: string | undefined;
  /** `undefined` = all stores (HQ scope). */
  storeId: string | undefined;
  enabled: boolean;
};

/** 機材紐づけ candidates (FR-008): server-side keyword, 20 per page, loaded on scroll. */
export function useEquipmentCandidates({
  keyword,
  toolId,
  storeId,
  enabled,
}: EquipmentCandidateParams) {
  const query = useInfiniteQuery({
    ...adminTrainingEquipmentControllerListInfiniteOptions({
      query: {
        limit: EXERCISE_CANDIDATE_PAGE_SIZE,
        keyword: keyword || undefined,
        storeId,
        mstToolId: toolId,
      },
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: AdminTrainingEquipmentControllerListResponse) =>
      getNextPageFromPagination(lastPage),
    placeholderData: keepPreviousData,
    enabled,
  });

  const items = useMemo(
    () =>
      query.data?.pages.flatMap((page) =>
        page.items.map(
          ({ id, name, mstToolId, toolName }): EquipmentRow => ({
            id,
            label: name,
            toolId: mstToolId,
            toolName,
          }),
        ),
      ) ?? [],
    [query.data],
  );

  return {
    items,
    isLoading: query.isLoading,
    // Only a failed first page is a list error; a failed later page is retried inside the list.
    isError: query.isError && !query.isFetchNextPageError,
    ...toPaging(query),
  };
}

/** One 機材 row as the form shows it. */
export type EquipmentRow = {
  id: string;
  label: string;
  /** The equipment's own 器具種別 (`mst_tools` id) — compared with the exercise's. */
  toolId: string | null;
  toolName: string | null;
};

export type SelectedEquipment = EquipmentRow & {
  /** Deleted, or gate-svc could not read it: the BE answers the id with null fields. */
  isUnavailable: boolean;
};

/**
 * Selected 機材, resolved without a request per id: rows linked when the form opened come with the
 * detail (`equipments`), rows picked since come from the candidate row that was ticked.
 */
export function resolveSelectedEquipment(
  equipmentIds: readonly string[],
  linked: readonly ExerciseEquipmentRefDto[],
  picked: ReadonlyMap<string, EquipmentRow>,
): SelectedEquipment[] {
  const linkedById = new Map(linked.map((item) => [item.id, item]));
  return equipmentIds.map((id) => {
    const row = picked.get(id);
    if (row) return { ...row, isUnavailable: false };
    const ref = linkedById.get(id);
    if (ref?.name) {
      return {
        id,
        label: ref.name,
        toolId: ref.mstToolId,
        toolName: ref.toolName,
        isUnavailable: false,
      };
    }
    return { id, label: id, toolId: null, toolName: null, isUnavailable: true };
  });
}

export type SelectedRelatedExercise = {
  id: string;
  /** `null` while the row is still loading. */
  name: string | null;
  exerciseCode: string | null;
  categoryLabel: string;
  /** The exercise no longer exists (404) — flagged, and dropped from the save (BUG-Y08C-29). */
  isMissing: boolean;
};

/**
 * Selected 関連エクササイズ, read by id (≤3): they can fall outside the current search page.
 * TODO(BE) A-18/B-01 — a logically deleted exercise still answers 200, so only a hard 404 can be
 * flagged here until the BE returns 404 for deleted rows.
 */
export function useSelectedRelatedExercises(relatedIds: readonly string[]) {
  const queries = useQueries({
    queries: relatedIds.map((id) => adminExerciseMasterControllerDetailOptions({ path: { id } })),
  });

  return useMemo<SelectedRelatedExercise[]>(
    () =>
      relatedIds.map((id, index) => {
        const query = queries[index];
        const detail = query?.data;
        return {
          id,
          name: detail ? (detail.descriptions.ja.name ?? detail.name) : null,
          exerciseCode: detail?.exerciseCode ?? null,
          categoryLabel: detail?.categoryName ?? '',
          isMissing: Boolean(query?.isError && isRecordNotFoundError(query.error, 'id')),
        };
      }),
    [relatedIds, queries],
  );
}
