import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  adminExerciseRefMasterControllerListCategoriesOptions,
  adminExerciseRefMasterControllerListExplanationsOptions,
  adminExerciseRefMasterControllerListMusclesOptions,
  adminExerciseRefMasterControllerListTagsOptions,
  adminExerciseRefMasterControllerListTypesOptions,
  adminTrainingEquipmentControllerToolTypesOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { type ExerciseMasterRow, TAB_ORDER, type TabKey } from '../_constants/constants';

/** Default rows per page of a master table. */
export const MASTER_PAGE_SIZE = 20;
export const MASTER_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

type MasterListQuery = {
  page: number;
  limit: number;
  sort: 'sortOrder' | 'createdAt';
  order: 'asc' | 'desc';
  keyword?: string;
};

type MasterListResult = {
  data?: { items: ExerciseMasterRow[]; pagination: { totalItems: number } };
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type PagedListHook = (query: MasterListQuery, enabled: boolean) => MasterListResult;

const PAGED_LIST_QUERY = { placeholderData: keepPreviousData } as const;

function useCategoryList(query: MasterListQuery, enabled: boolean) {
  return useQuery({
    ...adminExerciseRefMasterControllerListCategoriesOptions({ query }),
    ...PAGED_LIST_QUERY,
    enabled,
  });
}

function useMuscleList(query: MasterListQuery, enabled: boolean) {
  return useQuery({
    ...adminExerciseRefMasterControllerListMusclesOptions({ query }),
    ...PAGED_LIST_QUERY,
    enabled,
  });
}

function useExerciseTypeList(query: MasterListQuery, enabled: boolean) {
  return useQuery({
    ...adminExerciseRefMasterControllerListTypesOptions({ query }),
    ...PAGED_LIST_QUERY,
    enabled,
  });
}

function useTagList(query: MasterListQuery, enabled: boolean) {
  return useQuery({
    ...adminExerciseRefMasterControllerListTagsOptions({ query }),
    ...PAGED_LIST_QUERY,
    enabled,
  });
}

function useExplanationList(query: MasterListQuery, enabled: boolean) {
  return useQuery({
    ...adminExerciseRefMasterControllerListExplanationsOptions({ query }),
    ...PAGED_LIST_QUERY,
    enabled,
  });
}

/** `mst_tools` (E-03-owned), paged like the others; 「なし（自重）」 and inactive rows included. */
function useToolTypeList(query: MasterListQuery, enabled: boolean) {
  return useQuery({
    ...adminTrainingEquipmentControllerToolTypesOptions({
      query: { ...query, includeInactive: true, includeNone: true },
    }),
    ...PAGED_LIST_QUERY,
    enabled,
  });
}

/**
 * The row with the highest 表示順 — its response's `totalItems` is the tab's count, and its
 * 表示順 + 1 is suggested for a new row. One cheap request per tab.
 */
const SUMMARY_QUERY: MasterListQuery = { page: 1, limit: 1, sort: 'sortOrder', order: 'desc' };

export type MasterTabSummary = { total: number | undefined; topSortOrder: number };

/** Count and highest 表示順 of every tab (all rows, regardless of a tab's search). */
export function useMasterTabSummaries(enabled: boolean): Record<TabKey, MasterTabSummary> {
  const paged: Record<TabKey, MasterListResult> = {
    category: useCategoryList(SUMMARY_QUERY, enabled),
    muscle: useMuscleList(SUMMARY_QUERY, enabled),
    exercise_type: useExerciseTypeList(SUMMARY_QUERY, enabled),
    tag: useTagList(SUMMARY_QUERY, enabled),
    explanation: useExplanationList(SUMMARY_QUERY, enabled),
    tool: useToolTypeList(SUMMARY_QUERY, enabled),
  };

  return Object.fromEntries(
    TAB_ORDER.map((kind) => {
      const { data } = paged[kind];
      return [
        kind,
        { total: data?.pagination.totalItems, topSortOrder: data?.items[0]?.sortOrder ?? 0 },
      ];
    }),
  ) as Record<TabKey, MasterTabSummary>;
}

type MasterTabListParams = {
  keyword: string;
  page: number;
  pageSize: number;
  /** Fetch only while the tab is open. */
  enabled: boolean;
};

/** One tab's table: the rows of the current page and the total matching the search. */
export type MasterTabList = {
  items: readonly ExerciseMasterRow[];
  total: number;
  /** A response for the current params has arrived (the total is real, not a default). */
  isLoaded: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

/** Paged masters: one page from the server (keyword included). */
function usePagedTabList(
  usePagedList: PagedListHook,
  { keyword, page, pageSize, enabled }: MasterTabListParams,
): MasterTabList {
  // Every row (active and inactive), newest first — Y-08 defines no default sort for the masters.
  const query = usePagedList(
    {
      page,
      limit: pageSize,
      sort: 'createdAt',
      order: 'desc',
      keyword: keyword.trim() || undefined,
    },
    enabled,
  );
  return {
    items: query.data?.items ?? [],
    total: query.data?.pagination.totalItems ?? 0,
    isLoaded: Boolean(query.data),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

function useCategoryTabList(params: MasterTabListParams) {
  return usePagedTabList(useCategoryList, params);
}
function useMuscleTabList(params: MasterTabListParams) {
  return usePagedTabList(useMuscleList, params);
}
function useExerciseTypeTabList(params: MasterTabListParams) {
  return usePagedTabList(useExerciseTypeList, params);
}
function useTagTabList(params: MasterTabListParams) {
  return usePagedTabList(useTagList, params);
}
function useExplanationTabList(params: MasterTabListParams) {
  return usePagedTabList(useExplanationList, params);
}
function useToolTabList(params: MasterTabListParams) {
  return usePagedTabList(useToolTypeList, params);
}

/** Table data per tab. A panel's `kind` is fixed, so it always calls the same hook. */
export const USE_MASTER_TAB_LIST: Record<TabKey, (params: MasterTabListParams) => MasterTabList> = {
  category: useCategoryTabList,
  muscle: useMuscleTabList,
  exercise_type: useExerciseTypeTabList,
  tag: useTagTabList,
  explanation: useExplanationTabList,
  tool: useToolTabList,
};
