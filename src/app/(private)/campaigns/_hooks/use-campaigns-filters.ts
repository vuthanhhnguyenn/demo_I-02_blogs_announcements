import { PAGE_SIZE } from '@/constants/app.constants';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminCampaignControllerListData } from '@/lib/api-real/types.gen';

import { CAMPAIGN_ACCEPTING_STATUS_VALUES, CAMPAIGN_BRAND_VALUES } from '../_constants/constants';

type CampaignsQuery = NonNullable<AdminCampaignControllerListData['query']>;

const CAMPAIGN_SORT_FIELDS = [
  'campaignNumber',
  'createdAt',
  'updatedAt',
  'name',
  'recruitmentStart',
  'recruitmentEnd',
] as const satisfies readonly NonNullable<CampaignsQuery['sort']>[];

/** URL 上の `sort=none` は「ソート解除」(API へ sort / order を送らない)。未指定は既定の作成日降順。 */
export const CAMPAIGN_SORT_NONE = 'none';

export type CampaignsFiltersState = {
  page: number;
  limit: number;
  nameQuery: string;
  brandEnum: CampaignsQuery['brandEnum'] | null;
  acceptingStatus: CampaignsQuery['acceptingStatus'] | null;
  recruitmentActiveOn: string;
  sort: NonNullable<CampaignsQuery['sort']> | typeof CAMPAIGN_SORT_NONE;
  order: NonNullable<CampaignsQuery['order']>;
};

export function useCampaignsFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(PAGE_SIZE),
      nameQuery: parseAsString.withDefault(''),
      brandEnum: parseAsStringEnum([...CAMPAIGN_BRAND_VALUES]),
      acceptingStatus: parseAsStringEnum([...CAMPAIGN_ACCEPTING_STATUS_VALUES]),
      recruitmentActiveOn: parseAsString.withDefault(''),
      sort: parseAsStringEnum([...CAMPAIGN_SORT_FIELDS, CAMPAIGN_SORT_NONE]).withDefault(
        'createdAt',
      ),
      order: parseAsStringEnum(['asc', 'desc'] as const).withDefault('desc'),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.nameQuery, (value) =>
    setFilters({ nameQuery: value || null, page: 1 }),
  );

  const updateFilter = <K extends keyof CampaignsFiltersState>(
    key: K,
    value: CampaignsFiltersState[K],
  ) => {
    setFilters({ [key]: value === '' ? null : (value ?? null), page: 1 } as Parameters<
      typeof setFilters
    >[0]);
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      limit: PAGE_SIZE,
      nameQuery: null,
      brandEnum: null,
      acceptingStatus: null,
      recruitmentActiveOn: null,
      sort: 'createdAt',
      order: 'desc',
    });
  };

  /** 詳細フィルターのバッジ件数 (V0 `activeFilterCount`, campaign-list.tsx:L112-114)。検索語は含めない。 */
  const activeFilterCount = [
    filters.brandEnum,
    filters.acceptingStatus,
    filters.recruitmentActiveOn || null,
  ].filter((value) => value !== null).length;

  const hasActiveFilters: boolean = activeFilterCount > 0 || filters.nameQuery.length > 0;

  const queryParams: CampaignsQuery = {
    page: filters.page,
    limit: filters.limit,
    nameQuery: filters.nameQuery || undefined,
    brandEnum: filters.brandEnum || undefined,
    acceptingStatus: filters.acceptingStatus || undefined,
    recruitmentActiveOn: filters.recruitmentActiveOn || undefined,
    sort: filters.sort === CAMPAIGN_SORT_NONE ? undefined : filters.sort,
    order: filters.sort === CAMPAIGN_SORT_NONE ? undefined : filters.order,
  };

  return {
    searchInput,
    setSearchInput,
    filters,
    updateFilter,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
    queryParams,
    currentPage: filters.page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    pageSize: filters.limit,
    setPageSize: (nextPageSize: number) => setFilters({ limit: nextPageSize, page: 1 }),
  };
}

export type CampaignsFiltersHook = ReturnType<typeof useCampaignsFilters>;
