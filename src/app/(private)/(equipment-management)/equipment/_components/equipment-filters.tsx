'use client';

import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';

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

import type { EquipmentStatus } from '../_constants/constants';
import { EQUIPMENT_STATUS_LABELS, EQUIPMENT_TYPE_LABELS } from '../_constants/constants';
import {
  EQUIPMENT_FILTER_TYPE_VALUES,
  EQUIPMENT_SEARCH_MAX_LENGTH,
  type EquipmentFilterType,
} from '../_hooks/use-equipment-filters';
import { EQUIPMENT_STATUS_VALUES } from '../_schemas/equipment-form.schema';

const STORE_PAGE_SIZE = 20;

const ALL_STORES_LABEL = '全店舗';
const ALL_TYPES_LABEL = '全ての機器タイプ';
const ALL_STATUSES_LABEL = '全ての状態';

function filterActiveClass(isActive: boolean) {
  return isActive ? 'border-primary bg-primary/10 text-foreground' : '';
}

interface EquipmentFiltersProps {
  activeFilterCount: number;
  filters: {
    equipment_store_id: string | null;
    equipment_type: EquipmentFilterType | null;
    equipment_status: EquipmentStatus | null;
  };
  isFilterOpen: boolean;
  searchInput: string;
  setFilters: (value: {
    equipment_page?: number;
    equipment_store_id?: string | null;
    equipment_type?: EquipmentFilterType | null;
    equipment_status?: EquipmentStatus | null;
  }) => void;
  setIsFilterOpen: Dispatch<SetStateAction<boolean>>;
  setSearchInput: (value: string) => void;
  /** Prototype hides the in-panel store filter unless the header scope is 全店舗. */
  showStoreFilter: boolean;
  /**
   * 異常 deep-link entry state (SR-004). The 状態 filter is pinned to 異常 and cannot be moved from
   * this panel; releasing it is the job of the chip next to the toolbar.
   */
  isAbnormalPinned: boolean;
}

export function EquipmentFilters({
  activeFilterCount,
  filters,
  isFilterOpen,
  searchInput,
  setFilters,
  setIsFilterOpen,
  setSearchInput,
  showStoreFilter,
  isAbnormalPinned,
}: EquipmentFiltersProps) {
  const [isStorePopoverOpen, setIsStorePopoverOpen] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');

  /**
   * The store roster is server-paginated and searched server-side: a single fixed page would cut
   * the dropdown off at its first page of stores, the same way the controller form's store field
   * loads them. `SearchableSelect` debounces `onSearchChange` by 300ms on its own.
   */
  const {
    data: storesRes,
    isFetching: isStoresFetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: {
        limit: STORE_PAGE_SIZE,
        keyword: storeSearchQuery.trim() || undefined,
        sort: 'name',
        order: 'asc',
      },
    }),
    enabled: showStoreFilter && isFilterOpen && isStorePopoverOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StoreListResponseDto, allPages) => {
      const loadedPages = allPages.length;
      const totalPages = lastPage.pagination?.totalPages ?? 0;
      return loadedPages < totalPages ? loadedPages + 1 : undefined;
    },
  });

  const stores = useMemo(
    () => storesRes?.pages.flatMap((page) => page.items ?? []) ?? [],
    [storesRes],
  );
  const selectedStoreFromOptions = filters.equipment_store_id
    ? stores.find((store) => store.id === filters.equipment_store_id)
    : undefined;

  const { data: selectedStoreRes } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: filters.equipment_store_id ?? '' } }),
    enabled:
      showStoreFilter && isFilterOpen && !!filters.equipment_store_id && !selectedStoreFromOptions,
  });

  const selectedStoreLabel = filters.equipment_store_id
    ? (selectedStoreFromOptions?.name ?? selectedStoreRes?.name)
    : ALL_STORES_LABEL;

  const handleStoreSelect = (store: StoreSummaryDto | null) => {
    setFilters({
      equipment_store_id: store?.id ?? null,
      equipment_page: 1,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative max-w-[400px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            // API-103 `q` = partial, case-insensitive match on 機器ID (UUID text, so the short id
            // shown in the table hits) / 機器名 / シリアル / 設置場所.
            placeholder="機器ID、機器名、シリアル、設置場所で検索"
            // BUG-E02-A-04 — API-103 rejects `q` over 100 chars (400 E-VAL-001), which the list
            // used to swallow into a misleading 0件 result.
            maxLength={EQUIPMENT_SEARCH_MAX_LENGTH}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="h-8 pl-9 text-xs"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={activeFilterCount > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setIsFilterOpen((previous) => !previous)}
          >
            <SlidersHorizontal className="size-4" />
            {isFilterOpen ? '閉じる' : '詳細フィルター'}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 px-1 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
            {isFilterOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        </div>
      </div>

      {isFilterOpen && (
        <div className="flex flex-wrap items-center gap-2">
          {showStoreFilter && (
            <SearchableSelect
              value={filters.equipment_store_id}
              valueLabel={selectedStoreLabel}
              options={stores}
              placeholder={ALL_STORES_LABEL}
              searchPlaceholder="店舗名・店舗IDで検索..."
              emptyMessage="該当する店舗がありません"
              loadingMessage="店舗を読み込み中..."
              clearLabel={ALL_STORES_LABEL}
              open={isStorePopoverOpen}
              onOpenChange={setIsStorePopoverOpen}
              onSearchChange={setStoreSearchQuery}
              onSelect={handleStoreSelect}
              getOptionKey={(store) => store.id}
              getOptionLabel={(store) => store.name}
              getOptionKeywords={(store) =>
                [store.name, store.code, store.id, store.clubCode].filter(Boolean).join(' ')
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
              isLoading={isStoresFetching && !isFetchingNextPage}
              hasMore={hasNextPage}
              isLoadingMore={isFetchingNextPage}
              onLoadMore={fetchNextPage}
              loadingMoreMessage="読み込み中..."
              triggerClassName={`h-8 w-64 justify-between rounded-lg px-3 text-xs font-normal ${filterActiveClass(filters.equipment_store_id !== null)}`}
            />
          )}

          <Select
            value={filters.equipment_type ?? 'all'}
            onValueChange={(value) => {
              setFilters({
                equipment_type: value === 'all' ? null : (value as EquipmentFilterType),
                equipment_page: 1,
              });
            }}
          >
            <SelectTrigger
              className={`h-8 text-xs ${filterActiveClass(filters.equipment_type !== null)}`}
            >
              <SelectValue placeholder={ALL_TYPES_LABEL}>
                {filters.equipment_type
                  ? EQUIPMENT_TYPE_LABELS[filters.equipment_type]
                  : ALL_TYPES_LABEL}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ALL_TYPES_LABEL}</SelectItem>
              {EQUIPMENT_FILTER_TYPE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {EQUIPMENT_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={isAbnormalPinned ? 'abnormal' : (filters.equipment_status ?? 'all')}
            disabled={isAbnormalPinned}
            onValueChange={(value) => {
              setFilters({
                equipment_status: value === 'all' ? null : (value as EquipmentStatus),
                equipment_page: 1,
              });
            }}
          >
            <SelectTrigger
              className={`h-8 text-xs ${filterActiveClass(isAbnormalPinned || filters.equipment_status !== null)}`}
            >
              <SelectValue placeholder={ALL_STATUSES_LABEL}>
                {isAbnormalPinned
                  ? EQUIPMENT_STATUS_LABELS.abnormal
                  : filters.equipment_status
                    ? EQUIPMENT_STATUS_LABELS[filters.equipment_status]
                    : ALL_STATUSES_LABEL}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ALL_STATUSES_LABEL}</SelectItem>
              {EQUIPMENT_STATUS_VALUES.map((status) => (
                <SelectItem key={status} value={status}>
                  {EQUIPMENT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
