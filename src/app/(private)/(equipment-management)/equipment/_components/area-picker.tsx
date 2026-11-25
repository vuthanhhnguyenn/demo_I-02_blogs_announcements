'use client';

import { useMemo, useState } from 'react';

import {
  AREA_KEYWORD_MAX_LENGTH,
  type AreaBrandGroup,
} from '@/app/(private)/area-master/_constants/area.constants';
import { useInfiniteQuery } from '@tanstack/react-query';

import { SearchableSelect } from '@/components/common/searchable-select';

import type { AreaListItemDto } from '@/lib/api-real/types.gen';

import { brandAreaPagesOptions, useAreaById } from '../_hooks/use-area-lookup';

const PLACEHOLDER = '選択してください';
const LOADING_MESSAGE = 'エリアを読み込み中...';

/** The area fields an エリア扉 reads: the name on the trigger and the read-only 性別の条件. */
export type AreaPickerArea = Pick<AreaListItemDto, 'id' | 'name' | 'genderCondition'>;

type AreaPickerProps = {
  /** Areas are offered from this brand group (the controller store's); `null` = not known yet. */
  brandGroup: AreaBrandGroup | null;
  value: string | null;
  /** The picked row rides along so the caller can show its 性別の条件 without another lookup. */
  onChange: (area: AreaListItemDto) => void;
  /** Trigger label of `value` when the caller already knows it. */
  valueLabel?: string;
  /** Accessible name of the trigger (the form label does not reach the popover trigger). */
  ariaLabel?: string;
  disabled?: boolean;
  hasError?: boolean;
};

/**
 * The one area of an エリア扉 (E-02 FR-003). The area master is server-paginated and searched
 * server-side: a single fixed page would silently cut the list off at the API's `limit` cap.
 */
export function AreaPicker({
  brandGroup,
  value,
  onChange,
  valueLabel,
  ariaLabel,
  disabled = false,
  hasError = false,
}: AreaPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const {
    data,
    isFetching,
    isError,
    isFetchNextPageError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    ...brandAreaPagesOptions(brandGroup, search || undefined),
    enabled: isOpen && Boolean(brandGroup) && !disabled,
  });

  const areas = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const knownLabel = valueLabel ?? areas.find((area) => area.id === value)?.name;
  const { area: selectedDetail, isLoading: isResolvingLabel } = useAreaById(value, {
    enabled: !knownLabel,
  });

  let triggerLabel = PLACEHOLDER;
  if (value) {
    triggerLabel =
      knownLabel ?? selectedDetail?.name ?? (isResolvingLabel ? LOADING_MESSAGE : PLACEHOLDER);
  }

  return (
    <SearchableSelect<AreaListItemDto>
      value={value}
      valueLabel={triggerLabel}
      options={areas}
      placeholder={PLACEHOLDER}
      searchPlaceholder="エリア名・備考で検索..."
      searchMaxLength={AREA_KEYWORD_MAX_LENGTH}
      emptyMessage="該当するエリアがありません"
      loadingMessage={LOADING_MESSAGE}
      isLoading={isFetching && !isFetchingNextPage}
      hasMore={hasNextPage}
      isLoadingMore={isFetchingNextPage}
      onLoadMore={() => void fetchNextPage()}
      loadingMoreMessage="読み込み中..."
      loadMoreFailed={isFetchNextPageError}
      loadFailed={isError && !isFetchNextPageError}
      loadFailedMessage="エリアの取得に失敗しました"
      onRetry={() => void refetch()}
      open={isOpen}
      onOpenChange={setIsOpen}
      onSearchChange={setSearch}
      onSelect={(area) => {
        if (area) onChange(area);
      }}
      getOptionKey={(area) => area.id}
      getOptionLabel={(area) => area.name}
      disabled={disabled}
      hasError={hasError}
      ariaLabel={ariaLabel}
      triggerClassName="h-9 w-full"
    />
  );
}
