import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminStaffPermissionControllerListPositionsData } from '@/lib/api-real/types.gen';

import {
  POSITION_DEFAULT_PAGE_SIZE,
  POSITION_MIN_PAGE,
  POSITION_PAGE_SIZE_OPTIONS,
  POSITION_SEARCH_MAX_LENGTH,
} from '../_constants/position.constants';

type PositionQuery = NonNullable<AdminStaffPermissionControllerListPositionsData['query']>;

export function usePositionFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      search: parseAsString.withDefault(''),
      // Catalog `permissionKey`. The FE keeps no key list (round 2): the list
      // endpoint validates it against the catalog itself (E-VAL-001).
      permission: parseAsString,
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(POSITION_DEFAULT_PAGE_SIZE),
      // V0 deep-link parameter: preselects the preview pane (PAR021) — uuid
      positionId: parseAsString,
    },
    { history: 'push', shallow: false },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(
    filters.search,
    (value) => setFilters({ search: value || null, page: 1 }),
    // BE caps `search` at 100 chars; keep the URL inside the contract too
    { normalize: (value) => value.slice(0, POSITION_SEARCH_MAX_LENGTH) },
  );

  const normalizedPageSize = (POSITION_PAGE_SIZE_OPTIONS as readonly number[]).includes(
    filters.limit,
  )
    ? filters.limit
    : POSITION_DEFAULT_PAGE_SIZE;

  // Every bound below mirrors the list endpoint's own query schema, so a hand-edited
  // URL is clamped to something the API accepts instead of returning E-VAL-001:
  // `search` maxLength 100, `page` minimum 1, `limit` 1–100 (D4).
  const normalizedSearch = filters.search.slice(0, POSITION_SEARCH_MAX_LENGTH);
  const normalizedPage = Math.max(POSITION_MIN_PAGE, Math.trunc(filters.page));

  const queryParams: PositionQuery = {
    search: normalizedSearch || undefined,
    permission: filters.permission ?? undefined,
    page: normalizedPage,
    limit: normalizedPageSize,
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ search: null, permission: null, page: 1 });
  };

  return {
    queryParams,
    /** The keyword actually sent to the API (capped like the request) — use this for display */
    search: normalizedSearch,
    searchInput,
    setSearchInput,
    clearFilters,
    currentPage: normalizedPage,
    setCurrentPage: (page: number) => setFilters({ page }),
    setPageSize: (limit: number) => setFilters({ limit, page: 1 }),
    pageSize: normalizedPageSize,
    permission: filters.permission,
    setPermission: (key: string | null) => setFilters({ permission: key, page: 1 }),
    selectedPositionId: filters.positionId,
    setSelectedPositionId: (id: string | null) => setFilters({ positionId: id }),
    hasActiveConditions: normalizedSearch.length > 0 || filters.permission != null,
  };
}
