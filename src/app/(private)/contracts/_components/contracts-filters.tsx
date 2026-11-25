'use client';

import { useMemo, useState } from 'react';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  adminStoreControllerDetailOptions,
  adminStoreControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreListResponseDto, StoreSummaryDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  COMPANION_BENEFIT_FILTER_LABELS,
  MAIN_CONTRACT_STATUS_LABELS,
  MAIN_CONTRACT_TYPE_LABELS,
  PLAN_BRAND_LABELS,
  type PlanActiveKey,
  type PlanBrandEnum,
  type PlanContractType,
} from '../_constants/constants';
import { useContractsFiltersContext } from '../_contexts/contracts-filters-context';
import { NAME_QUERY_MAX_LENGTH } from '../_hooks/use-contracts-filters';

interface ContractsFiltersProps {
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
}

const STORE_FILTER_PAGE_SIZE = 20;

/** Highlights a select whose value differs from its default (prototype `filterActiveClass`). */
const filterActiveClass = (isActive: boolean) =>
  isActive ? 'border-primary bg-primary/10 text-foreground' : '';

export function ContractsFilters({
  isFilterOpen,
  onFilterOpenChange,
}: Readonly<ContractsFiltersProps>) {
  const { filters, searchInput, setSearchInput, updateFilter } = useContractsFiltersContext();

  const [isStorePopoverOpen, setIsStorePopoverOpen] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');

  const {
    data: storesData,
    isFetching: isStoresFetching,
    fetchNextPage: fetchNextStores,
    hasNextPage: hasMoreStores,
    isFetchingNextPage: isFetchingMoreStores,
  } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: {
        limit: STORE_FILTER_PAGE_SIZE,
        keyword: storeSearchQuery || undefined,
        sort: 'name',
        order: 'asc',
      },
    }),
    enabled: isFilterOpen && isStorePopoverOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StoreListResponseDto, allPages) => {
      const currentPage = allPages.length;
      const totalPages = lastPage.pagination?.totalPages ?? 0;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });

  const stores = useMemo(
    () => storesData?.pages.flatMap((page) => page.items ?? []) ?? [],
    [storesData],
  );
  const selectedStoreFromOptions = filters.store_id
    ? stores.find((store) => store.id === filters.store_id)
    : undefined;

  const { data: selectedStore } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: filters.store_id ?? '' } }),
    enabled: isFilterOpen && !!filters.store_id && !selectedStoreFromOptions,
  });

  const selectedStoreLabel = filters.store_id
    ? (selectedStoreFromOptions?.name ?? selectedStore?.name)
    : '全店舗';

  const activeFilterCount = [
    filters.contract_type,
    filters.brand,
    filters.store_id,
    filters.status,
    filters.companion_benefit !== 'all' ? filters.companion_benefit : null,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative max-w-100 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="契約名で検索..."
            maxLength={NAME_QUERY_MAX_LENGTH}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-8 rounded-lg pl-9"
          />
        </div>
        <Button
          variant={activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          className="ml-auto h-8 gap-1.5"
          onClick={() => onFilterOpenChange(!isFilterOpen)}
        >
          <SlidersHorizontal className="size-4" />
          {isFilterOpen ? '閉じる' : '詳細フィルター'}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-5 px-1 text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
          {isFilterOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>

      {isFilterOpen && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.contract_type ?? 'all'}
              onValueChange={(value) => {
                updateFilter('contract_type', value === 'all' ? null : (value as PlanContractType));
              }}
            >
              <SelectTrigger
                size="sm"
                className={cn(
                  'w-fit min-w-35 rounded-lg',
                  filterActiveClass(!!filters.contract_type),
                )}
              >
                <SelectValue placeholder="全タイプ">
                  {filters.contract_type
                    ? MAIN_CONTRACT_TYPE_LABELS[filters.contract_type]
                    : '全タイプ'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全タイプ</SelectItem>
                {Object.entries(MAIN_CONTRACT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.brand ?? 'all'}
              onValueChange={(value) => {
                updateFilter('brand', value === 'all' ? null : (value as PlanBrandEnum));
              }}
            >
              <SelectTrigger
                size="sm"
                className={cn('w-fit min-w-35 rounded-lg', filterActiveClass(!!filters.brand))}
              >
                <SelectValue placeholder="全ブランド">
                  {filters.brand ? PLAN_BRAND_LABELS[filters.brand] : '全ブランド'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ブランド</SelectItem>
                {Object.entries(PLAN_BRAND_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 店舗 — G-01 FR-M001 search condition; narrows the list to one store's 特殊契約 masters. */}
            <SearchableSelect
              value={filters.store_id}
              valueLabel={selectedStoreLabel}
              options={stores}
              placeholder="全店舗"
              searchPlaceholder="店舗名・店舗IDで検索..."
              emptyMessage="該当する店舗がありません"
              loadingMessage="店舗を読み込み中..."
              clearLabel="全店舗"
              open={isStorePopoverOpen}
              onOpenChange={setIsStorePopoverOpen}
              onSearchChange={setStoreSearchQuery}
              onSelect={(store: StoreSummaryDto | null) =>
                updateFilter('store_id', store?.id ?? null)
              }
              getOptionKey={(store) => store.id}
              getOptionLabel={(store) => store.name}
              getOptionKeywords={(store) =>
                [store.name, store.code, store.clubCode, store.id].filter(Boolean).join(' ')
              }
              renderOption={(store) => (
                <div className="flex min-w-0 flex-col items-start gap-0.5">
                  <TextWithTooltip
                    text={store.name}
                    wrapperClassName="w-full"
                    className="w-full"
                    side="right"
                    align="center"
                  />
                </div>
              )}
              isLoading={isStoresFetching}
              hasMore={hasMoreStores}
              isLoadingMore={isFetchingMoreStores}
              onLoadMore={fetchNextStores}
              loadingMoreMessage="読み込み中..."
              triggerClassName={cn(
                'h-8 w-56 justify-between rounded-lg px-3 font-normal',
                filterActiveClass(!!filters.store_id),
              )}
            />

            <Select
              value={filters.status ?? 'all'}
              onValueChange={(value) => {
                updateFilter('status', value === 'all' ? null : (value as PlanActiveKey));
              }}
            >
              <SelectTrigger
                size="sm"
                className={cn('w-fit min-w-35 rounded-lg', filterActiveClass(!!filters.status))}
              >
                <SelectValue placeholder="全ステータス">
                  {filters.status ? MAIN_CONTRACT_STATUS_LABELS[filters.status] : '全ステータス'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ステータス</SelectItem>
                {Object.entries(MAIN_CONTRACT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.companion_benefit}
              onValueChange={(value) => {
                updateFilter(
                  'companion_benefit',
                  value as keyof typeof COMPANION_BENEFIT_FILTER_LABELS,
                );
              }}
            >
              <SelectTrigger
                size="sm"
                className={cn(
                  'w-fit min-w-35 rounded-lg',
                  filterActiveClass(filters.companion_benefit !== 'all'),
                )}
              >
                <SelectValue placeholder="同伴特典">
                  同伴特典: {COMPANION_BENEFIT_FILTER_LABELS[filters.companion_benefit]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(COMPANION_BENEFIT_FILTER_LABELS) as Array<
                    [keyof typeof COMPANION_BENEFIT_FILTER_LABELS, string]
                  >
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
