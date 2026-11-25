'use client';

import { useMemo, useState } from 'react';

import { useCurrentStore } from '@/contexts/current-store.context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { SearchableSelect } from '@/components/common/searchable-select';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';

import {
  adminStoreControllerDetailOptions,
  adminStoreControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreListResponseDto, StoreSummaryDto } from '@/lib/api-real/types.gen';

type Store = Pick<StoreSummaryDto, 'id' | 'code' | 'name' | 'clubCode'>;

const STORE_PAGE_SIZE = 20;

type ControllerStoreFieldProps = {
  value: string;
  onChange: (storeId: string) => void;
  hasError?: boolean;
  /** API-104 makes `storeId` immutable after create, so the edit form locks the field. */
  disabled?: boolean;
  /**
   * Store already selected when the form opened (edit mode). The record carries the label, so
   * passing it in saves the by-id lookup the field would otherwise need before the dropdown is
   * ever opened.
   */
  initialStore?: { id: string; label: string };
};

/**
 * 店舗コード picker. The label the prototype shows is the store code, while the value sent to
 * the API is the store id — the design doc's `storeId` (API-104 §6.1).
 */
export function ControllerStoreField({
  value,
  onChange,
  hasError,
  disabled = false,
  initialStore,
}: ControllerStoreFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Remember the store picked from the list so the trigger can render its label
  // without refetching once the dropdown closes.
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  /**
   * BUG-E02-F-09 — E-02 データスコープ: a store-restricted user (Manager's 管轄店舗, a staff
   * member's own store) may only register into the stores they can reach, so the picker offers
   * exactly those — the full catalog let a Manager pick an out-of-territory store and hit 403
   * E-DEV-100. The roster is already loaded by the header store context, so it is searched here.
   */
  const {
    canSelectAllStores,
    restrictedStores,
    isLoading: isStoreScopeLoading,
  } = useCurrentStore();
  const isStoreRestricted = !canSelectAllStores;

  /**
   * The store roster is server-paginated and searched server-side: loading a single fixed page and
   * filtering it in the browser would silently cut the list off at that page.
   * `SearchableSelect` debounces `onSearchChange` by 300ms on its own.
   */
  const { data, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: {
        limit: STORE_PAGE_SIZE,
        keyword: searchQuery.trim() || undefined,
        sort: 'name',
        order: 'asc',
      },
    }),
    enabled: isOpen && !isStoreRestricted,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StoreListResponseDto, allPages) => {
      const loadedPages = allPages.length;
      const totalPages = lastPage.pagination?.totalPages ?? 0;
      return loadedPages < totalPages ? loadedPages + 1 : undefined;
    },
  });

  const catalogStores: Store[] = useMemo(
    () => data?.pages.flatMap((page) => page.items ?? []) ?? [],
    [data],
  );
  const accessibleStores: Store[] = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return restrictedStores;
    return restrictedStores.filter((store) =>
      [store.name, store.code, store.clubCode].some((text) => text.toLowerCase().includes(keyword)),
    );
  }, [restrictedStores, searchQuery]);
  const stores = isStoreRestricted ? accessibleStores : catalogStores;
  const selected =
    (value ? stores.find((store) => store.id === value) : undefined) ??
    (selectedStore?.id === value ? selectedStore : undefined);

  /**
   * The selected store need not be on the pages loaded so far (and while the dropdown has never
   * been opened, nothing is loaded at all), so resolve its label on its own when neither the local
   * cache nor the form's initial value covers it. It has to be the by-id endpoint: the list search
   * matches store name / club code / territory only, never the id being resolved here.
   */
  const needsResolve = Boolean(value) && !selected && initialStore?.id !== value;

  const { data: resolvedStore } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: value } }),
    enabled: needsResolve,
  });

  const formatStore = (store: Pick<Store, 'name' | 'code'>) =>
    store.code ? `${store.name} (${store.code})` : store.name;

  const valueLabel = value
    ? selected
      ? formatStore(selected)
      : resolvedStore
        ? formatStore(resolvedStore)
        : initialStore?.id === value
          ? initialStore.label
          : value
    : undefined;

  const handleSelect = (store: Store | null) => {
    setSelectedStore(store);
    onChange(store?.id ?? '');
  };

  return (
    <SearchableSelect<Store>
      value={value || null}
      valueLabel={valueLabel}
      options={stores}
      placeholder="店舗コードを選択"
      searchPlaceholder="店舗を検索..."
      emptyMessage="該当する店舗がありません"
      loadingMessage="店舗を読み込み中..."
      clearLabel="選択をクリア"
      open={isOpen}
      onOpenChange={setIsOpen}
      onSearchChange={setSearchQuery}
      onSelect={handleSelect}
      getOptionKey={(store) => store.id}
      getOptionLabel={formatStore}
      getOptionKeywords={(store) =>
        [store.name, store.code, store.id, store.clubCode].filter(Boolean).join(' ')
      }
      renderOption={(store) => (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TextWithTooltip text={store.name} wrapperClassName="min-w-0 flex-1" className="w-full" />
          <span className="text-muted-foreground shrink-0 font-mono text-[10px]">{store.code}</span>
        </div>
      )}
      isLoading={isStoreRestricted ? isStoreScopeLoading : isFetching && !isFetchingNextPage}
      hasMore={isStoreRestricted ? false : hasNextPage}
      isLoadingMore={isFetchingNextPage}
      onLoadMore={fetchNextPage}
      loadingMoreMessage="読み込み中..."
      disabled={disabled}
      triggerClassName={`h-9 w-full justify-between ${hasError ? 'border-destructive' : ''}`}
    />
  );
}
