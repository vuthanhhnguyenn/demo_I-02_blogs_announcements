'use client';

import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { ChevronDownIcon } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';

import { adminStaffPermissionControllerListPositionsOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AdminStaffPermissionControllerListPositionsData,
  PositionListItemDto,
} from '@/lib/api-real/types.gen';

/** One position master row as served by `GET /api/v1/admin/positions`. */
export type PositionSelectOption = PositionListItemDto;

type PositionListQuery = NonNullable<AdminStaffPermissionControllerListPositionsData['query']>;

/** CRM role a position belongs to; narrows the master list server-side. */
export type PositionSelectRole = NonNullable<PositionListQuery['role']>;

// Mirrors the native `Select` trigger's chevron so a position picker sitting in a
// filter row alongside plain selects doesn't stand out.
const DEFAULT_END_ICON = <ChevronDownIcon className="text-muted-foreground ml-2 size-4 shrink-0" />;

// The master list is small and changes rarely; keep it warm across reopens.
const POSITION_CACHE_MS = 5 * 60 * 1000;

interface PositionSelectInputProps {
  /** Selected position id; `null` means nothing selected (i.e. the "all" state). */
  value: string | null;
  /** Fired with the picked position, or `null` when the "all" row is chosen. */
  onChange: (position: PositionSelectOption | null) => void;
  /** Restrict the offered positions to a single CRM role. */
  role?: PositionSelectRole;
  /**
   * Label of the leading "all" row, also shown on the trigger while nothing is
   * selected. Pass `null` to drop it — the field then has no way back to an empty
   * selection (required-field usage) and the trigger falls back to `placeholder`.
   */
  allLabel?: string | null;
  /** Trigger text while nothing is selected and there is no "all" row. */
  placeholder?: string;
  /** Placeholder of the search box. */
  searchPlaceholder?: string;
  /** Set false to drop the search box and offer the list as-is. */
  searchable?: boolean;
  /** Shown when the keyword matches no position. */
  emptyMessage?: string;
  /** Trigger text while the master list is in flight. */
  loadingPlaceholder?: string;
  /**
   * Label to show when `value` is set but matches no row of the loaded master —
   * the 「未割当」 positions, which `GET /admin/positions` excludes by contract
   * (it serves the 職位マスター screen and hides `isSystemManaged` rows). Without
   * it the trigger falls back to the placeholder, and `SearchableSelect` further
   * down to the raw UUID. See BUG-P2-03-01 / BUG-P2-03-04 (TC-030).
   */
  unlistedValueLabel?: string | null;
  /** Gate the network entirely — e.g. `false` while the filter panel is collapsed. */
  enabled?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
}

/**
 * Shared position (職位) picker over the position master, on top of
 * {@link SearchableSelect}.
 *
 * The endpoint returns every match unpaginated, so unlike `./store-select-input`
 * there is no infinite scroll and the 「職位を検索...」 box filters the loaded list
 * in place — no server round trip per keystroke.
 */
export function PositionSelectInput({
  value,
  onChange,
  role,
  allLabel = '全職位',
  placeholder = '全職位',
  searchPlaceholder = '職位を検索...',
  searchable = true,
  emptyMessage = '該当なし',
  loadingPlaceholder = '読み込み中…',
  unlistedValueLabel,
  enabled = true,
  disabled = false,
  hasError = false,
  // Matches the store picker sitting next to it in the スタッフ一覧 filter row.
  triggerClassName = 'h-9 w-[200px] rounded-lg text-sm',
  contentClassName,
}: PositionSelectInputProps) {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    ...adminStaffPermissionControllerListPositionsOptions(role ? { query: { role } } : undefined),
    enabled: enabled && !disabled,
    staleTime: POSITION_CACHE_MS,
  });

  const positions = useMemo(() => data?.items ?? [], [data]);

  const filteredPositions = useMemo(() => {
    const keyword = (searchable ? search : '').trim().toLowerCase();
    if (!keyword) return positions;
    return positions.filter((position) => position.name.toLowerCase().includes(keyword));
  }, [positions, search, searchable]);

  const selectedPosition = positions.find((position) => position.positionId === value) ?? null;

  const fallbackLabel = isLoading ? loadingPlaceholder : placeholder;
  // A selected id the master never returns (「未割当」) resolves to the caller-supplied
  // label rather than the placeholder — never to the id itself.
  const selectedLabel = isLoading
    ? loadingPlaceholder
    : (selectedPosition?.name ?? unlistedValueLabel ?? placeholder);
  // With nothing selected the trigger reads the "all" row's label when there is one —
  // a caller that drops it (e.g. 職位 while no ロール is picked) gets the placeholder.
  const triggerLabel = value ? selectedLabel : (allLabel ?? fallbackLabel);

  return (
    <SearchableSelect<PositionSelectOption>
      value={value}
      valueLabel={triggerLabel}
      options={filteredPositions}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      searchable={searchable}
      emptyMessage={emptyMessage}
      loadingMessage={loadingPlaceholder}
      clearLabel={allLabel ?? undefined}
      onSearchChange={setSearch}
      onSelect={onChange}
      getOptionKey={(position) => position.positionId}
      getOptionLabel={(position) => position.name}
      isLoading={isLoading}
      disabled={disabled}
      hasError={hasError}
      endIcon={DEFAULT_END_ICON}
      triggerClassName={triggerClassName}
      contentClassName={contentClassName}
    />
  );
}
