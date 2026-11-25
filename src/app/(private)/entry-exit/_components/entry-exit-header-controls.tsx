'use client';

import { useMemo, useState } from 'react';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { getTodayJstISODate } from '@/utils/date.util';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { addDays, format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight, Store as StoreIcon } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

import {
  adminStoreControllerDetailOptions,
  adminStoreControllerListInfiniteOptions,
  adminStoreControllerListOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreListResponseDto, StoreSummaryDto } from '@/lib/api-real/types.gen';

import { StoreListErrorHint } from './store-list-error-hint';

const STORE_SELECT_PAGE_SIZE = 20;

interface EntryExitHeaderControlsProps {
  date: string;
  /** Page-local narrowing override — only meaningful while the header scope is "全店舗". */
  storeOverride: string;
  onDateChange: (date: string) => void;
  onStoreOverrideChange: (storeId: string) => void;
}

/**
 * FR-B01-09/10/11: date navigation + calendar picker + a page-local store narrowing filter.
 * The narrowing filter only appears when the header-level store scope (`StoreSelector`,
 * `src/components/layout/store-selector.tsx`) is "全店舗" and there are 2+ stores in the
 * catalog — it lets HQ/System/Manager users drill into one store for this page without
 * changing their global header scope. When the header is already scoped to one store,
 * that scope is used directly and this filter is hidden.
 */
export function EntryExitHeaderControls({
  date,
  storeOverride,
  onDateChange,
  onStoreOverrideChange,
}: Readonly<EntryExitHeaderControlsProps>) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const selectedDate = parseISO(date);
  // "Today" is the JST business date, not the browser's local day (BUG-B01-01).
  const today = getTodayJstISODate();
  const todayDate = parseISO(today);
  const isPastDate = date < today;
  // The API rejects future dates (422 E-VIS-005), so the picker stops at today: 翌日 is only
  // enabled while viewing a past date.

  const { currentStoreId } = useCurrentStore();
  const isAllStoresScope = currentStoreId === ALL_STORES;

  // Cheap probe (2 rows) to decide whether the override control is worth showing at
  // all — avoids fetching the full store catalog just to check its size.
  const { data: probeData } = useQuery({
    ...adminStoreControllerListOptions({
      query: { page: 1, limit: 2, sort: 'name', order: 'asc' },
    }),
    enabled: isAllStoresScope,
  });
  const showStoreOverride = isAllStoresScope && (probeData?.pagination.totalItems ?? 0) >= 2;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Remember the store picked from the list so the trigger can render its label
  // without refetching once the dropdown closes.
  const [selectedStore, setSelectedStore] = useState<StoreSummaryDto | null>(null);

  const isOverridden = storeOverride !== ALL_STORES;

  // Paged on scroll (+ server-side keyword search), like the other store selects
  // (contracts / members filters): every store in the caller's scope stays reachable.
  const {
    data,
    isFetching,
    isError: isStoreListError,
    refetch: refetchStores,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: {
        limit: STORE_SELECT_PAGE_SIZE,
        keyword: (isOpen ? searchQuery : '') || undefined,
        sort: 'name',
        order: 'asc',
      },
    }),
    enabled: showStoreOverride && isOpen,
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
  const needsStoreLabel = showStoreOverride && isOverridden && selectedStore?.id !== storeOverride;
  const { data: deepLinkedStore, isLoading: isDeepLinkedStoreLoading } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: storeOverride } }),
    enabled: needsStoreLabel,
  });

  const stores = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const selected =
    (isOverridden ? stores.find((store) => store.id === storeOverride) : undefined) ??
    (selectedStore?.id === storeOverride ? selectedStore : undefined) ??
    (deepLinkedStore?.id === storeOverride ? deepLinkedStore : undefined);
  // While a deep-linked id is still resolving, say so instead of flashing the raw uuid.
  const valueLabel = isOverridden
    ? (selected?.name ?? (isDeepLinkedStoreLoading ? '読み込み中...' : storeOverride))
    : '全店舗';

  const handleSelect = (store: StoreSummaryDto | null) => {
    setSelectedStore(store);
    onStoreOverrideChange(store?.id ?? ALL_STORES);
  };

  const shiftDate = (deltaDays: number) => {
    onDateChange(format(addDays(selectedDate, deltaDays), 'yyyy-MM-dd'));
  };

  return (
    <div className="flex items-center gap-3">
      {showStoreOverride && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1.5">
            <StoreIcon className="text-muted-foreground size-4 shrink-0" />
            <SearchableSelect<StoreSummaryDto>
              value={isOverridden ? storeOverride : null}
              valueLabel={valueLabel}
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
              open={isOpen}
              onOpenChange={setIsOpen}
              onSearchChange={setSearchQuery}
              onSelect={handleSelect}
              getOptionKey={(store) => store.id}
              getOptionLabel={(store) => store.name}
              getOptionKeywords={(store) => [store.name, store.clubCode].filter(Boolean).join(' ')}
              isLoading={isFetching}
              // A failed page must not re-trigger the scroll sentinel in a loop; retry is manual.
              hasMore={hasNextPage && !isStoreListError}
              isLoadingMore={isFetchingNextPage}
              onLoadMore={fetchNextPage}
              loadingMoreMessage="読み込み中..."
              triggerClassName="hover:bg-accent h-8 w-auto max-w-[240px] min-w-[100px] gap-2 border-0 bg-transparent px-2 text-sm font-medium"
              contentClassName="w-72"
              ariaLabel="表示店舗"
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0"
          onClick={() => shiftDate(-1)}
          aria-label="前日"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            className={`inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border px-3 text-sm ${
              isPastDate
                ? 'border-warning bg-warning/10 text-warning hover:bg-warning/15 hover:text-warning'
                : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <CalendarIcon className="size-3 shrink-0" />
            {format(selectedDate, 'yyyy年M月d日(E)', { locale: ja })}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) {
                  onDateChange(format(d, 'yyyy-MM-dd'));
                  setCalendarOpen(false);
                }
              }}
              today={todayDate}
              disabled={{ after: todayDate }}
              locale={ja}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0"
          onClick={() => shiftDate(1)}
          disabled={!isPastDate}
          aria-label="翌日"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
