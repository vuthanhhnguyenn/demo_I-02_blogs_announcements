'use client';

import { useMemo, useRef, useState } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Building2, Check, ChevronDown } from 'lucide-react';

import { useDebounce } from '@/hooks/use-debounce.hook';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';

import { useStoreLabel } from '@/components/common/data-select-input';
import { Badge } from '@/components/ui/badge';
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
import type { StoreListResponseDto, StoreSummaryDto } from '@/lib/api-real/types.gen';

const STORE_PAGE_SIZE = 20;

// The real API's `brandEnum` — kept independent of the mock `Brand` enum that
// `brand-badge`'s BRAND_LABELS / BRAND_COLOR_MAP are keyed by, so this doesn't
// break once the mock API types are removed.
const REAL_BRAND_BADGE_CONTENT: Record<string, { label: string; colorToken: string }> = {
  Joyfit: { label: 'JOYFIT', colorToken: 'primary' },
  Fit365: { label: 'FIT365', colorToken: 'destructive' },
  JoyfitPlus: { label: 'JOYFIT+', colorToken: 'warning' },
  JoyfitYoga: { label: 'JOYFIT YOGA', colorToken: 'success' },
  Joyfit24: { label: 'JOYFIT24', colorToken: 'info' },
};
// A brandEnum outside the map (bad data / a brand this FE doesn't know yet) gets a neutral mark,
// never another brand's name.
const UNKNOWN_BRAND_BADGE_CONTENT = { label: '—', colorToken: '' };

interface StoreOption {
  id: string;
  name: string;
  code?: string;
  brandLabel: string;
  brandColorToken: string;
}

/** Both sources of rows — the searched catalog and the context's restricted set — are `StoreSummaryDto`. */
function toStoreOption(store: StoreSummaryDto): StoreOption {
  const content = REAL_BRAND_BADGE_CONTENT[store.brandEnum] ?? UNKNOWN_BRAND_BADGE_CONTENT;
  return {
    id: store.id,
    name: store.name,
    code: store.code,
    brandLabel: content.label,
    brandColorToken: content.colorToken,
  };
}

/** Header-level store scope selector — drives which store(s) every page's data queries are scoped to. */
export function StoreSelector() {
  const { currentStoreId, setCurrentStoreId, restrictedStores, canSelectAllStores, isLoading } =
    useCurrentStore();
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  // Remember the store picked from the list so the trigger can render its label
  // without refetching once the dropdown closes.
  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(null);

  const isAllStores = currentStoreId === ALL_STORES;

  // Roles that can browse the full catalog don't have it preloaded (see
  // CurrentStoreProvider), so after a reload the scope is just an id with no name.
  const needsResolve = canSelectAllStores && !isAllStores && selectedStore?.id !== currentStoreId;

  const { data, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: {
        limit: STORE_PAGE_SIZE,
        keyword: debouncedSearch || undefined,
        sort: 'name',
        order: 'asc',
      },
    }),
    enabled: canSelectAllStores && open,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StoreListResponseDto) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useInfiniteScroll({
    hasMore: !!hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: () => void fetchNextPage(),
    rootRef: listRef,
    enabled: canSelectAllStores && open,
  });

  // Resolve that id through the detail endpoint, the way every other store label in the
  // app does. It used to be looked up by feeding the UUID to the list's `keyword`, which
  // matches on name/code only and therefore always came back empty — the header fell back
  // to 「店舗を選択」 after every reload while the list below stayed correctly scoped
  // (BUG-P2-01-17).
  const { label: resolvedStoreName, isLoading: isResolvingStore } = useStoreLabel(
    needsResolve ? currentStoreId : null,
  );

  const stores: StoreOption[] = useMemo(
    () =>
      (canSelectAllStores
        ? (data?.pages.flatMap((page) => page.items) ?? [])
        : restrictedStores
      ).map(toStoreOption),
    [canSelectAllStores, data, restrictedStores],
  );
  const currentStore =
    stores.find((store) => store.id === currentStoreId) ??
    (selectedStore?.id === currentStoreId ? selectedStore : undefined);

  // Trainer / Observer can't read the store master (API-083), so their home store is named by
  // `/crm/me` (API-069, BE !834); `null` there (no store / lookup failed) shows an empty label.
  const isHomeStoreOnly = !!user?.storeId && user.storeId === currentStoreId && !currentStore;
  const homeStoreName = isHomeStoreOnly ? (user.storeName ?? '') : undefined;

  const storeDisplayName = isAllStores
    ? '全店舗（本部）'
    : (currentStore?.name ??
      resolvedStoreName ??
      homeStoreName ??
      (isLoading || isFetching || isResolvingStore ? '読み込み中...' : '店舗を選択'));

  // Single-store users (Staff/Trainer/Observer with exactly one accessible store) get a
  // non-interactive display — there's nothing to switch to.
  const showChevron = canSelectAllStores || restrictedStores.length > 1;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchInput('');
    }
  };

  const handleSelectStore = (store: StoreOption) => {
    setSelectedStore(store);
    setCurrentStoreId(store.id);
    handleOpenChange(false);
  };

  if (!showChevron) {
    return (
      <div className="border-sidebar-border/60 bg-sidebar-accent/40 flex max-w-[300px] min-w-[200px] shrink-0 items-center gap-2 rounded-lg border px-3 py-2">
        <div className="bg-sidebar-accent flex size-7 shrink-0 items-center justify-center rounded">
          <Building2 className="text-sidebar-foreground/70 size-4" />
        </div>
        <span className="text-sidebar-foreground/90 truncate text-sm font-medium">
          {storeDisplayName}
        </span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger className="border-sidebar-border/60 bg-sidebar-accent/40 hover:border-sidebar-border hover:bg-sidebar-accent flex h-auto max-w-[300px] min-w-[200px] shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors outline-none">
        <div className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded">
          <Building2 className="text-sidebar-foreground/90 size-4" />
        </div>
        <span className="text-sidebar-foreground/90 flex-1 truncate text-left text-sm font-medium">
          {storeDisplayName}
        </span>
        <ChevronDown className="text-sidebar-foreground/70 size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent className="w-80 rounded-lg p-0 shadow-lg" sideOffset={8} align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={searchInput}
            onValueChange={setSearchInput}
            placeholder="店舗名・店舗コードで検索..."
          />
          <CommandList ref={listRef}>
            <CommandEmpty>
              {isFetching && !isFetchingNextPage ? '検索中...' : '該当する店舗がありません'}
            </CommandEmpty>

            {canSelectAllStores && (
              <CommandGroup heading="全体">
                <CommandItem
                  value="all"
                  onSelect={() => {
                    setCurrentStoreId(ALL_STORES);
                    handleOpenChange(false);
                  }}
                >
                  <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded">
                    <Building2 className="text-primary size-4" />
                  </div>
                  <div className="ml-2 min-w-0 flex-1">
                    <p className="text-sm font-medium">全店舗（本部）</p>
                    <p className="text-muted-foreground text-xs">全ブランド・全店舗横断</p>
                  </div>
                  {isAllStores && <Check className="text-primary size-4 shrink-0" />}
                </CommandItem>
              </CommandGroup>
            )}

            <CommandGroup heading="店舗">
              {stores.map((store) => (
                <CommandItem
                  key={store.id}
                  value={store.id}
                  onSelect={() => handleSelectStore(store)}
                >
                  <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded">
                    <Building2 className="text-muted-foreground size-4" />
                  </div>
                  <div className="ml-2 min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{store.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {store.code && (
                        <span className="text-muted-foreground text-xs">{store.code}</span>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          store.brandColorToken
                            ? `bg-${store.brandColorToken}/15 text-${store.brandColorToken} border-${store.brandColorToken}/20 text-[10px]`
                            : 'bg-muted text-muted-foreground border-border text-[10px]'
                        }
                      >
                        {store.brandLabel}
                      </Badge>
                    </div>
                  </div>
                  {currentStoreId === store.id && (
                    <Check className="text-primary size-4 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            {(hasNextPage || isFetchingNextPage) && (
              <div
                ref={sentinelRef}
                className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs"
              >
                {isFetchingNextPage && (
                  <>
                    <Spinner className="size-3" />
                    <span>読み込み中...</span>
                  </>
                )}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
