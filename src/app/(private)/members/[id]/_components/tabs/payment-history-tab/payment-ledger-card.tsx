'use client';

import { useCallback, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { PAGE_SIZE } from '@/constants/app.constants';
import { formatDate, formatYen } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { TablePagination } from '@/components/common/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import { adminMemberFinancialControllerPaymentsOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

import {
  getPaymentMethodShortLabel,
  getRefundMethodShortLabel,
} from '../../../_constants/payment-method';
import {
  PAYMENT_PERIOD_OPTIONS,
  type PaymentPeriod,
  type PaymentType,
  periodToRange,
} from './payment-period';

interface PaymentLedgerCardProps {
  readonly memberId: string;
  /** Period filter; held by the tab because it is shared with the payment summary */
  readonly period: PaymentPeriod;
  readonly onPeriodChange: (period: PaymentPeriod) => void;
  /** Window for the `custom` period; held by the tab for the same reason as `period` */
  readonly customRange?: DateRange;
  readonly onCustomRangeChange: (range: DateRange | undefined) => void;
  /** 種別 filter; held by the tab because it is shared with the payment summary */
  readonly type: PaymentType;
  readonly onTypeChange: (type: PaymentType) => void;
}

const TYPE_OPTIONS: Array<{ value: PaymentType; label: string }> = [
  { value: 'all', label: '全種別' },
  { value: 'payment', label: '売上' },
  { value: 'refund', label: '返金' },
];

export function PaymentLedgerCard({
  memberId,
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
  type,
  onTypeChange,
}: PaymentLedgerCardProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    ...adminMemberFinancialControllerPaymentsOptions({
      path: { memberId: memberId },
      // The real API takes a date window rather than the mock's named `period`.
      query: {
        page,
        limit: PAGE_SIZE,
        transactionType: type,
        ...periodToRange(period, customRange),
      },
    }),
    // Keep the previous results so changing period/type/page does not flash back to the skeleton
    placeholderData: keepPreviousData,
  });

  const handlePeriodChange = useCallback(
    (nextPeriod: PaymentPeriod | null) => {
      onPeriodChange(nextPeriod ?? 'all');
      setPage(1);
    },
    [onPeriodChange],
  );

  const handleCustomRangeChange = useCallback(
    (range: DateRange | undefined) => {
      onCustomRangeChange(range);
      setPage(1);
    },
    [onCustomRangeChange],
  );

  const handleTypeChange = useCallback(
    (nextType: PaymentType | null) => {
      onTypeChange(nextType ?? 'all');
      setPage(1);
    },
    [onTypeChange],
  );

  const rows = data?.items ?? [];

  // The period/type Selects live outside the boundary (usable even while Loading/Error).
  // `isEmpty` is derived from the whole query being absent (`!data`), not row count, so a
  // filter returning 0 rows shows the table's own empty row. See DataStateBoundary docs.
  const isEmpty = !data;
  const total = data?.pagination.totalItems ?? 0;
  const limit = data?.pagination.limit ?? PAGE_SIZE;
  const totalPages = Math.ceil(total / limit);
  // Old rows stay on screen while the next page / filter loads — dim them so they are not read
  // as the new result (tabs FR-006).
  const showOverlay = isFetching && !isLoading;
  // No row under the default filters means the member has no history at all; otherwise the
  // filters matched nothing.
  const emptyRowLabel =
    period === 'all' && type === 'all' ? '入出金履歴はありません' : '該当する履歴はありません';

  const formatAmount = useCallback((amount: number): string => {
    if (amount < 0) {
      return `-${formatYen(Math.abs(amount))}`;
    }
    return formatYen(amount);
  }, []);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">入出金明細</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={period}
              onValueChange={handlePeriodChange}
              items={PAYMENT_PERIOD_OPTIONS}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {PAYMENT_PERIOD_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {period === 'custom' && (
              <DateRangePicker
                date={customRange}
                placeholder="日付を選択"
                className="h-8 justify-start gap-2 px-3 text-xs font-normal"
                onDateChange={handleCustomRangeChange}
              />
            )}
            <Select value={type} onValueChange={handleTypeChange} items={TYPE_OPTIONS}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {TYPE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        onRetry={refetch}
        errorDescription={isError ? resolveApiErrorMessage(error) : undefined}
        emptyTitle="入出金履歴はありません"
        errorTitle="入出金明細の取得に失敗しました"
        skeleton={
          <div className="space-y-3 px-4 pb-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`payment-ledger-row-${index}`} className="h-9 w-full" />
            ))}
          </div>
        }
      >
        <div className="relative">
          {showOverlay && (
            <div className="bg-background/40 pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <LoaderCircle className="text-muted-foreground size-6 animate-spin" />
            </div>
          )}
          <Table size="md">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">日付</TableHead>
                <TableHead className="text-xs font-semibold">種別</TableHead>
                <TableHead className="text-xs font-semibold">内容</TableHead>
                <TableHead className="text-right text-xs font-semibold">金額</TableHead>
                <TableHead className="text-xs font-semibold">決済方法</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              className={cn('transition-opacity', showOverlay && 'opacity-50')}
              aria-busy={showOverlay}
            >
              {rows.length > 0 ? (
                rows.map((item) => {
                  const isRefund = item.transactionType === 'refund';
                  // A failed charge stays in the ledger (the API returns every attempt) but must
                  // not read as money received — 支払いサマリー counts successful payments only.
                  const isFailed = !isRefund && item.paymentStatus === 'failed';
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {formatDate(item.paidAt ?? item.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={isRefund ? 'secondary' : 'default'}
                            className="text-[10px]"
                          >
                            {isRefund ? '返金' : '売上'}
                          </Badge>
                          {isFailed && (
                            <Badge
                              variant="outline"
                              className="bg-destructive/15 text-destructive border-destructive/20 text-[10px]"
                            >
                              決済失敗
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {/* Long 内容 is clamped to two lines; the full text is on hover. */}
                      <TableCell className="w-full max-w-0 text-sm font-medium whitespace-normal">
                        <span
                          className="line-clamp-2 wrap-anywhere"
                          title={item.description ?? undefined}
                        >
                          {item.description ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right text-sm font-medium',
                          item.amount < 0 && 'text-destructive',
                          isFailed && 'text-muted-foreground line-through',
                        )}
                      >
                        {formatAmount(item.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground min-w-28 text-sm whitespace-normal">
                        {isRefund
                          ? getRefundMethodShortLabel(item.refundMethod)
                          : getPaymentMethodShortLabel(item.paymentMethod)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    {emptyRowLabel}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DataStateBoundary>
      {/* On an error the card shows only the error and its retry — the filters above are the
          way out, and a 0-count footer would describe data that never loaded. */}
      {!isError && (
        <CardContent className="px-0 py-0">
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            isLoading={isFetching}
            onPageChange={setPage}
          />
        </CardContent>
      )}
    </Card>
  );
}
