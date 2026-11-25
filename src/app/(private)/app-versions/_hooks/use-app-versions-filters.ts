import { API_PAGE_SIZE_OPTIONS } from '@/constants/app.constants';
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from 'nuqs';

import type { AdminAppVersionControllerListData } from '@/lib/api-real/types.gen';

import {
  APP_VERSION_BRANDS,
  APP_VERSION_STATUSES,
  DEFAULT_PAGE_SIZE,
} from '../_constants/app-version.constants';

export function useAppVersionsFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(DEFAULT_PAGE_SIZE),
      brandEnum: parseAsStringLiteral(APP_VERSION_BRANDS),
      status: parseAsStringLiteral(APP_VERSION_STATUSES),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const hasActiveFilters = filters.brandEnum !== null || filters.status !== null;

  const clearFilters = () => {
    setFilters({ page: 1, limit: DEFAULT_PAGE_SIZE, brandEnum: null, status: null });
  };

  // A bookmarked ?limit=7, ?limit=1000 or ?page=0 is not an offered value: use the defaults.
  const limit = (API_PAGE_SIZE_OPTIONS as readonly number[]).includes(filters.limit)
    ? filters.limit
    : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page);

  const queryParams: NonNullable<AdminAppVersionControllerListData['query']> = {
    page,
    limit,
    sort: 'effectiveAt',
    order: 'desc',
    brandEnum: filters.brandEnum ?? undefined,
    status: filters.status ?? undefined,
  };

  return {
    filters,
    setFilters,
    queryParams,
    hasActiveFilters,
    clearFilters,
    currentPage: page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    pageSize: limit,
    setPageSize: (nextLimit: number) => setFilters({ limit: nextLimit, page: 1 }),
  };
}
