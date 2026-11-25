'use client';

import { type ReactNode, useMemo, useState } from 'react';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronDownIcon } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';

import {
  adminFcCompanyControllerDetailOptions,
  adminFcCompanyControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AdminFcCompanyControllerListData,
  FcCompanyListResponseDto,
  FcCompanySummaryDto,
} from '@/lib/api-real/types.gen';

/** One FC company row as served by `GET /api/v1/admin/fc-companies`. */
export type FcCompanySelectOption = FcCompanySummaryDto;

type FcCompanyListQuery = NonNullable<AdminFcCompanyControllerListData['query']>;

/**
 * A row that is not an FC company but sits above the catalog — e.g. the store list's 直営
 * filter value (`fcCompanyId=direct`). Emitted through `onChange` like any other row.
 */
export interface FcCompanyPinnedOption {
  id: string;
  label: string;
}

type FcCompanySelectRow = FcCompanySelectOption | FcCompanyPinnedOption;

function isPinnedRow(row: FcCompanySelectRow): row is FcCompanyPinnedOption {
  return 'label' in row;
}

/** Server-side narrowing applied to the catalog before it is offered for selection. */
export type FcCompanySelectQueryFilters = Pick<FcCompanyListQuery, 'managementType' | 'isActive'>;

// Mirrors the native `Select` trigger's chevron so an FC-company picker sitting in
// a filter row alongside plain selects doesn't stand out.
const DEFAULT_END_ICON = <ChevronDownIcon className="text-muted-foreground ml-2 size-4 shrink-0" />;

const FC_COMPANY_PAGE_SIZE = 20;
// Keep results warm across popover reopens so the first page isn't refetched every time.
const FC_COMPANY_CACHE_MS = 5 * 60 * 1000;

function formatFcCompanyLabel(fcCompany: Pick<FcCompanySummaryDto, 'displayName'>): string {
  return fcCompany.displayName;
}

function formatRowLabel(row: FcCompanySelectRow): string {
  return isPinnedRow(row) ? row.label : formatFcCompanyLabel(row);
}

/**
 * Resolves an FC company id to its display label (with managed-store count) via
 * the detail endpoint.
 *
 * Used for selections that aren't on a loaded page — e.g. an `fc_company_id`
 * restored from the URL before the dropdown has ever been opened.
 */
export function useFcCompanyLabel(
  fcCompanyId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const enabled = (options?.enabled ?? true) && !!fcCompanyId;

  const { data, isFetching } = useQuery({
    ...adminFcCompanyControllerDetailOptions({ path: { id: fcCompanyId ?? '' } }),
    enabled,
    // A denied or deleted FC company shouldn't retry — the caller falls back to a placeholder.
    retry: false,
    staleTime: FC_COMPANY_CACHE_MS,
  });

  return {
    label: fcCompanyId && data ? formatFcCompanyLabel(data) : null,
    isLoading: enabled && isFetching,
  };
}

interface FcCompanySelectInputProps {
  /** Selected FC company id; `null` means nothing selected (i.e. the clear/"all" state). */
  value: string | null;
  /** Fired with the picked FC company (or pinned row), or `null` when the clear row is chosen. */
  onChange: (fcCompany: FcCompanySelectRow | null) => void;
  /**
   * Trigger label for the current selection. Provide it when the caller already
   * knows the name; otherwise it is resolved on demand via {@link useFcCompanyLabel}.
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
  queryFilters?: FcCompanySelectQueryFilters;
  /** Rows offered above the catalog while no keyword is typed — see {@link FcCompanyPinnedOption}. */
  pinnedOptions?: readonly FcCompanyPinnedOption[];
  /**
   * Drop 直営 companies (`managementType: 'direct_management'`) from the offered list —
   * for the 所属FC企業 pickers, where only a real FC company is a valid affiliation.
   */
  excludeDirectManagement?: boolean;
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
 * Shared FC company (FC企業) picker: server-side keyword search + infinite scroll
 * over the FC company master, on top of {@link SearchableSelect}. Fetches only
 * while the dropdown is open, so mounting one is cheap. Mirrors `./store-select-input`.
 */
export function FcCompanySelectInput({
  value,
  onChange,
  valueLabel,
  placeholder = '全FC企業',
  searchPlaceholder = '会社名で検索...',
  searchable = true,
  emptyMessage = '該当するFC企業がありません',
  loadingMessage = 'FC企業を読み込み中...',
  loadingMoreMessage = '読み込み中...',
  clearLabel = '全FC企業',
  queryFilters,
  pinnedOptions,
  excludeDirectManagement = false,
  pageSize = FC_COMPANY_PAGE_SIZE,
  enabled = true,
  disabled = false,
  hasError = false,
  endIcon = DEFAULT_END_ICON,
  triggerClassName,
  contentClassName,
}: FcCompanySelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  // Remember the picked row so the trigger keeps its label after the list unmounts.
  const [pickedFcCompany, setPickedFcCompany] = useState<FcCompanySelectRow | null>(null);

  const canFetch = enabled && !disabled;

  const { data, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    ...adminFcCompanyControllerListInfiniteOptions({
      query: {
        limit: pageSize,
        keyword: (searchable && search) || undefined,
        sort: 'legalName',
        order: 'asc',
        ...queryFilters,
      },
    }),
    enabled: canFetch && isOpen,
    staleTime: FC_COMPANY_CACHE_MS,
    initialPageParam: 1,
    getNextPageParam: (lastPage: FcCompanyListResponseDto) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const fcCompanies = useMemo(() => {
    const loaded = data?.pages.flatMap((page) => page.items ?? []) ?? [];
    if (!excludeDirectManagement) return loaded;
    // TODO(BE): drop this client-side pass once `GET /admin/fc-companies` can filter on
    // several `managementType` values in one query — a valid FC affiliation is
    // `franchise` **or** `entrustment`, which today's single-valued param cannot express.
    // Request written up in NG-BUG-FIX-PLAN-phase2.md §8.4 (bugs BUG-P2-02-06 / BUG-P2-03-08).
    // Until then `pagination.totalItems` overcounts the offered rows and a page may come
    // back empty after filtering — infinite scroll still pulls the next one, so it can't stall.
    return loaded.filter((fcCompany) => fcCompany.managementType !== 'direct_management');
  }, [data, excludeDirectManagement]);

  // A keyword is a search of the FC master, which the pinned rows are not part of
  const rows = useMemo<FcCompanySelectRow[]>(
    () => (pinnedOptions?.length && !search ? [...pinnedOptions, ...fcCompanies] : fcCompanies),
    [pinnedOptions, search, fcCompanies],
  );

  // Prefer a caller-supplied label, then the row the user just picked, then the
  // loaded page — and only fall back to a lookup when none of those know the name.
  const knownLabel =
    valueLabel ??
    pinnedOptions?.find((option) => option.id === value)?.label ??
    (pickedFcCompany?.id === value ? formatRowLabel(pickedFcCompany) : undefined) ??
    (() => {
      const found = fcCompanies.find((fcCompany) => fcCompany.id === value);
      return found ? formatFcCompanyLabel(found) : undefined;
    })();

  const { label: resolvedLabel, isLoading: isResolvingLabel } = useFcCompanyLabel(value, {
    enabled: canFetch && !knownLabel,
  });

  let triggerLabel = placeholder;
  if (value) {
    triggerLabel = knownLabel ?? resolvedLabel ?? (isResolvingLabel ? loadingMessage : placeholder);
  }

  const handleSelect = (fcCompany: FcCompanySelectRow | null) => {
    setPickedFcCompany(fcCompany);
    onChange(fcCompany);
  };

  return (
    <SearchableSelect<FcCompanySelectRow>
      value={value}
      valueLabel={triggerLabel}
      options={rows}
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
      getOptionKey={(row) => row.id}
      getOptionLabel={formatRowLabel}
      getOptionKeywords={(row) =>
        isPinnedRow(row)
          ? row.label
          : [row.displayName, row.legalName, row.id].filter(Boolean).join(' ')
      }
      renderOption={(fcCompany) =>
        isPinnedRow(fcCompany) ? (
          <span className="block min-w-0 flex-1 truncate">{fcCompany.label}</span>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TextWithTooltip
              text={fcCompany.displayName}
              wrapperClassName="min-w-0 flex-1"
              className="w-full"
              side="right"
              align="center"
            />
            <span className="text-muted-foreground shrink-0 text-[10px]">
              管轄{fcCompany.managedStoreCount}店舗
            </span>
          </div>
        )
      }
      isLoading={isFetching && !isFetchingNextPage}
      hasMore={hasNextPage}
      isLoadingMore={isFetchingNextPage}
      onLoadMore={fetchNextPage}
      loadingMoreMessage={loadingMoreMessage}
      disabled={disabled}
      hasError={hasError}
      endIcon={endIcon}
      triggerClassName={triggerClassName}
      contentClassName={contentClassName}
    />
  );
}
