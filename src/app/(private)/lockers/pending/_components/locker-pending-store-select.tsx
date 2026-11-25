'use client';

import { useState } from 'react';

import { useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';

import { SearchableSelect } from '@/components/common/searchable-select';

import {
  adminStoreControllerDetailOptions,
  adminStoreControllerListOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreSummaryDto } from '@/lib/api-real/types.gen';

const STORE_SEARCH_LIMIT = 20;

type LockerPendingStoreSelectProps = {
  value: string | null;
  onChange: (storeId: string | null) => void;
  isActive: boolean;
};

/**
 * FR-008 店舗フィルター（開放待ち一覧・契約一覧の店舗横断抽出用）。
 *
 * 店舗マスタは件数が多くなり得るため、固定 limit で全件を読み込んでクライアント側で
 * 絞り込むのではなく、`SearchableSelect` のサーバー検索で候補を引く（候補の切り捨て防止）。
 *
 * `GET /admin/stores` is scoped for Staff only (Manager gets every store, Observer gets 403), so a
 * restricted role picks from its own stores — the ones the header switcher offers, as the cabinet
 * form does. A store outside them would answer 403 E-LOC-100 on the pending list and its CSV.
 */
export function LockerPendingStoreSelect({
  value,
  onChange,
  isActive,
}: LockerPendingStoreSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { canSelectAllStores, restrictedStores } = useCurrentStore();

  const { data: storesRes, isFetching } = useQuery({
    ...adminStoreControllerListOptions({
      query: {
        page: 1,
        limit: STORE_SEARCH_LIMIT,
        keyword: searchQuery || undefined,
        sort: 'name',
        order: 'asc',
      },
    }),
    enabled: isOpen && canSelectAllStores,
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const stores = canSelectAllStores
    ? (storesRes?.items ?? [])
    : restrictedStores.filter((store) =>
        [store.name, store.code].some((text) => text?.toLowerCase().includes(normalizedQuery)),
      );
  const selectedFromOptions = value ? stores.find((store) => store.id === value) : undefined;

  const { data: selectedStore } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: value ?? '' } }),
    enabled: Boolean(value) && !selectedFromOptions && canSelectAllStores,
  });

  const selectedLabel = value
    ? (selectedFromOptions?.name ?? selectedStore?.name ?? value)
    : undefined;

  return (
    <SearchableSelect<StoreSummaryDto>
      value={value}
      valueLabel={selectedLabel}
      options={stores}
      placeholder="全店舗"
      searchPlaceholder="店舗名・店舗コードで検索..."
      emptyMessage="該当する店舗がありません"
      loadingMessage="店舗を読み込み中..."
      isLoading={canSelectAllStores && isFetching}
      open={isOpen}
      onOpenChange={setIsOpen}
      onSearchChange={setSearchQuery}
      onSelect={(store) => onChange(store?.id ?? null)}
      getOptionKey={(store) => store.id}
      getOptionLabel={(store) => store.name}
      getOptionKeywords={(store) =>
        [store.name, store.code, store.id, store.clubCode].filter(Boolean).join(' ')
      }
      triggerClassName={`h-8 min-w-40 text-xs font-normal ${
        isActive ? 'border-primary bg-primary/10 text-foreground' : ''
      }`}
    />
  );
}
