import { useMemo } from 'react';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getNextPageFromPagination, useLoadAllPages } from '@/hooks/use-load-all-pages.hook';

import {
  adminExerciseRefMasterControllerListCategoriesInfiniteOptions,
  adminExerciseRefMasterControllerListMusclesInfiniteOptions,
  adminExerciseRefMasterControllerListTagAxesOptions,
  adminExerciseRefMasterControllerListTagsOptions,
  adminTrainingEquipmentControllerGetToolTypeOptions,
  adminTrainingEquipmentControllerToolTypesOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import {
  EXERCISE_BODYWEIGHT_TOOL_LABEL,
  EXERCISE_OPTION_QUERY_LIMIT,
} from '../_constants/constants';

export type ExerciseMasterOption = {
  id: string;
  code: string;
  label: string;
};

/** `mst_tools` code of 「なし（自重）」 — selecting it clears the E-03 equipment links (FR-008). */
export const BODYWEIGHT_TOOL_CODE = 'none';

/** Active rows in display order (decision D5); every page is loaded so no option is cut off. */
const ACTIVE_MASTER_QUERY = {
  limit: EXERCISE_OPTION_QUERY_LIMIT,
  isActive: true,
  sort: 'sortOrder',
  order: 'asc',
} as const;

const MASTER_CACHE_MS = 5 * 60 * 1000;

function mapMasterOptions(
  items: readonly { id: string; code: string; name: string }[] | undefined,
): ExerciseMasterOption[] {
  return (items ?? []).map((item) => ({ id: item.id, code: item.code, label: item.name }));
}

const ALL_PAGES = { initialPageParam: 1, getNextPageParam: getNextPageFromPagination } as const;

/**
 * Whole category / muscle lists for resolving list / candidate labels and the 協働筋 「選択中」.
 * Single selects of カテゴリ / 主働筋 / エクササイズタイプ / 器具種別 page on scroll instead
 * (`ExerciseRefMasterSelectInput`); the タグ switches read `useExerciseTagGroups`.
 */
export function useExerciseMasterOptions() {
  const categoryQuery = useInfiniteQuery({
    ...adminExerciseRefMasterControllerListCategoriesInfiniteOptions({
      query: ACTIVE_MASTER_QUERY,
    }),
    ...ALL_PAGES,
  });
  const muscleQuery = useInfiniteQuery({
    ...adminExerciseRefMasterControllerListMusclesInfiniteOptions({ query: ACTIVE_MASTER_QUERY }),
    ...ALL_PAGES,
  });
  useLoadAllPages(categoryQuery);
  useLoadAllPages(muscleQuery);

  const categoryOptions = useMemo(
    () => mapMasterOptions(categoryQuery.data?.pages.flatMap((page) => page.items)),
    [categoryQuery.data],
  );
  const primaryMuscleOptions = useMemo(
    () => mapMasterOptions(muscleQuery.data?.pages.flatMap((page) => page.items)),
    [muscleQuery.data],
  );

  return { categoryOptions, primaryMuscleOptions };
}

/**
 * Id of 「なし（自重）」: one keyword read of the tool master (`tool-types` is paged, so the row is
 * looked up by its code instead of scanning the whole list).
 */
export function useBodyweightToolId() {
  const query = useQuery({
    ...adminTrainingEquipmentControllerToolTypesOptions({
      query: {
        includeNone: true,
        keyword: BODYWEIGHT_TOOL_CODE,
        limit: EXERCISE_OPTION_QUERY_LIMIT,
      },
    }),
    staleTime: MASTER_CACHE_MS,
  });
  return query.data?.items.find((item) => item.code === BODYWEIGHT_TOOL_CODE)?.id ?? null;
}

/**
 * 器具種別 label of one id, read through `tool-types/{id}`. 「なし（自重）」 shows the fixed label;
 * `''` while loading, `未設定` when the row cannot be read.
 */
export function useToolTypeLabel(toolId: string | null | undefined) {
  const query = useQuery({
    ...adminTrainingEquipmentControllerGetToolTypeOptions({ path: { id: toolId ?? '' } }),
    enabled: Boolean(toolId),
    retry: false,
    staleTime: MASTER_CACHE_MS,
  });
  if (!toolId) return '';
  const tool = query.data?.id === toolId ? query.data : undefined;
  if (!tool) return query.isLoading ? '' : '未設定';
  return tool.code === BODYWEIGHT_TOOL_CODE ? EXERCISE_BODYWEIGHT_TOOL_LABEL : tool.name;
}

export type ExerciseTagGroup = {
  /** Tag axis code; `null` for tags without an axis. */
  axisCode: string | null;
  axisName: string;
  tags: ExerciseMasterOption[];
};

/** Heading of tags whose axis is unset. */
const TAG_WITHOUT_AXIS_LABEL = 'その他';

/**
 * Active タグ grouped under their axis (グリップ / 向き …, R302), axes in their 表示順 and tags in
 * theirs. The switches show every tag at once, so the master is read whole (`getAll`, FR-010).
 */
export function useExerciseTagGroups() {
  const tagQuery = useQuery({
    ...adminExerciseRefMasterControllerListTagsOptions({
      query: { getAll: true, isActive: true, sort: 'sortOrder', order: 'asc' },
    }),
    staleTime: MASTER_CACHE_MS,
  });
  const axisQuery = useQuery({
    ...adminExerciseRefMasterControllerListTagAxesOptions({ query: { getAll: true } }),
    staleTime: MASTER_CACHE_MS,
  });

  const groups = useMemo<ExerciseTagGroup[]>(() => {
    const axisOrder = new Map(
      (axisQuery.data?.items ?? []).map((axis) => [axis.code, axis.sortOrder] as const),
    );
    const byAxis = new Map<string | null, ExerciseTagGroup>();
    for (const tag of tagQuery.data?.items ?? []) {
      const axisCode = tag.axis?.code ?? null;
      let group = byAxis.get(axisCode);
      if (!group) {
        group = { axisCode, axisName: tag.axis?.name ?? TAG_WITHOUT_AXIS_LABEL, tags: [] };
        byAxis.set(axisCode, group);
      }
      group.tags.push({ id: tag.id, code: tag.code, label: tag.name });
    }
    // Unknown axes keep their first-seen order after the known ones; 「その他」 goes last.
    const rank = (group: ExerciseTagGroup) =>
      group.axisCode === null
        ? Number.POSITIVE_INFINITY
        : (axisOrder.get(group.axisCode) ?? Number.MAX_SAFE_INTEGER);
    return [...byAxis.values()].sort((a, b) => rank(a) - rank(b));
  }, [axisQuery.data?.items, tagQuery.data?.items]);

  return {
    groups,
    isLoading: tagQuery.isLoading,
    isError: tagQuery.isError,
    refetch: () => void tagQuery.refetch(),
  };
}
