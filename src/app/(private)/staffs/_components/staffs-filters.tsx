'use client';

import { toSelectItems } from '@/utils/app.util';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';

import {
  PositionSelectInput,
  RoleSelectInput,
  StoreSelectInput,
} from '@/components/common/data-select-input';
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

import { STAFF_STATUS_LABELS, StaffStatus } from '../_constants/constants';
import { useStaffsFiltersContext } from '../_contexts/staffs-filters-context';

interface StaffsFiltersProps {
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  /** Hidden entirely when the header context is scoped to a single store (matches staff-list.tsx L439) */
  isSingleStoreContext?: boolean;
}

const ALL_STATUS_VALUE = '__all_status__';

/**
 * Applied-filter treatment for a select trigger — a control that is narrowing the list has to
 * be distinguishable from one still at its default (BUG-P2-01-09).
 */
const ACTIVE_TRIGGER_CLASS = 'border-primary bg-primary/5';

export function StaffsFilters({
  isFilterOpen,
  onFilterOpenChange,
  isSingleStoreContext = false,
}: StaffsFiltersProps) {
  const { filters, searchInput, setSearchInput, updateFilter, hasActiveFilters, clearFilters } =
    useStaffsFiltersContext();

  const activeFilterCount = [
    filters.role,
    filters.position,
    filters.store_id,
    filters.status,
  ].filter((v) => v !== null).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Search Row */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="relative max-w-[400px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="名前・メールアドレスで検索..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 rounded-lg pl-9"
          />
        </div>
        <Button
          variant={activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          className="h-9 gap-1.5"
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

      {/* Filter Row - Collapsible */}
      {isFilterOpen && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* ロール */}
            <RoleSelectInput
              value={filters.role}
              onChange={(role) => updateFilter('role', role)}
              triggerClassName={cn(
                'h-9 w-[160px] rounded-lg',
                filters.role !== null && ACTIVE_TRIGGER_CLASS,
              )}
            />

            {/* 職位 */}
            <PositionSelectInput
              value={filters.position}
              onChange={(position) => updateFilter('position', position?.positionId ?? null)}
              enabled={isFilterOpen}
              triggerClassName={cn(
                'h-9 min-w-[200px] rounded-lg',
                filters.position !== null && ACTIVE_TRIGGER_CLASS,
              )}
            />

            {/* 所属店舗 — header context が単一店舗スコープの場合は非表示 */}
            {!isSingleStoreContext && (
              <StoreSelectInput
                value={filters.store_id}
                onChange={(store) => updateFilter('store_id', store?.id ?? null)}
                enabled={isFilterOpen}
                searchable={false}
                triggerClassName={cn(
                  'h-9 w-[200px] rounded-lg text-sm',
                  filters.store_id !== null && ACTIVE_TRIGGER_CLASS,
                )}
              />
            )}

            {/* ステータス */}
            <Select
              value={filters.status ?? ALL_STATUS_VALUE}
              onValueChange={(value) => {
                const newValue = value ?? ALL_STATUS_VALUE;
                updateFilter(
                  'status',
                  newValue === ALL_STATUS_VALUE ? null : (newValue as StaffStatus),
                );
              }}
              items={toSelectItems([
                { value: ALL_STATUS_VALUE, label: '全ステータス' },
                ...Object.entries(STAFF_STATUS_LABELS).map(([value, label]) => ({ value, label })),
              ])}
            >
              <SelectTrigger
                className={cn(
                  'h-9 w-fit rounded-lg',
                  filters.status !== null && ACTIVE_TRIGGER_CLASS,
                )}
              >
                <SelectValue placeholder="全ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS_VALUE}>全ステータス</SelectItem>
                {Object.entries(STAFF_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* フィルタクリア */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              すべてクリア
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
