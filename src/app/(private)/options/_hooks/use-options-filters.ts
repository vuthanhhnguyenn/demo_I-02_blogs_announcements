import { API_PAGE_SIZE_OPTIONS, PAGE_SIZE } from '@/constants/app.constants';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import { BRAND_ENUM_LABELS, type BrandEnumValue } from '@/components/common/brand-badge';

import type { AdminOptionControllerListData } from '@/lib/api-real/types.gen';

import {
  OPTION_LIST_STATUS_LABELS,
  OPTION_LIST_TYPE_LABELS,
  OPTION_SUBCATEGORY_LABELS,
  type OptionListStatusFilter,
} from '../_constants/constants';

type OptionsQuery = NonNullable<AdminOptionControllerListData['query']>;
type OptionsSortBy = NonNullable<OptionsQuery['sort']>;
type OptionsListType = NonNullable<OptionsQuery['optionType']>;
type OptionsSubcategory = NonNullable<OptionsQuery['subcategory']>;

/**
 * The API's `sort` enum — G-02 FR-S001 「ソート軸: オプション名・料金・登録日」, as the client
 * settled in qa-108. Parsing the query string against it drops a stale bookmark from an older
 * build (`id` / `tax_rate` / `status`) instead of 400-ing the list.
 */
const OPTION_SORT_KEYS: OptionsSortBy[] = ['name', 'feeMonthly', 'createdAt'];

/**
 * Newest first, so a just-registered option shows at the top of the list (G-02 Bug No9). Clearing
 * a column sort returns here, as on the 主契約一覧 (G-02 Bug No13).
 */
export const DEFAULT_OPTION_SORT: { sort_by: OptionsSortBy; sort_order: 'asc' | 'desc' } = {
  sort_by: 'createdAt',
  sort_order: 'desc',
};

export type OptionsFiltersState = {
  page: number;
  limit: number;
  search: string;
  brand: BrandEnumValue | null;
  option_type: OptionsListType | null;
  /** サービス種別 — G-02 FR-S001; the prototype has no such filter yet (prototype-gap-list #13). */
  subcategory: OptionsSubcategory | null;
  status: OptionListStatusFilter | null;
  /** Proration flag — kept as the string the query param carries. */
  prorated_enabled: 'true' | 'false' | null;
  store_id: string | null;
  sort_by: OptionsSortBy;
  sort_order: 'asc' | 'desc';
};

export function useOptionsFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(PAGE_SIZE),
      search: parseAsString.withDefault(''),
      brand: parseAsStringEnum(Object.keys(BRAND_ENUM_LABELS) as BrandEnumValue[]),
      option_type: parseAsStringEnum(Object.keys(OPTION_LIST_TYPE_LABELS) as OptionsListType[]),
      subcategory: parseAsStringEnum(
        Object.keys(OPTION_SUBCATEGORY_LABELS) as OptionsSubcategory[],
      ),
      status: parseAsStringEnum(Object.keys(OPTION_LIST_STATUS_LABELS) as OptionListStatusFilter[]),
      prorated_enabled: parseAsStringEnum<'true' | 'false'>(['true', 'false']),
      store_id: parseAsString,
      sort_by: parseAsStringEnum<OptionsSortBy>(OPTION_SORT_KEYS).withDefault(
        DEFAULT_OPTION_SORT.sort_by,
      ),
      sort_order: parseAsStringEnum<'asc' | 'desc'>(['asc', 'desc']).withDefault(
        DEFAULT_OPTION_SORT.sort_order,
      ),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.search, (value) =>
    setFilters({ search: value || null, page: 1 }),
  );

  const updateFilter = <K extends keyof OptionsFiltersState>(
    key: K,
    value: OptionsFiltersState[K],
  ) => {
    setFilters({ [key]: value ?? null, page: 1 } as Parameters<typeof setFilters>[0]);
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      limit: PAGE_SIZE,
      search: null,
      brand: null,
      option_type: null,
      subcategory: null,
      status: null,
      prorated_enabled: null,
      store_id: null,
      sort_by: DEFAULT_OPTION_SORT.sort_by,
      sort_order: DEFAULT_OPTION_SORT.sort_order,
    });
  };

  const hasActiveFilters: boolean =
    filters.brand !== null ||
    filters.option_type !== null ||
    filters.subcategory !== null ||
    filters.status !== null ||
    filters.prorated_enabled !== null ||
    filters.store_id !== null ||
    filters.search.length > 0;

  // A bookmarked ?limit=500 or ?page=0 would be a 400 from the API: fall back to the defaults.
  const limit = (API_PAGE_SIZE_OPTIONS as readonly number[]).includes(filters.limit)
    ? filters.limit
    : PAGE_SIZE;
  const page = Math.max(1, filters.page);

  const queryParams: OptionsQuery = {
    page,
    limit,
    keyword: filters.search || undefined,
    brandEnum: filters.brand ?? undefined,
    optionType: filters.option_type ?? undefined,
    subcategory: filters.subcategory ?? undefined,
    isActive: filters.status ? filters.status === 'active' : undefined,
    isProration: filters.prorated_enabled ? filters.prorated_enabled === 'true' : undefined,
    storeId: filters.store_id ?? undefined,
    sort: filters.sort_by,
    order: filters.sort_order,
  };

  return {
    searchInput,
    setSearchInput,
    filters,
    updateFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
    queryParams,
    currentPage: page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    pageSize: limit,
    setPageSize: (nextLimit: number) => setFilters({ limit: nextLimit, page: 1 }),
  };
}
