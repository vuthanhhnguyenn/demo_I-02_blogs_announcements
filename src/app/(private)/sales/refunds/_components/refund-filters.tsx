'use client';

import type { DateRange } from 'react-day-picker';

import { toSelectItems } from '@/utils/app.util';
import { format } from 'date-fns';
import { Search, X } from 'lucide-react';

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
  PAYMENT_METHOD_LABELS,
  REFUND_DISPLAY_STATUS_LABELS,
  type RefundDisplayStatus,
  type SalesPaymentMethod,
} from '../../_constants/sales-labels.constant';
import type { useRefundFilters } from '../_hooks/use-refund-filters.hook';
import {
  APPLICANT_ROLE_FILTER_LABELS,
  type ApplicantRole,
  REFUND_SEARCH_MAX_LENGTH,
} from '../_utils/refund-api.util';

const PAYMENT_METHOD_OPTIONS = [
  { value: 'all', label: '全決済手段' },
  ...Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label })),
];

const APPLICANT_ROLE_OPTIONS = [
  { value: 'all', label: '全ロール' },
  ...Object.entries(APPLICANT_ROLE_FILTER_LABELS).map(([value, label]) => ({ value, label })),
];

const STATUS_OPTIONS = [
  { value: 'all', label: '全ステータス' },
  ...Object.entries(REFUND_DISPLAY_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

interface RefundFiltersProps {
  filterState: ReturnType<typeof useRefundFilters>;
}

/**
 * FR-004-a / API-118 §5: free-text search (会員名・申請事由) + displayStatus (7) / payment method /
 * applicant role / 申請日 range filters for the refund queue.
 */
export function RefundFilters({ filterState }: Readonly<RefundFiltersProps>) {
  const { filters, setFilters, searchInput, setSearchInput, dateFrom, dateTo } = filterState;

  const dateRange: DateRange | undefined =
    dateFrom || dateTo
      ? {
          from: dateFrom ? new Date(dateFrom) : undefined,
          to: dateTo ? new Date(dateTo) : undefined,
        }
      : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative max-w-100 min-w-60 flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          className="pl-9 text-xs"
          // `q` (dev Swagger 2026-10-27): 会員名 / 申請事由 partial match, and a 4–36 char hex/dash
          // term matches the start of the application id. API-118 §5 does not list the id match yet
          // (ahead of spec)
          placeholder="会員名・返金事由で検索..."
          maxLength={REFUND_SEARCH_MAX_LENGTH}
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

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <DateRangePicker
          date={dateRange}
          placeholder="申請日で絞り込み"
          className="h-8 justify-start gap-2 px-3 text-xs font-normal"
          onDateChange={(range) =>
            setFilters({
              rf_date_from: range?.from ? toIsoDate(range.from) : null,
              rf_date_to: range?.to ? toIsoDate(range.to) : null,
              rf_page: 1,
            })
          }
        />

        <Select
          value={filters.rf_payment_method ?? 'all'}
          onValueChange={(value) =>
            setFilters({
              rf_payment_method: value === 'all' ? null : (value as SalesPaymentMethod),
              rf_page: 1,
            })
          }
          items={toSelectItems(PAYMENT_METHOD_OPTIONS)}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
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

        <Select
          value={filters.rf_applicant_role ?? 'all'}
          onValueChange={(value) =>
            setFilters({
              rf_applicant_role: value === 'all' ? null : (value as ApplicantRole),
              rf_page: 1,
            })
          }
          items={toSelectItems(APPLICANT_ROLE_OPTIONS)}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="全ロール" />
          </SelectTrigger>
          <SelectContent>
            {APPLICANT_ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.rf_status ?? 'all'}
          onValueChange={(value) =>
            setFilters({
              rf_status: value === 'all' ? null : (value as RefundDisplayStatus),
              rf_page: 1,
            })
          }
          items={toSelectItems(STATUS_OPTIONS)}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="全ステータス" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
