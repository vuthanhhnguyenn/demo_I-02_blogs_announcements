'use client';

import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { toSelectItems } from '@/utils/app.util';
import { parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';

import { StoreSelectInput } from '@/components/common/data-select-input/store-select-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  TRANSACTION_SEARCH_MAX_LENGTH,
  type useTransactionsFilters,
} from '../_hooks/use-transactions-filters.hook';
import {
  TRANSACTION_MAX_RANGE_MONTHS,
  TRANSACTION_PAYMENT_METHOD_VALUES,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_VALUES,
  exceedsTransactionRange,
  getTransactionPaymentMethodLabel,
  toIsoDate,
} from '../_utils/transaction-labels.util';

const TRANSACTION_TYPE_OPTIONS = [
  { value: 'all', label: '全種別' },
  ...TRANSACTION_TYPE_VALUES.map((value) => ({ value, label: TRANSACTION_TYPE_LABELS[value] })),
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'all', label: '全決済手段' },
  ...TRANSACTION_PAYMENT_METHOD_VALUES.map((value) => ({
    value,
    label: getTransactionPaymentMethodLabel(value),
  })),
];

function filterActiveClass(isActive: boolean) {
  return isActive ? 'border-primary bg-primary/10 text-foreground' : '';
}

interface TransactionsFiltersProps {
  filterState: ReturnType<typeof useTransactionsFilters>;
}

export function TransactionsFilters({ filterState }: Readonly<TransactionsFiltersProps>) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { filters, setFilters, searchInput, setSearchInput, activeFilterCount, showStoreFilter } =
    filterState;

  // D3: the picker always shows the window actually queried (default = month start → today)
  const dateRange: DateRange = {
    from: parseISO(filterState.dateRange.fromDate),
    to: parseISO(filterState.dateRange.toDate),
  };

  const handleDateChange = (range: DateRange | undefined) => {
    // D3: block ranges over 12 months (API-116 §7.3 E-TXN-003) before they reach the URL
    if (range?.from && range.to && exceedsTransactionRange(range.from, range.to)) {
      toast.error(`取引日の期間は${TRANSACTION_MAX_RANGE_MONTHS}ヶ月以内で指定してください`);
      return;
    }
    setFilters({
      tf_date_from: range?.from ? toIsoDate(range.from) : null,
      tf_date_to: range?.to ? toIsoDate(range.to) : null,
      tf_page: 1,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="会員ID・氏名で検索..."
            className="h-8 pl-8 text-sm"
            maxLength={TRANSACTION_SEARCH_MAX_LENGTH}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <Button
          variant={activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          className="ml-auto h-8 gap-1 text-xs"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          <SlidersHorizontal className="size-3" />
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
          <DateRangePicker
            date={dateRange}
            placeholder="取引日で絞り込み"
            className={`h-8 justify-start gap-2 px-3 text-xs font-normal ${filterActiveClass(
              Boolean(filters.tf_date_from || filters.tf_date_to),
            )}`}
            onDateChange={handleDateChange}
          />

          {/* A specific header store decides the scope; the 店舗 filter applies under 全店舗 only */}
          {showStoreFilter && (
            // Server search + paged scroll: 300+ stores do not fit one API-111 page (max 100)
            <StoreSelectInput
              value={filters.tf_store_id}
              onChange={(store) => setFilters({ tf_store_id: store?.id ?? null, tf_page: 1 })}
              enabled={isFilterOpen}
              triggerClassName={`h-8 w-40 justify-between text-xs font-normal ${filterActiveClass(filters.tf_store_id != null)}`}
            />
          )}

          <Select
            value={filters.tf_transaction_type ?? 'all'}
            onValueChange={(value) =>
              setFilters({
                tf_transaction_type:
                  value === 'all'
                    ? null
                    : (value as NonNullable<typeof filters.tf_transaction_type>),
                tf_page: 1,
              })
            }
            items={toSelectItems(TRANSACTION_TYPE_OPTIONS)}
          >
            <SelectTrigger
              className={`h-8 w-30 text-xs ${filterActiveClass(filters.tf_transaction_type != null)}`}
            >
              <SelectValue placeholder="全種別" />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.tf_payment_method ?? 'all'}
            onValueChange={(value) =>
              setFilters({
                tf_payment_method:
                  value === 'all' ? null : (value as NonNullable<typeof filters.tf_payment_method>),
                tf_page: 1,
              })
            }
            items={toSelectItems(PAYMENT_METHOD_OPTIONS)}
          >
            <SelectTrigger
              className={`h-8 w-44 text-xs ${filterActiveClass(filters.tf_payment_method != null)}`}
            >
              <SelectValue placeholder="全決済手段" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground ml-auto h-8 text-xs"
            onClick={filterState.clearFilters}
            disabled={activeFilterCount === 0 && !searchInput}
          >
            <X className="mr-1 size-3" />
            すべてクリア
          </Button>
        </div>
      )}
    </div>
  );
}
