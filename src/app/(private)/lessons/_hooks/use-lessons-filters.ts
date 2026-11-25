import { useAuthUser } from '@/contexts/auth-user.context';
import {
  ALL_STORES,
  canRoleReadStoreMaster,
  useCurrentStore,
} from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import { adminStoreControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { AdminLessonControllerListData } from '@/lib/api-real/types.gen';

import {
  DEFAULT_LESSON_STATUS_FILTER,
  LESSONS_PAGE_SIZE,
  LESSON_STATUS_FILTER_VALUES,
  type LessonStatusFilter,
  type LessonTab,
} from '../_constants/constants';
import {
  type ApiFeeType,
  type ApiLessonBrand,
  FEE_TYPE_LABELS,
  LESSON_BRAND_OPTIONS,
  LESSON_TYPE_BY_TAB,
} from '../_utils/lesson-api.util';

const TAB_VALUES: LessonTab[] = ['studio', 'personal', 'bodycare'];
const BRAND_VALUES = LESSON_BRAND_OPTIONS.map((o) => o.value);
const FEE_TYPE_VALUES = Object.keys(FEE_TYPE_LABELS) as ApiFeeType[];

/** The API sorts by name / createdAt / updatedAt / durationMinutes only */
const DEFAULT_SORT_BY = 'name';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'asc';

export type LessonListQuery = NonNullable<AdminLessonControllerListData['query']>;

/** Sortable table columns → the API's `sort` (TODO(round2) B2: other columns are not sortable) */
const SORT_BY_COLUMN: Record<string, NonNullable<LessonListQuery['sort']>> = {
  name: 'name',
  duration: 'durationMinutes',
};

export function useLessonsFilters() {
  // The header's store narrows the masters to that store's BRAND (decision D1): a storeId would
  // keep only the store's own masters and hide the brand-wide ones. "All stores" applies none.
  // Trainer / Observer cannot read the store master (API-083 → 403), and their list is already
  // narrowed to their store's brand on the server (API-111 §6.6), so the store is not asked for.
  const { currentStoreId } = useCurrentStore();
  const { user } = useAuthUser();
  const canReadStore = canRoleReadStoreMaster(user?.role);
  const effectiveStoreId =
    currentStoreId === ALL_STORES || !canReadStore ? undefined : currentStoreId;
  const storeQuery = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: effectiveStoreId ?? '' } }),
    enabled: !!effectiveStoreId,
    retry: false,
  });
  const storeBrand = storeQuery.data?.brandEnum as ApiLessonBrand | undefined;
  /** Lists wait for the store's brand so they never flash every brand first */
  const isScopeReady = !effectiveStoreId || storeQuery.isSuccess || storeQuery.isError;

  const [filters, setFilters] = useQueryStates(
    {
      tab: parseAsStringEnum<LessonTab>(TAB_VALUES).withDefault('studio'),
      search: parseAsString.withDefault(''),
      brand: parseAsArrayOf(parseAsStringEnum<ApiLessonBrand>(BRAND_VALUES)).withDefault([]),
      fee_type: parseAsArrayOf(parseAsStringEnum<ApiFeeType>(FEE_TYPE_VALUES)).withDefault([]),
      status: parseAsStringEnum<LessonStatusFilter>(LESSON_STATUS_FILTER_VALUES).withDefault(
        DEFAULT_LESSON_STATUS_FILTER,
      ),
      sort_by: parseAsString.withDefault(DEFAULT_SORT_BY),
      sort_order: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']).withDefault(
        DEFAULT_SORT_ORDER,
      ),
      page: parseAsInteger.withDefault(1),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.search, (value) =>
    setFilters({ search: value || null, page: 1 }),
  );

  // "すべてクリア" resets the detailed filters only — the search box is a separate
  // control and its typed text is intentionally left untouched (contrast with changeTab below).
  // The status goes back to its default (active only), not to 全ステータス.
  const resetPayload = {
    brand: null,
    fee_type: null,
    status: null,
    sort_by: DEFAULT_SORT_BY,
    sort_order: DEFAULT_SORT_ORDER,
    page: 1,
  };

  const clearFilters = () => {
    setFilters({ ...resetPayload });
  };

  // Switching tabs resets every filter, including search, so the studio/personal/bodycare
  // tabs never share filter state (their category axes are not interchangeable).
  const changeTab = (tab: LessonTab) => {
    setSearchInput('');
    setFilters({ tab, search: null, ...resetPayload });
  };

  const hasActiveFilters: boolean =
    filters.search.length > 0 ||
    filters.brand.length > 0 ||
    filters.fee_type.length > 0 ||
    filters.status !== DEFAULT_LESSON_STATUS_FILTER;

  const setCurrentPage = (nextPage: number) => setFilters({ page: nextPage });

  const setSort = (sort_by: string, sort_order: 'asc' | 'desc') =>
    setFilters({ sort_by, sort_order });

  /**
   * `GET /admin/lessons` for one tab. `q` matches the lesson name only (spec 007 FR-001-P1-11,
   * clarified 2026-10-08); soft-deleted masters are never listed.
   */
  const lessonListQuery = (tab: LessonTab): LessonListQuery => ({
    lessonType: LESSON_TYPE_BY_TAB[tab],
    page: filters.page,
    limit: LESSONS_PAGE_SIZE,
    q: filters.search || undefined,
    brand: filters.brand[0] ?? storeBrand,
    feeType: filters.fee_type[0],
    isActive: filters.status === 'all' ? undefined : filters.status === 'active',
    sort: SORT_BY_COLUMN[filters.sort_by] ?? DEFAULT_SORT_BY,
    order: filters.sort_order,
  });

  /** Scope-only query for a tab's count badge (`pagination.totalItems`) */
  const lessonCountQuery = (tab: LessonTab): LessonListQuery => ({
    lessonType: LESSON_TYPE_BY_TAB[tab],
    brand: storeBrand,
    limit: 1,
  });

  return {
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    clearFilters,
    changeTab,
    hasActiveFilters,
    currentPage: filters.page,
    setCurrentPage,
    pageSize: LESSONS_PAGE_SIZE,
    setSort,
    isScopeReady,
    lessonListQuery,
    lessonCountQuery,
  };
}

export type UseLessonsFiltersReturn = ReturnType<typeof useLessonsFilters>;
