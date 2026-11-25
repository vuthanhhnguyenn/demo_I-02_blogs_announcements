import { API_PAGE_SIZE_OPTIONS, PAGE_SIZE } from '@/constants/app.constants';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminExerciseMasterControllerListData } from '@/lib/api-real/types.gen';

import type { ExerciseLevel, ExerciseStatus } from '../_constants/constants';
import { toIsBeginnerVisible } from '../_utils/exercise-level.util';

type ExercisesQuery = NonNullable<AdminExerciseMasterControllerListData['query']>;

/** Sortable headers (D19 — prototype: エクササイズ名 / ステータス / 最終更新日); ids match the columns. */
export const EXERCISE_SORT_KEYS = ['name', 'publishStatus', 'updatedAt'] as const;
export type ExerciseSortKey = (typeof EXERCISE_SORT_KEYS)[number];

/** FR-001 default order, used by the API query only — the headers show no selection for it. */
const DEFAULT_EXERCISE_SORT: ExerciseSortKey = 'updatedAt';
const DEFAULT_EXERCISE_ORDER = 'desc' as const;

/**
 * BE keyword maxLength — a longer keyword is a 400. Per D17 the input is not capped: the screen
 * shows a message and the over-long keyword is never sent.
 */
export const EXERCISE_SEARCH_MAX_LENGTH = 100;

const isKeywordTooLong = (value: string) => value.length > EXERCISE_SEARCH_MAX_LENGTH;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A hand-edited master id that is not a UUID would be a 400; treat it as "no filter". */
const toMasterId = (value: string | null) => (value && UUID_PATTERN.test(value) ? value : null);

const PUBLISH_STATUS_QUERY = {
  public: 'published',
  private: 'unpublished',
} as const satisfies Record<ExerciseStatus, ExercisesQuery['publishStatus']>;

export function useExercisesFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(PAGE_SIZE),
      search: parseAsString.withDefault(''),
      categoryId: parseAsString,
      primaryMuscleId: parseAsString,
      toolId: parseAsString,
      level: parseAsStringEnum<ExerciseLevel>(['beginner', 'expert']),
      publishStatus: parseAsStringEnum<ExerciseStatus>(['public', 'private']),
      // No default here: an absent sort means "no header selected", so 最終更新日 cycles
      // asc → desc → cleared like the others. The FR-001 default order is applied in `queryParams`.
      sort: parseAsStringEnum<ExerciseSortKey>([...EXERCISE_SORT_KEYS]),
      order: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.search, (value) => {
    if (isKeywordTooLong(value)) return;
    setFilters({ search: value || null, page: 1 });
  });
  const isSearchTooLong = isKeywordTooLong(searchInput);
  const categoryId = toMasterId(filters.categoryId);
  const primaryMuscleId = toMasterId(filters.primaryMuscleId);
  const toolId = toMasterId(filters.toolId);

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      limit: PAGE_SIZE,
      search: null,
      categoryId: null,
      primaryMuscleId: null,
      toolId: null,
      level: null,
      publishStatus: null,
    });
  };

  const setSorting = (sort: ExerciseSortKey, order: 'asc' | 'desc') =>
    setFilters({ sort, order, page: 1 });

  /** A cleared header drops the sort from the URL, so the list falls back to the FR-001 default. */
  const clearSorting = () => setFilters({ sort: null, order: null, page: 1 });

  // A hand-edited URL (page=0, limit=200) would be a 400; fall back to valid values instead.
  const page = Number.isInteger(filters.page) && filters.page >= 1 ? filters.page : 1;
  const limit = (API_PAGE_SIZE_OPTIONS as readonly number[]).includes(filters.limit)
    ? filters.limit
    : PAGE_SIZE;

  // FR-001 default order (最終更新日 desc) when no header is selected.
  const sort: ExerciseSortKey = filters.sort ?? DEFAULT_EXERCISE_SORT;
  const order = filters.sort ? (filters.order ?? 'desc') : DEFAULT_EXERCISE_ORDER;

  const queryParams: ExercisesQuery = {
    page,
    limit,
    // A deep link may carry an over-long keyword; it is flagged in the input, never sent.
    keyword: (!isKeywordTooLong(filters.search) && filters.search) || undefined,
    categoryId: categoryId ?? undefined,
    primaryMuscleId: primaryMuscleId ?? undefined,
    toolId: toolId ?? undefined,
    // Spec レベル = `isBeginnerVisible` (D27).
    isBeginnerVisible: filters.level ? toIsBeginnerVisible(filters.level) : undefined,
    publishStatus: filters.publishStatus ? PUBLISH_STATUS_QUERY[filters.publishStatus] : undefined,
    sort,
    order,
  };

  // FR-016 CSV export: the same filters and order, every page.
  const exportQueryParams: ExercisesQuery = {
    keyword: queryParams.keyword,
    categoryId: queryParams.categoryId,
    primaryMuscleId: queryParams.primaryMuscleId,
    toolId: queryParams.toolId,
    isBeginnerVisible: queryParams.isBeginnerVisible,
    publishStatus: queryParams.publishStatus,
    sort: queryParams.sort,
    order: queryParams.order,
  };

  /** Prototype activeFilterCount — the five selects only (the keyword is not counted). */
  const activeFilterCount = [
    categoryId,
    primaryMuscleId,
    toolId,
    filters.level,
    filters.publishStatus,
  ].filter((value) => value !== null).length;

  const hasActiveFilters = Boolean(queryParams.keyword) || activeFilterCount > 0;

  return {
    filters: { ...filters, categoryId, primaryMuscleId, toolId },
    setFilters,
    setSorting,
    clearSorting,
    queryParams,
    exportQueryParams,
    hasActiveFilters,
    activeFilterCount,
    searchInput,
    setSearchInput,
    isSearchTooLong,
    clearFilters,
    currentPage: page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    pageSize: limit,
    setPageSize: (nextLimit: number) => setFilters({ limit: nextLimit, page: 1 }),
  };
}
