'use client';

import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';

import { BRAND_ENUM_LABELS, type BrandEnumValue } from '@/components/common/brand-badge';
import { StoreSelectInput, useStoreLabel } from '@/components/common/data-select-input';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { cn } from '@/lib/utils';

import {
  OPTION_LIST_STATUS_LABELS,
  OPTION_LIST_TYPE_LABELS,
  OPTION_PRORATED_FILTER_LABELS,
  OPTION_SUBCATEGORY_LABELS,
  type OptionListStatusFilter,
} from '../_constants/constants';
import { useOptionsFiltersContext } from '../_contexts/options-filters-context';
import type { OptionsFiltersState } from '../_hooks/use-options-filters';

// Prototype treatment for a non-default select (option-list.tsx `filterActiveClass`).
const ACTIVE_FILTER_CLASS = 'border-primary bg-primary/10 text-foreground';

interface OptionsFiltersProps {
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  /** Total count before filtering — banner baseline. */
  totalCount: number;
  /** Count after filtering. */
  filteredCount: number;
}

export function OptionsFilters({
  isFilterOpen,
  onFilterOpenChange,
  totalCount,
  filteredCount,
}: Readonly<OptionsFiltersProps>) {
  const { filters, searchInput, setSearchInput, updateFilter, hasActiveFilters, clearFilters } =
    useOptionsFiltersContext();

  // Resolved even while the panel is collapsed so the result banner can name the store.
  const { label: selectedStoreLabel } = useStoreLabel(filters.store_id);

  const activeFilterCount = [
    filters.brand !== null,
    filters.option_type !== null,
    filters.subcategory !== null,
    filters.status !== null,
    filters.prorated_enabled !== null,
    filters.store_id !== null,
  ].filter(Boolean).length;

  const filterSummary = [
    // The applied keyword, not the raw input — it has to describe the counts next to it.
    filters.search ? `"${filters.search}"` : '',
    filters.brand ? BRAND_ENUM_LABELS[filters.brand] : '',
    filters.option_type ? OPTION_LIST_TYPE_LABELS[filters.option_type] : '',
    filters.subcategory ? OPTION_SUBCATEGORY_LABELS[filters.subcategory] : '',
    filters.status ? OPTION_LIST_STATUS_LABELS[filters.status] : '',
    filters.prorated_enabled ? OPTION_PRORATED_FILTER_LABELS[filters.prorated_enabled] : '',
    filters.store_id ? (selectedStoreLabel ?? '') : '',
  ].filter(Boolean);

  return (
    <>
      <div className="flex flex-col gap-4 p-3 pb-0">
        <div className="flex items-center gap-2">
          <div className="relative max-w-100 flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="オプション名で検索"
              // API-085 `keyword` caps at 50 characters.
              maxLength={50}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 rounded-lg pl-9 text-xs"
            />
          </div>
          <Button
            variant={activeFilterCount > 0 ? 'default' : 'outline'}
            size="sm"
            className="ml-auto h-8 gap-1.5 text-xs"
            onClick={() => onFilterOpenChange(!isFilterOpen)}
          >
            <SlidersHorizontal className="size-4" />
            {isFilterOpen ? '閉じる' : '詳細フィルター'}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 px-1 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
            {isFilterOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        </div>

        {isFilterOpen && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Brand */}
            <Select
              value={filters.brand ?? 'all'}
              onValueChange={(v) =>
                updateFilter('brand', v === 'all' ? null : (v as BrandEnumValue))
              }
            >
              <SelectTrigger
                size="sm"
                className={cn('w-fit rounded-lg', filters.brand && ACTIVE_FILTER_CLASS)}
              >
                <SelectValue placeholder="全ブランド">
                  {filters.brand ? BRAND_ENUM_LABELS[filters.brand] : '全ブランド'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ブランド</SelectItem>
                {(Object.keys(BRAND_ENUM_LABELS) as BrandEnumValue[]).map((b) => (
                  <SelectItem key={b} value={b}>
                    {BRAND_ENUM_LABELS[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Option Type */}
            <Select
              value={filters.option_type ?? 'all'}
              onValueChange={(v) =>
                updateFilter(
                  'option_type',
                  v === 'all' ? null : (v as OptionsFiltersState['option_type']),
                )
              }
            >
              <SelectTrigger
                size="sm"
                className={cn('w-fit rounded-lg', filters.option_type && ACTIVE_FILTER_CLASS)}
              >
                <SelectValue placeholder="全種別">
                  {filters.option_type ? OPTION_LIST_TYPE_LABELS[filters.option_type] : '全種別'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全種別</SelectItem>
                {(
                  Object.keys(OPTION_LIST_TYPE_LABELS) as Array<
                    keyof typeof OPTION_LIST_TYPE_LABELS
                  >
                ).map((t) => (
                  <SelectItem key={t} value={t}>
                    {OPTION_LIST_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Service type — G-02 FR-S001; not in the prototype yet (prototype-gap-list #13) */}
            <Select
              value={filters.subcategory ?? 'all'}
              onValueChange={(v) =>
                updateFilter(
                  'subcategory',
                  v === 'all' ? null : (v as OptionsFiltersState['subcategory']),
                )
              }
            >
              <SelectTrigger
                size="sm"
                className={cn('w-fit rounded-lg', filters.subcategory && ACTIVE_FILTER_CLASS)}
              >
                <SelectValue placeholder="全サービス種別">
                  {filters.subcategory
                    ? OPTION_SUBCATEGORY_LABELS[filters.subcategory]
                    : '全サービス種別'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全サービス種別</SelectItem>
                {(
                  Object.keys(OPTION_SUBCATEGORY_LABELS) as Array<
                    keyof typeof OPTION_SUBCATEGORY_LABELS
                  >
                ).map((s) => (
                  <SelectItem key={s} value={s}>
                    {OPTION_SUBCATEGORY_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select
              value={filters.status ?? 'all'}
              onValueChange={(v) =>
                updateFilter('status', v === 'all' ? null : (v as OptionListStatusFilter))
              }
            >
              <SelectTrigger
                size="sm"
                className={cn('w-fit rounded-lg', filters.status && ACTIVE_FILTER_CLASS)}
              >
                <SelectValue placeholder="全ステータス">
                  {filters.status ? OPTION_LIST_STATUS_LABELS[filters.status] : '全ステータス'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ステータス</SelectItem>
                {(Object.keys(OPTION_LIST_STATUS_LABELS) as OptionListStatusFilter[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {OPTION_LIST_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Proration flag */}
            <Select
              value={filters.prorated_enabled ?? 'all'}
              onValueChange={(v) =>
                updateFilter(
                  'prorated_enabled',
                  v === 'all' ? null : (v as OptionsFiltersState['prorated_enabled']),
                )
              }
            >
              <SelectTrigger
                size="sm"
                className={cn('w-fit rounded-lg', filters.prorated_enabled && ACTIVE_FILTER_CLASS)}
              >
                <SelectValue placeholder="日割り: すべて">
                  {filters.prorated_enabled
                    ? OPTION_PRORATED_FILTER_LABELS[filters.prorated_enabled]
                    : '日割り: すべて'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">日割り: すべて</SelectItem>
                {(Object.keys(OPTION_PRORATED_FILTER_LABELS) as Array<'true' | 'false'>).map(
                  (value) => (
                    <SelectItem key={value} value={value}>
                      {OPTION_PRORATED_FILTER_LABELS[value]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>

            {/* Store */}
            <StoreSelectInput
              value={filters.store_id}
              valueLabel={selectedStoreLabel}
              onChange={(store) => updateFilter('store_id', store?.id ?? null)}
              enabled={isFilterOpen}
              triggerClassName={cn(
                'h-8 w-64 justify-between rounded-lg px-3 text-xs font-normal',
                filters.store_id && ACTIVE_FILTER_CLASS,
              )}
            />

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground ml-auto h-8 text-xs"
                onClick={clearFilters}
              >
                すべてクリア
              </Button>
            )}
          </div>
        )}
      </div>

      <FilterResultBanner
        show={hasActiveFilters}
        totalCount={totalCount}
        filteredCount={filteredCount}
        filterSummary={filterSummary}
        onClear={clearFilters}
      />
    </>
  );
}
