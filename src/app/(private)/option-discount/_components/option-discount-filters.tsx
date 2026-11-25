'use client';

import { Search } from 'lucide-react';

import { FilterResultBanner } from '@/components/common/filter-result-banner';
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
  OPTION_DISCOUNT_STATUS_LABELS,
  OPTION_DISCOUNT_TYPE_LABELS,
  type OptionSetDiscountType,
  type OptionSetStatus,
} from '../_constants/constants';
import { useOptionDiscountFiltersContext } from '../_contexts/option-discount-filters-context';

interface OptionDiscountFiltersProps {
  /** Count before search/filters — the banner's 「全N件中」. */
  totalCount: number;
  filteredCount: number;
}

const ACTIVE_FILTER_CLASS = 'border-primary bg-primary/10 text-foreground';

export function OptionDiscountFilters({ totalCount, filteredCount }: OptionDiscountFiltersProps) {
  const { filters, searchInput, setSearchInput, updateFilter, hasActiveFilters, clearFilters } =
    useOptionDiscountFiltersContext();

  const filterSummary = [
    filters.discount_type ? OPTION_DISCOUNT_TYPE_LABELS[filters.discount_type] : '',
    filters.status ? OPTION_DISCOUNT_STATUS_LABELS[filters.status] : '',
  ];

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="relative max-w-100 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="セット割名で検索..."
            // The API's `keyword` caps at 50 characters (longer answers 400).
            maxLength={50}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-8 rounded-lg pl-9 text-xs"
          />
        </div>

        {/* Prototype A8: two filters or fewer stay expanded — no collapsible panel. */}
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={filters.discount_type ?? 'all'}
            onValueChange={(value) =>
              updateFilter(
                'discount_type',
                value === 'all' ? null : (value as OptionSetDiscountType),
              )
            }
          >
            <SelectTrigger
              size="sm"
              className={cn(
                'w-35 rounded-lg text-xs',
                filters.discount_type && ACTIVE_FILTER_CLASS,
              )}
            >
              <SelectValue placeholder="全タイプ">
                {filters.discount_type
                  ? OPTION_DISCOUNT_TYPE_LABELS[filters.discount_type]
                  : '全タイプ'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全タイプ</SelectItem>
              {Object.entries(OPTION_DISCOUNT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status ?? 'all'}
            onValueChange={(value) =>
              updateFilter('status', value === 'all' ? null : (value as OptionSetStatus))
            }
          >
            <SelectTrigger
              size="sm"
              className={cn('w-35 rounded-lg text-xs', filters.status && ACTIVE_FILTER_CLASS)}
            >
              <SelectValue placeholder="全ステータス">
                {filters.status ? OPTION_DISCOUNT_STATUS_LABELS[filters.status] : '全ステータス'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全ステータス</SelectItem>
              {Object.entries(OPTION_DISCOUNT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
