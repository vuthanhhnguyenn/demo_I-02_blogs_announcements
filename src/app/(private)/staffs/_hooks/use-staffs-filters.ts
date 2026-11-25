import { API_PAGE_SIZE_OPTIONS, PAGE_SIZE } from '@/constants/app.constants';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import { StaffRole, StaffStatus } from '../_constants/constants';

// `GET /admin/staff` `sort` enum — see STAFF_SORT_COLUMN_TO_API_FIELD for the table-column mapping.
const STAFF_SORT_FIELDS = ['id', 'name', 'position', 'status', 'lastLogin', 'createdAt'] as const;
export type StaffSortField = (typeof STAFF_SORT_FIELDS)[number];
const STAFF_SORT_ORDERS = ['asc', 'desc'] as const;
export type StaffSortOrder = (typeof STAFF_SORT_ORDERS)[number];

export type StaffsFilters = {
  page: number;
  limit: number;
  search: string;
  role: StaffRole | null;
  position: string | null;
  store_id: string | null;
  status: StaffStatus | null;
  sort: StaffSortField | null;
  order: StaffSortOrder | null;
};

export function useStaffsFilters() {
  // Use nuqs for URL query parameters
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(PAGE_SIZE),
      search: parseAsString.withDefault(''),
      role: parseAsStringEnum<StaffRole>(Object.values(StaffRole)),
      position: parseAsString,
      store_id: parseAsString,
      status: parseAsStringEnum<StaffStatus>(Object.values(StaffStatus)),
      sort: parseAsStringEnum<StaffSortField>([...STAFF_SORT_FIELDS]),
      order: parseAsStringEnum<StaffSortOrder>([...STAFF_SORT_ORDERS]),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.search, (value) =>
    setFilters({ search: value || null, page: 1 }),
  );

  const updateFilter = <K extends keyof StaffsFilters>(key: K, value: StaffsFilters[K]) => {
    setFilters({ [key]: value ?? null, page: 1 } as any);
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      search: null,
      role: null,
      position: null,
      store_id: null,
      status: null,
    });
  };

  const hasActiveFilters: boolean =
    filters.role !== null ||
    filters.position !== null ||
    filters.store_id !== null ||
    filters.status !== null ||
    filters.search.length > 0;

  const setSort = (sort: StaffSortField | null, order: StaffSortOrder | null) => {
    // Re-sorting reorders the whole result set, so the current page index is meaningless
    // against the new order — go back to page 1 like every other condition change.
    setFilters({ sort, order, page: 1 });
  };

  // `limit` comes straight out of the URL, so a hand-edited or bookmarked
  // `?limit=200` would reach `GET /admin/staff` and come back `400 E-VAL-001`
  // (`limit` `maximum: 100`). Clamp to what the contract accepts rather than
  // letting the list render a false empty state (BUG-P2-01-01).
  const maxPageSize = API_PAGE_SIZE_OPTIONS[API_PAGE_SIZE_OPTIONS.length - 1];
  const limit = Math.min(filters.limit, maxPageSize);

  // Build query params for the real API call (`GET /api/v1/admin/staff`)
  const queryParams = {
    page: filters.page,
    limit,
    keyword: filters.search || undefined,
    role: filters.role || undefined,
    positionId: filters.position ?? undefined,
    storeId: filters.store_id || undefined,
    // `status` is the API's authoritative lifecycle field (active/inactive/invited) —
    // send it directly instead of re-deriving a lossy boolean `isActive`.
    status: filters.status ?? undefined,
    sort: filters.sort ?? undefined,
    order: filters.order ?? undefined,
  };

  return {
    // Search input (local state for debouncing)
    searchInput,
    setSearchInput,
    // Filters from URL
    filters,
    // Update functions
    updateFilter,
    setFilters,
    clearFilters,
    setSort,
    // Computed
    hasActiveFilters,
    // Query params for API
    queryParams,
    // Pagination
    currentPage: filters.page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage } as any),
    pageSize: limit,
    setPageSize: (nextLimit: number) => setFilters({ limit: nextLimit, page: 1 } as any),
  };
}
