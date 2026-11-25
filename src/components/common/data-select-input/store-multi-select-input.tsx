'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';
import { AlertCircle, Check, ChevronsUpDown, Loader2, X } from 'lucide-react';

import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';

import { adminStoreControllerListInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreListResponseDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import type { StoreSelectQueryFilters } from './store-select-input';

const SEARCH_DEBOUNCE_MS = 300;
const STORE_PAGE_SIZE = 20;
const STORE_CACHE_MS = 5 * 60 * 1000;

interface StoreMultiSelectInputProps {
  /** Selected store ids, in selection order (the first one is what the API returns as `storeId`). */
  value: string[];
  onChange: (next: string[]) => void;
  /**
   * Names for ids that are selected but not necessarily on a loaded page — e.g. the
   * stores of the record being edited (`StaffDetailDto.stores`). Picked rows are
   * remembered on their own, so a create form can leave this out.
   */
  selectedLabels?: Readonly<Record<string, string>>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  queryFilters?: StoreSelectQueryFilters;
  disabled?: boolean;
  hasError?: boolean;
  triggerClassName?: string;
}

/**
 * Multi-select store picker: server-side keyword search + infinite scroll over the store
 * master, with the selection listed as removable chips under the trigger. Fetches only
 * while the dropdown is open. Single-store pickers use {@link StoreSelectInput}.
 */
export function StoreMultiSelectInput({
  value,
  onChange,
  selectedLabels,
  placeholder = '店舗を選択してください',
  searchPlaceholder = '店舗名・店舗コードで検索...',
  emptyMessage = '該当する店舗がありません',
  queryFilters,
  disabled = false,
  hasError = false,
  triggerClassName,
}: StoreMultiSelectInputProps) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  // Names of rows picked in this session, so a chip keeps its label after the list unmounts.
  const [pickedLabels, setPickedLabels] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data,
    isFetching,
    isError,
    isFetchNextPageError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: {
        limit: STORE_PAGE_SIZE,
        keyword: search || undefined,
        sort: 'name',
        order: 'asc',
        ...queryFilters,
      },
    }),
    enabled: open && !disabled,
    staleTime: STORE_CACHE_MS,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StoreListResponseDto) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const stores = useMemo(() => data?.pages.flatMap((page) => page.items ?? []) ?? [], [data]);

  // A failed first load must not read as "no results"; a failed next page keeps the loaded
  // rows and stops auto-fetching until the user presses 再試行.
  const isInitialError = isError && !isFetchNextPageError && !isFetching;
  const isNextPageError = isFetchNextPageError && !isFetchingNextPage;

  const sentinelRef = useInfiniteScroll({
    hasMore: !!hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: () => void fetchNextPage(),
    rootRef: listRef,
    enabled: open && !isFetchNextPageError,
  });

  const labelOf = (id: string) =>
    pickedLabels[id] ?? selectedLabels?.[id] ?? stores.find((store) => store.id === id)?.name ?? id;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearchInput('');
  };

  const toggle = (store: { id: string; name: string }) => {
    if (value.includes(store.id)) {
      onChange(value.filter((id) => id !== store.id));
      return;
    }
    setPickedLabels((prev) => ({ ...prev, [store.id]: store.name }));
    onChange([...value, store.id]);
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-invalid={hasError || undefined}
              disabled={disabled}
              className={cn(
                'w-full min-w-0 justify-between font-normal',
                hasError && 'border-destructive',
                triggerClassName,
              )}
            >
              {value.length > 0 ? (
                <span className="truncate">{value.length}店舗を選択中</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-(--anchor-width) min-w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={searchInput}
              onValueChange={setSearchInput}
              placeholder={searchPlaceholder}
              className="h-8"
            />
            <div className="flex items-center justify-between border-b px-3 py-1.5">
              <span className="text-muted-foreground text-xs">選択中 {value.length}件</span>
              {value.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-1 py-0 text-xs"
                  onClick={() => onChange([])}
                >
                  すべて解除
                </Button>
              )}
            </div>
            <CommandList ref={listRef}>
              {isFetching && !isFetchingNextPage ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  店舗を読み込み中...
                </div>
              ) : isInitialError ? (
                <div
                  role="alert"
                  className="text-destructive flex flex-col items-center gap-2 py-6 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    店舗の取得に失敗しました
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                    再試行
                  </Button>
                </div>
              ) : (
                <>
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                  <CommandGroup>
                    {stores.map((store) => {
                      const selected = value.includes(store.id);
                      return (
                        <CommandItem
                          key={store.id}
                          value={store.id}
                          data-checked={selected || undefined}
                          onSelect={() => toggle(store)}
                        >
                          <Check
                            className={cn('mr-2 size-4', selected ? 'opacity-100' : 'opacity-0')}
                          />
                          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                            {store.name}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  {isNextPageError && (
                    <div
                      role="alert"
                      className="text-destructive flex items-center justify-center gap-2 py-2 text-xs"
                    >
                      <AlertCircle className="size-3" />
                      続きの取得に失敗しました
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => void fetchNextPage()}
                      >
                        再試行
                      </Button>
                    </div>
                  )}
                  {(hasNextPage || isFetchingNextPage) && !isNextPageError && (
                    <div
                      ref={sentinelRef}
                      className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs"
                    >
                      {isFetchingNextPage && (
                        <>
                          <Spinner className="size-3" />
                          読み込み中...
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label="選択中の店舗">
          {value.map((id) => (
            <li key={id}>
              <Badge variant="outline" className="h-auto gap-1 py-0.5 text-xs font-normal">
                <span className="max-w-60 truncate" title={labelOf(id)}>
                  {labelOf(id)}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground rounded-sm"
                    aria-label={`${labelOf(id)}を解除`}
                    onClick={() => onChange(value.filter((storeId) => storeId !== id))}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
