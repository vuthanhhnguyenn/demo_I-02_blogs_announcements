'use client';

import { useMemo, useState } from 'react';

import {
  ENTRY_EXIT_HISTORY_SEARCH_MAX_LENGTH,
  HISTORY_MAX_RANGE_DAYS,
  type useEntryExitHistoryFilters,
} from '@/app/(private)/entry-exit/history/_hooks/use-entry-exit-history-filters.hook';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { toSelectItems } from '@/utils/app.util';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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
  adminStoreControllerListOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreListResponseDto, StoreSummaryDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { StoreListErrorHint } from '../../_components/store-list-error-hint';

const AUTH_METHOD_OPTIONS = [
  { value: 'qr', label: 'QR' },
  { value: 'nfc', label: 'NFC' },
];

const STORE_SELECT_PAGE_SIZE = 20;

const RESULT_OPTIONS = [
  { value: 'success', label: '成功' },
  { value: 'denied', label: '拒否' },
];

function filterActiveClass(active: boolean) {
  return active ? 'border-primary bg-primary/10 text-foreground' : '';
}

interface EntryExitHistoryFiltersProps {
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  filtersHook: ReturnType<typeof useEntryExitHistoryFilters>;
}

export function EntryExitHistoryFilters({
  isFilterOpen,
  onFilterOpenChange,
  filtersHook,
}: EntryExitHistoryFiltersProps) {
  const {
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    updateFilter,
    activeDetailFilterCount,
  } = filtersHook;

  // FR-004: the store filter is shown only for users who can access 2+ stores
  // and are currently viewing the header's "全店舗" scope — mirrors
  // entry-exit-header-controls.tsx's showStoreOverride logic exactly.
  const { currentStoreId } = useCurrentStore();
  const isAllStoresScope = currentStoreId === ALL_STORES;
  const { data: probeData } = useQuery({
    ...adminStoreControllerListOptions({
      query: { page: 1, limit: 2, sort: 'name', order: 'asc' },
    }),
    enabled: isAllStoresScope,
  });
  const showStoreFilter = isAllStoresScope && (probeData?.pagination.totalItems ?? 0) >= 2;

  const [storeSelectOpen, setStoreSelectOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreSummaryDto | null>(null);

  // Paged on scroll (+ server-side keyword search), like the other store selects
  // (contracts / members filters): every store in the caller's scope stays reachable.
  const {
    data: storeData,
    isFetching: isStoreFetching,
    isError: isStoreListError,
    refetch: refetchStores,
    fetchNextPage: fetchNextStores,
    hasNextPage: hasMoreStores,
    isFetchingNextPage: isFetchingMoreStores,
  } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: {
        limit: STORE_SELECT_PAGE_SIZE,
        keyword: (storeSelectOpen ? storeSearch : '') || undefined,
        sort: 'name',
        order: 'asc',
      },
    }),
    enabled: showStoreFilter && storeSelectOpen,
    // Keep the current options while a new keyword loads, so the list doesn't flash empty.
    placeholderData: keepPreviousData,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StoreListResponseDto, allPages) => {
      const currentPage = allPages.length;
      return currentPage < lastPage.pagination.totalPages ? currentPage + 1 : undefined;
    },
  });
  // Deep-link ?store_id=<uuid>: the list API's keyword matches name/code, not id,
  // so resolve the label by id instead.
  const needsStoreLabel =
    showStoreFilter && !!filters.store_id && selectedStore?.id !== filters.store_id;
  const { data: deepLinkedStore, isLoading: isDeepLinkedStoreLoading } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: filters.store_id ?? '' } }),
    enabled: needsStoreLabel,
  });
  const stores = useMemo(() => storeData?.pages.flatMap((page) => page.items) ?? [], [storeData]);
  const selectedStoreForDisplay =
    stores.find((store) => store.id === filters.store_id) ??
    (selectedStore?.id === filters.store_id ? selectedStore : undefined) ??
    (deepLinkedStore?.id === filters.store_id ? deepLinkedStore : undefined);
  // An active filter never reads as 「全店舗」, even while its deep-linked id is still resolving.
  const storeValueLabel = filters.store_id
    ? (selectedStoreForDisplay?.name ??
      (isDeepLinkedStoreLoading ? '読み込み中...' : filters.store_id))
    : '全店舗';

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="relative max-w-100 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="利用者名・会員IDで検索..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            maxLength={ENTRY_EXIT_HISTORY_SEARCH_MAX_LENGTH}
            className="h-8 rounded-md pl-9 text-xs"
          />
        </div>

        <Button
          variant={activeDetailFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          className="ml-auto h-8 gap-1.5 text-xs"
          onClick={() => onFilterOpenChange(!isFilterOpen)}
        >
          <SlidersHorizontal className="size-4" />
          {isFilterOpen ? '閉じる' : '詳細フィルター'}
          {isFilterOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </Button>
      </div>

      {isFilterOpen && (
        <div className="flex flex-wrap items-center gap-2">
          {/* The picker itself keeps the range inside the API window: future days (JST) and days
              more than 92 days from the picked start are disabled, and the list is fetched once,
              when the end is picked. */}
          <DateRangePicker
            date={{ from: parseISO(filtersHook.dateFrom), to: parseISO(filtersHook.dateTo) }}
            onDateChange={(range) => {
              if (!range?.from || !range?.to) return;
              setFilters({
                date_from: format(range.from, 'yyyy-MM-dd'),
                date_to: format(range.to, 'yyyy-MM-dd'),
                page: 1,
              });
            }}
            maxDate={parseISO(filtersHook.today)}
            today={parseISO(filtersHook.today)}
            maxRangeDays={HISTORY_MAX_RANGE_DAYS}
            hint={`期間は開始日から${HISTORY_MAX_RANGE_DAYS}日後まで（本日まで）選択できます`}
            className={cn(
              'h-8 gap-2 text-xs font-normal',
              filterActiveClass(filtersHook.isDateRangeChanged),
            )}
            placeholder="期間を選択"
          />

          {showStoreFilter && (
            <div className="flex items-center gap-1.5">
              <SearchableSelect<StoreSummaryDto>
                value={filters.store_id}
                valueLabel={storeValueLabel}
                options={stores}
                placeholder="全店舗"
                searchPlaceholder="店舗を検索..."
                emptyMessage={
                  isStoreListError ? '店舗の取得に失敗しました' : '該当する店舗がありません'
                }
                loadingMessage="店舗を読み込み中..."
                clearLabel="全店舗"
                hint={
                  isStoreListError ? (
                    <StoreListErrorHint onRetry={() => void refetchStores()} />
                  ) : undefined
                }
                open={storeSelectOpen}
                onOpenChange={setStoreSelectOpen}
                onSearchChange={setStoreSearch}
                onSelect={(store) => {
                  setSelectedStore(store);
                  updateFilter('store_id', store?.id ?? null);
                }}
                getOptionKey={(store) => store.id}
                getOptionLabel={(store) => store.name}
                isLoading={isStoreFetching}
                // A failed page must not re-trigger the scroll sentinel in a loop; retry is manual.
                hasMore={hasMoreStores && !isStoreListError}
                isLoadingMore={isFetchingMoreStores}
                onLoadMore={fetchNextStores}
                loadingMoreMessage="読み込み中..."
                triggerClassName={`h-8 w-[140px] text-xs ${filterActiveClass(filters.store_id !== null)}`}
                contentClassName="min-w-[280px]"
              />
            </div>
          )}

          <Select
            value={filters.auth_method ?? 'all'}
            onValueChange={(value) =>
              updateFilter('auth_method', value === 'all' ? null : (value as 'qr' | 'nfc'))
            }
            items={{ all: '全認証方式', ...toSelectItems(AUTH_METHOD_OPTIONS) }}
          >
            <SelectTrigger
              className={`h-8 w-[130px] text-xs ${filterActiveClass(filters.auth_method !== null)}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全認証方式</SelectItem>
              {AUTH_METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.result ?? 'all'}
            onValueChange={(value) =>
              updateFilter('result', value === 'all' ? null : (value as 'success' | 'denied'))
            }
            items={{ all: '全処理結果', ...toSelectItems(RESULT_OPTIONS) }}
          >
            <SelectTrigger
              className={`h-8 w-[130px] text-xs ${filterActiveClass(filters.result !== null)}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全処理結果</SelectItem>
              {RESULT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
