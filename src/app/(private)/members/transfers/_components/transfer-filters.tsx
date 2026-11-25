'use client';

import { toSelectItems } from '@/utils/app.util';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';

import { StoreSelectInput } from '@/components/common/data-select-input/store-select-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  ALL_OPTION_VALUE,
  TRANSFER_APPLIED_PERIOD_OPTIONS,
  TRANSFER_AUTO_OPTIONS,
  TRANSFER_BRAND_OPTIONS,
  TRANSFER_STATUS_OPTIONS,
} from '../_constants/constants';
import { useTransferFiltersContext } from '../_contexts/transfer-filters-context';

function filterActiveClass(isActive: boolean) {
  return isActive ? 'border-primary bg-primary/10 text-foreground' : '';
}

interface TransferFiltersProps {
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
}

export function TransferFilters({
  isFilterOpen,
  onFilterOpenChange,
}: Readonly<TransferFiltersProps>) {
  const { filters, updateFilter, activeFilterCount } = useTransferFiltersContext();

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar row */}
      <div className="flex items-center gap-2">
        {/* Free-word search is out of Phase 1 scope — the prototype narrows by filters only. */}
        <Button
          variant={activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          className="h-8 gap-1 text-xs"
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

      {/* Expandable filter bar — six controls in V0 order */}
      {isFilterOpen && (
        <div className="flex flex-wrap items-center gap-2">
          {/* ステータス */}
          <Select
            value={filters.status ?? ALL_OPTION_VALUE}
            onValueChange={(v) =>
              updateFilter('status', v === ALL_OPTION_VALUE ? null : (v as typeof filters.status))
            }
            items={toSelectItems(TRANSFER_STATUS_OPTIONS)}
          >
            <SelectTrigger
              className={`h-8 w-[140px] text-xs ${filterActiveClass(filters.status !== null)}`}
            >
              <SelectValue placeholder="全ステータス" />
            </SelectTrigger>
            <SelectContent>
              {TRANSFER_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 移籍元店舗 */}
          <StoreSelectInput
            value={filters.from_store_id}
            onChange={(store) => updateFilter('from_store_id', store?.id ?? null)}
            placeholder="全店舗（移籍元）"
            clearLabel="全店舗（移籍元）"
            triggerClassName={`h-8 w-[160px] text-xs ${filterActiveClass(filters.from_store_id !== null)}`}
            contentClassName="min-w-[280px]"
          />

          {/* 移籍先店舗 */}
          <StoreSelectInput
            value={filters.to_store_id}
            onChange={(store) => updateFilter('to_store_id', store?.id ?? null)}
            placeholder="全店舗（移籍先）"
            clearLabel="全店舗（移籍先）"
            triggerClassName={`h-8 w-[160px] text-xs ${filterActiveClass(filters.to_store_id !== null)}`}
            contentClassName="min-w-[280px]"
          />

          {/* ブランド */}
          <Select
            value={filters.brand ?? ALL_OPTION_VALUE}
            onValueChange={(v) =>
              updateFilter('brand', v === ALL_OPTION_VALUE ? null : (v as typeof filters.brand))
            }
            items={toSelectItems(TRANSFER_BRAND_OPTIONS)}
          >
            <SelectTrigger
              className={`h-8 w-[130px] text-xs ${filterActiveClass(filters.brand !== null)}`}
            >
              <SelectValue placeholder="全ブランド" />
            </SelectTrigger>
            <SelectContent>
              {TRANSFER_BRAND_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value} className="text-xs">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 申請日 */}
          <Select
            value={filters.applied_period ?? ALL_OPTION_VALUE}
            onValueChange={(v) =>
              updateFilter(
                'applied_period',
                v === ALL_OPTION_VALUE ? null : (v as typeof filters.applied_period),
              )
            }
            items={toSelectItems(TRANSFER_APPLIED_PERIOD_OPTIONS)}
          >
            <SelectTrigger
              className={`h-8 w-[120px] text-xs ${filterActiveClass(filters.applied_period !== null)}`}
            >
              <SelectValue placeholder="全期間" />
            </SelectTrigger>
            <SelectContent>
              {TRANSFER_APPLIED_PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 自動移籍 */}
          <Select
            value={filters.auto_transfer ?? ALL_OPTION_VALUE}
            onValueChange={(v) =>
              updateFilter(
                'auto_transfer',
                v === ALL_OPTION_VALUE ? null : (v as typeof filters.auto_transfer),
              )
            }
            items={toSelectItems(TRANSFER_AUTO_OPTIONS)}
          >
            <SelectTrigger
              className={`h-8 w-[140px] text-xs ${filterActiveClass(filters.auto_transfer !== null)}`}
            >
              <SelectValue placeholder="自動移籍: すべて" />
            </SelectTrigger>
            <SelectContent>
              {TRANSFER_AUTO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
