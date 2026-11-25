import { PAGE_SIZE } from '@/constants/app.constants';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

import { useDebouncedUrlSearch } from '@/hooks/use-debounced-url-search.hook';

import type { AdminPlanControllerListData } from '@/lib/api-real/types.gen';

import {
  type CompanionBenefitFilter,
  MAIN_CONTRACT_STATUS_LABELS,
  MAIN_CONTRACT_TYPE_LABELS,
  PLAN_BRAND_LABELS,
  type PlanActiveKey,
} from '../_constants/constants';

type PlanListQuery = NonNullable<AdminPlanControllerListData['query']>;

const MAIN_CONTRACT_TYPES = Object.keys(MAIN_CONTRACT_TYPE_LABELS) as Array<
  NonNullable<PlanListQuery['contractType']>
>;
const MAIN_CONTRACT_BRANDS = Object.keys(PLAN_BRAND_LABELS) as Array<
  NonNullable<PlanListQuery['brandEnum']>
>;
const MAIN_CONTRACT_STATUSES = Object.keys(MAIN_CONTRACT_STATUS_LABELS) as PlanActiveKey[];
const COMPANION_BENEFIT_FILTERS: CompanionBenefitFilter[] = ['all', 'true', 'false'];
// The columns the 主契約一覧 offers a sort affordance for, named as API-087 `sort` spells them,
// plus `createdAt` — the default, which has no column of its own.
const MAIN_CONTRACT_SORT_FIELDS = [
  'createdAt',
  'planCode',
  'name',
  'contractType',
  'priceMonthly',
  'contractCount',
  'isActive',
] as const satisfies Array<NonNullable<PlanListQuery['sort']>>;

/** Newest first, so a just-created master shows at the top of the list (G-01 QnA No13). */
export const DEFAULT_CONTRACT_SORT = {
  sort_by: 'createdAt',
  sort_order: 'desc',
} as const satisfies Pick<ContractsFiltersState, 'sort_by' | 'sort_order'>;

export type ContractsFiltersState = {
  page: number;
  limit: number;
  search: string;
  contract_type: PlanListQuery['contractType'] | null;
  brand: PlanListQuery['brandEnum'] | null;
  status: PlanActiveKey | null;
  store_id: string | null;
  companion_benefit: CompanionBenefitFilter;
  sort_by: NonNullable<PlanListQuery['sort']>;
  sort_order: NonNullable<PlanListQuery['order']>;
};

/** API-087 `nameQuery` maxLength; the search box is capped to the same length. */
export const NAME_QUERY_MAX_LENGTH = 100;

export function useContractsFilters() {
  // The URL keys stay as the prototype/spec named them; only the values sent to the API
  // are renamed to API-087's vocabulary (`nameQuery`, `brandEnum`, `isActive`, …).
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(PAGE_SIZE),
      search: parseAsString.withDefault(''),
      contract_type: parseAsStringEnum(MAIN_CONTRACT_TYPES),
      brand: parseAsStringEnum(MAIN_CONTRACT_BRANDS),
      status: parseAsStringEnum(MAIN_CONTRACT_STATUSES),
      store_id: parseAsString,
      companion_benefit: parseAsStringEnum(COMPANION_BENEFIT_FILTERS).withDefault('all'),
      sort_by: parseAsStringEnum(MAIN_CONTRACT_SORT_FIELDS).withDefault(
        DEFAULT_CONTRACT_SORT.sort_by,
      ),
      sort_order: parseAsStringEnum(['asc', 'desc']).withDefault(DEFAULT_CONTRACT_SORT.sort_order),
    },
    {
      history: 'push',
      shallow: false,
    },
  );

  const { searchInput, setSearchInput } = useDebouncedUrlSearch(filters.search, (value) =>
    setFilters({ search: value || null, page: 1 }),
  );

  const updateFilter = <K extends keyof ContractsFiltersState>(
    key: K,
    value: ContractsFiltersState[K],
  ) => {
    setFilters({ [key]: value ?? null, page: 1 });
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      limit: PAGE_SIZE,
      search: null,
      contract_type: null,
      brand: null,
      status: null,
      store_id: null,
      companion_benefit: 'all',
      ...DEFAULT_CONTRACT_SORT,
    });
  };

  const hasActiveFilters: boolean =
    filters.contract_type !== null ||
    filters.brand !== null ||
    filters.status !== null ||
    filters.store_id !== null ||
    filters.companion_benefit !== 'all' ||
    filters.search.length > 0;

  const queryParams: PlanListQuery = {
    page: filters.page,
    limit: filters.limit,
    // Sent as typed: the backend matches `%` / `_` literally on its own, so escaping them here
    // would make it look for a literal `\`. The slice guards a hand-edited URL `search`.
    nameQuery: filters.search ? filters.search.slice(0, NAME_QUERY_MAX_LENGTH) : undefined,
    contractType: filters.contract_type || undefined,
    brandEnum: filters.brand || undefined,
    storeId: filters.store_id || undefined,
    isActive: filters.status === null ? undefined : filters.status === 'active',
    hasCompanionBenefit:
      filters.companion_benefit === 'all' ? undefined : filters.companion_benefit === 'true',
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
    currentPage: filters.page,
    setCurrentPage: (nextPage: number) => setFilters({ page: nextPage }),
    pageSize: filters.limit,
    setPageSize: (nextPageSize: number) => setFilters({ limit: nextPageSize, page: 1 }),
  };
}
