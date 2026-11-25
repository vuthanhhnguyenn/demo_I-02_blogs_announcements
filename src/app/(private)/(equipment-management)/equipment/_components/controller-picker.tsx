'use client';

import { useMemo, useState } from 'react';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { SearchableSelect } from '@/components/common/searchable-select';

import {
  adminRelayControllerControllerDetailOptions,
  adminRelayControllerControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  RelayControllerListItemDto,
  RelayControllerListResponseDto,
} from '@/lib/api-real/types.gen';

import { CONTROLLER_STATUS_LABELS } from '../../controllers/_constants/constants';

const CONTROLLER_PAGE_SIZE = 25;

type ControllerPickerProps = {
  value: string | null;
  /** The picked row rides along so the caller can read its store without another lookup. */
  onChange: (controllerId: string | null, controller?: RelayControllerListItemDto) => void;
  hasError?: boolean;
  /**
   * Store the picker is limited to. On edit this is the device's own store: API-103 only allows a
   * controller swap within the same store (E-DEV-008).
   */
  storeId?: string;
};

export function ControllerPicker({
  value,
  onChange,
  hasError = false,
  storeId,
}: ControllerPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { currentStoreId } = useCurrentStore();

  /**
   * A device's store follows the relay controller it hangs off (design doc §6.1 / §6.2), so the
   * roster is scoped to the store the user is working in — otherwise picking a controller from
   * another store would silently move the device there, out of the list they can see.
   */
  const scopedStoreId = storeId ?? (currentStoreId === ALL_STORES ? undefined : currentStoreId);

  /**
   * The controller roster is server-paginated and searched server-side: loading a single fixed
   * page and filtering it in the browser would silently cut the list off at that page.
   * `SearchableSelect` debounces `onSearchChange` by 300ms on its own.
   */
  const { data, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    ...adminRelayControllerControllerListInfiniteOptions({
      query: {
        limit: CONTROLLER_PAGE_SIZE,
        q: search.trim() || undefined,
        storeId: scopedStoreId,
        // A device cannot be attached to a 廃棄 controller (422 E-DEV-008). Dropping them
        // server-side keeps `totalPages` honest: filtering in the browser could leave a page with
        // no visible options, and `SearchableSelect` then never offers to load the next one.
        excludeDiscarded: true,
      },
    }),
    enabled: isOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: RelayControllerListResponseDto, allPages) => {
      const loadedPages = allPages.length;
      return loadedPages < lastPage.pagination.totalPages ? loadedPages + 1 : undefined;
    },
  });

  const controllers = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const selected = value ? controllers.find((controller) => controller.id === value) : undefined;

  /**
   * The linked controller need not be on the pages loaded so far (and while the popover has never
   * been opened, nothing is loaded at all), so its label is fetched on its own. Without this the
   * edit form would show the empty-state placeholder for a device that does have a controller.
   */
  const { data: selectedDetail } = useQuery({
    ...adminRelayControllerControllerDetailOptions({ path: { relayControllerId: value ?? '' } }),
    enabled: !!value && !selected,
  });

  const selectedLabel = selected?.name ?? selectedDetail?.name;

  return (
    <SearchableSelect<RelayControllerListItemDto>
      value={value || null}
      valueLabel={selectedLabel}
      options={controllers}
      placeholder="接点制御装置を選択"
      // API-104 `q` matches name / model / serial / location / IP — not the id (unlike API-103).
      searchPlaceholder="装置名・IPアドレス・設置場所で検索..."
      emptyMessage="該当する接点制御装置がありません"
      loadingMessage="接点制御装置を読み込み中..."
      isLoading={isFetching && !isFetchingNextPage}
      hasMore={hasNextPage}
      isLoadingMore={isFetchingNextPage}
      onLoadMore={fetchNextPage}
      loadingMoreMessage="読み込み中..."
      open={isOpen}
      onOpenChange={setIsOpen}
      onSearchChange={setSearch}
      onSelect={(controller) => onChange(controller?.id ?? null, controller ?? undefined)}
      getOptionKey={(controller) => controller.id}
      getOptionLabel={(controller) => controller.name}
      getOptionKeywords={(controller) =>
        [controller.name, controller.id, controller.ipAddress, controller.location]
          .filter(Boolean)
          .join(' ')
      }
      clearLabel="選択をクリア"
      hasError={hasError}
      renderOption={(controller) => {
        // 全店舗: controllers of every store are listed, and same-named ones are told apart only by
        // their store (BUG-E02-C-08). A single-store scope needs no store label.
        const storeLabel = scopedStoreId
          ? null
          : (controller.storeName ?? controller.storeCode ?? '—');
        const ipAddress = controller.ipAddress ?? '—';
        const location = controller.location ?? '—';
        const statusLabel = CONTROLLER_STATUS_LABELS[controller.status];
        const detail = [storeLabel, ipAddress, location, statusLabel]
          .filter((part) => part !== null)
          .join(' ・ ');

        // Both lines truncate to the popup width; `title` keeps the full text readable
        // (BUG-E02-C-12).
        return (
          <div className="flex min-w-0 flex-1 flex-col" title={`${controller.name}\n${detail}`}>
            <span className="truncate text-sm">{controller.name}</span>
            {/*
             * TODO(round3) R303: the prototype shows `IP:ポート` here; the port (`httpPort`) is not
             * an E-02 FR-007 item (integrate in phase 2) — the IP alone is shown.
             */}
            <span className="text-muted-foreground truncate text-xs">
              {storeLabel ? `${storeLabel} ・ ` : null}
              <span className="font-mono">{ipAddress}</span> ・ {location} ・ {statusLabel}
            </span>
          </div>
        );
      }}
      triggerClassName="h-9 w-full"
    />
  );
}
