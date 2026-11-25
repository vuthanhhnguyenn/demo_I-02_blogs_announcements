'use client';

import { type ReactNode, useMemo, useState } from 'react';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronDownIcon } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';

import {
  adminStoreControllerDetailOptions,
  adminStoreControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AdminStoreControllerListData,
  StoreListResponseDto,
  StoreSummaryDto,
} from '@/lib/api-real/types.gen';

/** One store row as served by `GET /api/v1/admin/stores`. */
export type StoreSelectOption = StoreSummaryDto;

type StoreListQuery = NonNullable<AdminStoreControllerListData['query']>;

/** Server-side narrowing applied to the catalog before it is offered for selection. */
export type StoreSelectQueryFilters = Pick<
  StoreListQuery,
  'brandEnum' | 'brandGroup' | 'prefecture' | 'status' | 'fcCompanyId'
>;

// Mirrors the native `Select` trigger's chevron so a store picker sitting in a
// filter row alongside plain selects doesn't stand out.
const DEFAULT_END_ICON = <ChevronDownIcon className="text-muted-foreground ml-2 size-4 shrink-0" />;

const STORE_PAGE_SIZE = 20;
// Keep results warm across popover reopens so the first page isn't refetched every time.
const STORE_CACHE_MS = 5 * 60 * 1000;

/**
 * Resolves a store id to its display name via the detail endpoint.
 *
 * Used for selections that aren't on a loaded page — e.g. a `store_id` restored
 * from the URL before the dropdown has ever been opened, or a filter banner that
 * needs the name without rendering the select at all.
 */
export function useStoreLabel(storeId: string | null | undefined, options?: { enabled?: boolean }) {
  const enabled = (options?.enabled ?? true) && !!storeId;

  const { data, isFetching } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: storeId ?? '' } }),
    enabled,
    // A denied or deleted store shouldn't retry — the caller falls back to a placeholder.
    retry: false,
    staleTime: STORE_CACHE_MS,
  });

  return {
    label: storeId ? (data?.name ?? null) : null,
    isLoading: enabled && isFetching,
  };
}

interface StoreSelectInputProps {
  /** Selected store id; `null` means nothing selected (i.e. the clear/"all" state). */
  value: string | null;
  /** Fired with the picked store, or `null` when the clear row is chosen. */
  onChange: (store: StoreSelectOption | null) => void;
  /**
   * Trigger label for the current selection. Provide it when the caller already
   * knows the name; otherwise it is resolved on demand via {@link useStoreLabel}.
   */
  valueLabel?: string | null;
  /** Trigger text while nothing is selected. */
  placeholder?: string;
  searchPlaceholder?: string;
  /**
   * Set false to hide the search box — the dropdown then only pages through the
   * catalog. Useful for short, pre-filtered lists.
   */
  searchable?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  loadingMoreMessage?: string;
  /** Text of the clear row. Pass `null` to hide it (required-field usage). */
  clearLabel?: string | null;
  /** Extra server-side filters applied to the catalog. */
  queryFilters?: StoreSelectQueryFilters;
  /** Rows fetched per page. */
  pageSize?: number;
  /** Gate the network entirely — e.g. `false` while the filter panel is collapsed. */
  enabled?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  /** Trailing icon in the trigger. Pass `null` to hide it. */
  endIcon?: ReactNode;
  triggerClassName?: string;
  contentClassName?: string;
}

/**
 * Shared store picker: server-side keyword search + infinite scroll over the
 * store master, on top of {@link SearchableSelect}. Fetches only while the
 * dropdown is open, so mounting one is cheap.
 */
export function StoreSelectInput({
  value,
  onChange,
  valueLabel,
  placeholder = '全店舗',
  searchPlaceholder = '店舗名・店舗コードで検索...',
  searchable = true,
  emptyMessage = '該当する店舗がありません',
  loadingMessage = '店舗を読み込み中...',
  loadingMoreMessage = '読み込み中...',
  clearLabel = '全店舗',
  queryFilters,
  pageSize = STORE_PAGE_SIZE,
  enabled = true,
  disabled = false,
  hasError = false,
  endIcon = DEFAULT_END_ICON,
  triggerClassName,
  contentClassName,
}: StoreSelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  // Remember the picked row so the trigger keeps its label after the list unmounts.
  const [pickedStore, setPickedStore] = useState<StoreSelectOption | null>(null);

  const canFetch = enabled && !disabled;

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
        limit: pageSize,
        keyword: (searchable && search) || undefined,
        sort: 'name',
        order: 'asc',
        ...queryFilters,
      },
    }),
    enabled: canFetch && isOpen,
    staleTime: STORE_CACHE_MS,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StoreListResponseDto) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const stores = useMemo(() => data?.pages.flatMap((page) => page.items ?? []) ?? [], [data]);

  // Prefer a caller-supplied label, then the row the user just picked, then the
  // loaded page — and only fall back to a lookup when none of those know the name.
  const knownLabel =
    valueLabel ??
    (pickedStore?.id === value ? pickedStore.name : undefined) ??
    stores.find((store) => store.id === value)?.name;

  const { label: resolvedLabel, isLoading: isResolvingLabel } = useStoreLabel(value, {
    enabled: canFetch && !knownLabel,
  });

  let triggerLabel = placeholder;
  if (value) {
    triggerLabel = knownLabel ?? resolvedLabel ?? (isResolvingLabel ? loadingMessage : placeholder);
  }

  const handleSelect = (store: StoreSelectOption | null) => {
    setPickedStore(store);
    onChange(store);
  };

  return (
    <SearchableSelect<StoreSelectOption>
      value={value}
      valueLabel={triggerLabel}
      options={stores}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      searchable={searchable}
      emptyMessage={emptyMessage}
      loadingMessage={loadingMessage}
      clearLabel={clearLabel ?? undefined}
      open={isOpen}
      onOpenChange={setIsOpen}
      onSearchChange={setSearch}
      onSelect={handleSelect}
      getOptionKey={(store) => store.id}
      getOptionLabel={(store) => store.name}
      getOptionKeywords={(store) => [store.name, store.code, store.id].filter(Boolean).join(' ')}
      renderOption={(store) => (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TextWithTooltip
            text={store.name}
            wrapperClassName="min-w-0 flex-1"
            className="w-full"
            side="right"
            align="center"
          />
          {/* {store.code ? (
            <span className="text-muted-foreground shrink-0 text-[10px]">{store.code}</span>
          ) : null} */}
        </div>
      )}
      isLoading={isFetching && !isFetchingNextPage}
      hasMore={hasNextPage}
      isLoadingMore={isFetchingNextPage}
      onLoadMore={fetchNextPage}
      loadingMoreMessage={loadingMoreMessage}
      loadMoreFailed={isFetchNextPageError}
      loadFailed={isError && !isFetchNextPageError}
      loadFailedMessage="店舗の取得に失敗しました"
      onRetry={() => void refetch()}
      retryLabel="再試行"
      disabled={disabled}
      hasError={hasError}
      endIcon={endIcon}
      triggerClassName={triggerClassName}
      contentClassName={contentClassName}
    />
  );
}
