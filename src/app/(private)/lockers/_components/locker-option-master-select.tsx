'use client';

import { useState } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import { SearchableSelect } from '@/components/common/searchable-select';

import { adminOptionControllerListInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionListItemDto, OptionListResponseDto } from '@/lib/api-real/types.gen';

import { formatLockerFee } from '../_utils/locker-fee.util';

export type LockerOptionMasterItem = OptionListItemDto;

const PAGE_SIZE = 20;

type LockerOptionMasterSelectProps = {
  /** Currently selected option master **id** (`optionId` / `bottomOptionId`). */
  value: string | null;
  /**
   * Label for the selected option. Required whenever the selection may sit outside the first
   * page — the selected master is otherwise unknown until the user scrolls to it.
   */
  valueLabel?: string;
  onSelect: (item: LockerOptionMasterItem | null) => void;
  /** Narrows the candidates to the options usable at this store */
  storeId?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  hasError?: boolean;
  triggerClassName?: string;
};

/**
 * Select over the G-02 locker option master (`GET /admin/options?category=locker_option`,
 * active only — the cabinet accepts inactive ones, but a new choice should be live).
 *
 * Paged 20 rows at a time with server-side search, so the list can never be silently truncated
 * as options are added per shape and brand.
 */
export function LockerOptionMasterSelect({
  value,
  valueLabel,
  onSelect,
  storeId,
  placeholder = '選択してください',
  searchPlaceholder = '契約種類名・コードで検索',
  emptyMessage = '該当する契約種類がありません',
  disabled = false,
  hasError = false,
  triggerClassName,
}: LockerOptionMasterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    ...adminOptionControllerListInfiniteOptions({
      query: {
        limit: PAGE_SIZE,
        isActive: true,
        category: 'locker_option',
        storeId: storeId || undefined,
        keyword: searchQuery || undefined,
        sort: 'name',
        order: 'asc',
      },
    }),
    enabled: isOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: OptionListResponseDto, allPages) => {
      const loaded = allPages.length * PAGE_SIZE;
      return loaded < lastPage.pagination.totalItems ? allPages.length + 1 : undefined;
    },
  });

  const options = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SearchableSelect<LockerOptionMasterItem>
      value={value || null}
      valueLabel={valueLabel}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      loadingMessage="契約種類を読み込み中..."
      isLoading={isFetching && !isFetchingNextPage}
      disabled={disabled}
      hasError={hasError}
      open={isOpen}
      onOpenChange={setIsOpen}
      onSearchChange={setSearchQuery}
      onSelect={onSelect}
      getOptionKey={(item) => item.id}
      getOptionLabel={(item) => `${item.name}（${formatLockerFee(item)}/月）`}
      getOptionKeywords={(item) => [item.name, item.optionCode].join(' ')}
      hasMore={hasNextPage}
      isLoadingMore={isFetchingNextPage}
      onLoadMore={fetchNextPage}
      triggerClassName={triggerClassName}
    />
  );
}
