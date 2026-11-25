'use client';

import { useState } from 'react';

import { toSelectItems } from '@/utils/app.util';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from 'lucide-react';

import { StoreSelectInput } from '@/components/common/data-select-input/store-select-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import { BILLING_TYPE_LABELS, type BillingType } from '../_constants/sales-labels.constant';
import type { SalesConfirmFilter, useSalesFilters } from '../_hooks/use-sales-filters.hook';

const CONFIRMATION_STATUS_OPTIONS = [
  { value: 'all', label: '全ステータス' },
  { value: 'confirmed', label: '確定済' },
  { value: 'unconfirmed', label: '未確定' },
];

function filterActiveClass(isActive: boolean) {
  return isActive ? 'border-primary bg-primary/10 text-foreground' : '';
}

interface SalesFiltersProps {
  filterState: ReturnType<typeof useSalesFilters>;
}

export function SalesFilters({ filterState }: Readonly<SalesFiltersProps>) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { filters, setFilters, searchInput, setSearchInput, activeFilterCount, showStoreFilter } =
    filterState;

  const billingTypeSelectOptions = [
    { value: 'all', label: '全請求区分' },
    ...Object.entries(BILLING_TYPE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative max-w-100 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9 text-xs"
            placeholder="請求ID・利用者名で検索..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className="absolute top-1/2 right-3 -translate-y-1/2"
              onClick={() => setSearchInput('')}
            >
              <X className="text-muted-foreground size-3" />
            </button>
          )}
        </div>
        <Button
          variant={activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          className="ml-auto h-8 gap-1 text-xs"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
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
        <div className="flex items-center gap-2">
          <Select
            value={filters.sf_confirmation_status ?? 'all'}
            onValueChange={(value) =>
              setFilters({
                sf_confirmation_status: value === 'all' ? null : (value as SalesConfirmFilter),
              })
            }
            items={toSelectItems(CONFIRMATION_STATUS_OPTIONS)}
          >
            <SelectTrigger
              className={`h-8 w-35 text-xs ${filterActiveClass(filters.sf_confirmation_status != null)}`}
            >
              <SelectValue placeholder="全ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全ステータス</SelectItem>
              <SelectItem value="confirmed">確定済</SelectItem>
              <SelectItem value="unconfirmed">未確定</SelectItem>
            </SelectContent>
          </Select>

          {/* A specific header store decides the scope; the 店舗 filter applies under 全店舗 only */}
          {showStoreFilter && (
            // Server search + paged scroll: 300+ stores do not fit one API-111 page (max 100)
            <StoreSelectInput
              value={filters.sf_store_id}
              onChange={(store) => setFilters({ sf_store_id: store?.id ?? null })}
              enabled={isFilterOpen}
              triggerClassName={`h-8 w-40 justify-between text-xs font-normal ${filterActiveClass(filters.sf_store_id != null)}`}
            />
          )}

          <Select
            value={filters.sf_billing_type ?? 'all'}
            onValueChange={(value) =>
              setFilters({
                sf_billing_type: value === 'all' ? null : (value as BillingType),
              })
            }
            items={toSelectItems(billingTypeSelectOptions)}
          >
            <SelectTrigger
              className={`h-8 w-35 text-xs ${filterActiveClass(filters.sf_billing_type != null)}`}
            >
              <SelectValue placeholder="全請求区分" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全請求区分</SelectItem>
              {Object.entries(BILLING_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="mx-1 h-5 self-center!" />
          <label
            htmlFor="sales-unpaid-only"
            className="flex cursor-pointer items-center gap-2 text-xs"
          >
            <Checkbox
              id="sales-unpaid-only"
              className="size-4"
              checked={filters.sf_unpaid_only}
              onCheckedChange={(checked) => setFilters({ sf_unpaid_only: checked === true })}
            />
            未納のみ
          </label>
        </div>
      )}
    </div>
  );
}
