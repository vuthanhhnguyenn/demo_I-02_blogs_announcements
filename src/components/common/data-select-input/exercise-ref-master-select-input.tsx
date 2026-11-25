'use client';

import { type ReactNode, useMemo, useState } from 'react';

import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { ChevronDownIcon } from 'lucide-react';

import { getNextPageFromPagination } from '@/hooks/use-load-all-pages.hook';

import { SearchableSelect } from '@/components/common/searchable-select';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';

import {
  adminExerciseRefMasterControllerGetCategoryOptions,
  adminExerciseRefMasterControllerGetMuscleOptions,
  adminExerciseRefMasterControllerGetTypeOptions,
  adminExerciseRefMasterControllerListCategoriesInfiniteOptions,
  adminExerciseRefMasterControllerListMusclesInfiniteOptions,
  adminExerciseRefMasterControllerListTypesInfiniteOptions,
  adminTrainingEquipmentControllerGetToolTypeOptions,
  adminTrainingEquipmentControllerToolTypesInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

/** The exercise reference masters offered through a select (Y-08 FR-011). */
export type ExerciseRefMasterKind = 'category' | 'muscle' | 'exerciseType' | 'tool';

/** One master row as offered in the select. */
export interface ExerciseRefMasterSelectOption {
  id: string;
  code: string;
  name: string;
}

// Mirrors the native `Select` trigger's chevron so the picker sits in a filter row alongside
// plain selects without standing out.
const DEFAULT_END_ICON = <ChevronDownIcon className="text-muted-foreground ml-2 size-4 shrink-0" />;

const REF_MASTER_PAGE_SIZE = 20;
// Keep results warm across popover reopens so the first page isn't refetched every time.
const REF_MASTER_CACHE_MS = 5 * 60 * 1000;

type MasterPage = {
  items: ExerciseRefMasterSelectOption[];
  pagination: { page: number; totalPages: number };
};

type ListArgs = {
  /** Server-side keyword; `undefined` lists everything. */
  keyword: string | undefined;
  /** Fetch only while the dropdown is open. */
  enabled: boolean;
};

type Source = {
  useList: (args: ListArgs) => UseInfiniteQueryResult<InfiniteData<MasterPage>, unknown>;
  /** Name lookup for an id that is not on a loaded page; `null` skips it. */
  useDetail: (id: string | null) => UseQueryResult<ExerciseRefMasterSelectOption, unknown>;
};

/** Active rows in display order — what a form or a filter may pick (decision D5). */
function listQuery(keyword: string | undefined) {
  return {
    limit: REF_MASTER_PAGE_SIZE,
    keyword,
    isActive: true,
    sort: 'sortOrder',
    order: 'asc',
  } as const;
}

/**
 * 器具種別 (`mst_tools`, E-03-owned): active rows only by default, and 「なし（自重）」 is listed
 * (`includeNone`) so it stays selectable (FR-008).
 */
function toolListQuery(keyword: string | undefined) {
  return {
    limit: REF_MASTER_PAGE_SIZE,
    keyword,
    includeNone: true,
    sort: 'sortOrder',
    order: 'asc',
  } as const;
}

const LIST_PAGING = {
  initialPageParam: 1,
  getNextPageParam: getNextPageFromPagination,
  staleTime: REF_MASTER_CACHE_MS,
} as const;

// A deactivated or deleted master shouldn't retry — the trigger falls back to the placeholder.
const DETAIL_LOOKUP = { retry: false, staleTime: REF_MASTER_CACHE_MS } as const;

const SOURCES: Record<ExerciseRefMasterKind, Source> = {
  category: {
    useList: ({ keyword, enabled }) =>
      useInfiniteQuery({
        ...adminExerciseRefMasterControllerListCategoriesInfiniteOptions({
          query: listQuery(keyword),
        }),
        ...LIST_PAGING,
        enabled,
      }),
    useDetail: (id) =>
      useQuery({
        ...adminExerciseRefMasterControllerGetCategoryOptions({ path: { id: id ?? '' } }),
        ...DETAIL_LOOKUP,
        enabled: Boolean(id),
      }),
  },
  muscle: {
    useList: ({ keyword, enabled }) =>
      useInfiniteQuery({
        ...adminExerciseRefMasterControllerListMusclesInfiniteOptions({
          query: listQuery(keyword),
        }),
        ...LIST_PAGING,
        enabled,
      }),
    useDetail: (id) =>
      useQuery({
        ...adminExerciseRefMasterControllerGetMuscleOptions({ path: { id: id ?? '' } }),
        ...DETAIL_LOOKUP,
        enabled: Boolean(id),
      }),
  },
  exerciseType: {
    useList: ({ keyword, enabled }) =>
      useInfiniteQuery({
        ...adminExerciseRefMasterControllerListTypesInfiniteOptions({
          query: listQuery(keyword),
        }),
        ...LIST_PAGING,
        enabled,
      }),
    useDetail: (id) =>
      useQuery({
        ...adminExerciseRefMasterControllerGetTypeOptions({ path: { id: id ?? '' } }),
        ...DETAIL_LOOKUP,
        enabled: Boolean(id),
      }),
  },
  tool: {
    useList: ({ keyword, enabled }) =>
      useInfiniteQuery({
        ...adminTrainingEquipmentControllerToolTypesInfiniteOptions({
          query: toolListQuery(keyword),
        }),
        ...LIST_PAGING,
        enabled,
      }),
    useDetail: (id) =>
      useQuery({
        ...adminTrainingEquipmentControllerGetToolTypeOptions({ path: { id: id ?? '' } }),
        ...DETAIL_LOOKUP,
        enabled: Boolean(id),
      }),
  },
};

interface ExerciseRefMasterSelectInputProps {
  /** Which master the select offers. Must not change for a mounted instance. */
  kind: ExerciseRefMasterKind;
  /** Selected master id; `null` means nothing selected (the clear / "all" state). */
  value: string | null;
  /** Fired with the picked row, or `null` when the clear row is chosen. */
  onChange: (option: ExerciseRefMasterSelectOption | null) => void;
  /**
   * Trigger label for the current selection. Provide it when the caller already knows the
   * name; otherwise it is resolved on demand through the master's detail endpoint.
   */
  valueLabel?: string | null;
  /** Trigger text while nothing is selected. */
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  loadingMoreMessage?: string;
  /** Text of the clear row. Pass `null` to hide it (required-field usage). */
  clearLabel?: string | null;
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
 * Shared picker for an exercise reference master (カテゴリ / 筋肉部位 / エクササイズタイプ / 器具種別):
 * server-side keyword search + infinite scroll over the active rows in 表示順, on top of
 * {@link SearchableSelect}. Fetches only while the dropdown is open, so mounting one is cheap.
 * Mirrors `./store-select-input`.
 */
export function ExerciseRefMasterSelectInput({
  kind,
  value,
  onChange,
  valueLabel,
  placeholder = '選択してください',
  searchPlaceholder = '名称・コードで検索...',
  emptyMessage = '該当するデータがありません',
  loadingMessage = '読み込み中...',
  loadingMoreMessage = '読み込み中...',
  clearLabel = null,
  enabled = true,
  disabled = false,
  hasError = false,
  endIcon = DEFAULT_END_ICON,
  triggerClassName,
  contentClassName,
}: ExerciseRefMasterSelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  // Remember the picked row so the trigger keeps its label after the list unmounts.
  const [picked, setPicked] = useState<ExerciseRefMasterSelectOption | null>(null);

  const canFetch = enabled && !disabled;
  // `kind` is fixed per instance, so the same hooks run on every render.
  const { useList, useDetail } = SOURCES[kind];

  const list = useList({ keyword: search || undefined, enabled: canFetch && isOpen });
  const options = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data]);

  // Prefer a caller-supplied label, then the row the user just picked, then the loaded pages —
  // and only fall back to a lookup when none of those know the name (e.g. an id from the URL or
  // a saved record, before the dropdown has ever been opened).
  const knownLabel =
    valueLabel ??
    (picked?.id === value ? picked.name : undefined) ??
    options.find((option) => option.id === value)?.name;
  const detail = useDetail(canFetch && value && !knownLabel ? value : null);

  let triggerLabel = placeholder;
  if (value) {
    const resolvedLabel = detail.data?.id === value ? detail.data.name : undefined;
    triggerLabel =
      knownLabel ?? resolvedLabel ?? (detail.isFetching ? loadingMessage : placeholder);
  }

  const handleSelect = (option: ExerciseRefMasterSelectOption | null) => {
    setPicked(option);
    onChange(option);
  };

  return (
    <SearchableSelect<ExerciseRefMasterSelectOption>
      value={value}
      valueLabel={triggerLabel}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      loadingMessage={loadingMessage}
      clearLabel={clearLabel ?? undefined}
      open={isOpen}
      onOpenChange={setIsOpen}
      onSearchChange={setSearch}
      onSelect={handleSelect}
      getOptionKey={(option) => option.id}
      getOptionLabel={(option) => option.name}
      getOptionKeywords={(option) => [option.name, option.code].join(' ')}
      renderOption={(option) => (
        <TextWithTooltip
          text={option.name}
          wrapperClassName="min-w-0 flex-1"
          className="w-full"
          side="right"
          align="center"
        />
      )}
      isLoading={list.isFetching && !list.isFetchingNextPage}
      hasMore={list.hasNextPage}
      isLoadingMore={list.isFetchingNextPage}
      onLoadMore={() => void list.fetchNextPage()}
      loadingMoreMessage={loadingMoreMessage}
      loadMoreFailed={list.isFetchNextPageError}
      disabled={disabled}
      hasError={hasError}
      endIcon={endIcon}
      triggerClassName={triggerClassName}
      contentClassName={contentClassName}
    />
  );
}
