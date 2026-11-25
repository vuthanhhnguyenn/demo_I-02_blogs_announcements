'use client';

import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { PAGE_SIZE } from '@/constants/app.constants';
import { formatISODateLocal } from '@/utils/date.util';
import { formatDate } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, LoaderCircle } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { MonthPicker } from '@/components/common/month-picker';
import { TablePagination } from '@/components/common/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { adminMemberFinancialControllerPointsOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { MemberDetailDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { currentYearMonth, monthToRange } from '../../../_utils/month-range';

type PointKind = '獲得' | '消費';
type SortColumn = 'date' | 'kind';
type SortOrder = 'asc' | 'desc';
type FilterMode = 'month' | 'custom';

const FILTER_MODE_OPTIONS: Array<{ value: FilterMode; label: string }> = [
  { value: 'month', label: '月次' },
  { value: 'custom', label: '期間指定' },
];

// Server sort keys behind the two sortable columns. 種別 rides on `points` because the column is
// the sign of the delta: every 消費 is negative and every 獲得 is not, so ordering by `points`
// groups the two kinds without a dedicated key. Inside one kind the rows then follow the amount —
// the API has no kind key to sort by kind first and date second.
const SORT_KEY: Record<SortColumn, 'createdAt' | 'points'> = {
  date: 'createdAt',
  kind: 'points',
};

// 種別 ascending lists 獲得 first (PO 2026-09-29), i.e. the largest `points` first, so the server
// order is the reverse of the column's.
function toServerOrder(column: SortColumn, order: SortOrder): SortOrder {
  if (column === 'date') return order;
  return order === 'asc' ? 'desc' : 'asc';
}

interface PeriodTotalProps {
  /** Positive magnitude from the server `summary` */
  value: number;
  sign: '+' | '-';
  className: string;
}

// A zero total is a neutral `0pt` — no sign, no colour (PO 2026-09-29), so an empty month never reads `-0pt`.
function PeriodTotal({ value, sign, className }: PeriodTotalProps) {
  if (value === 0) return <span className="text-sm font-semibold">0pt</span>;
  return (
    <span className={cn('text-sm font-semibold', className)}>
      {sign}
      {value.toLocaleString()}pt
    </span>
  );
}

interface PointsTabProps {
  memberId: string;
  /** `members.brand_group` — which of the two balance rows belongs to this member */
  memberBrand: MemberDetailDto['brandGroup'];
}

export function PointsTab({ memberId, memberBrand }: PointsTabProps) {
  const [mode, setMode] = useState<FilterMode>('month');
  const [month, setMonth] = useState(currentYearMonth);
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [sortBy, setSortBy] = useState<SortColumn>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);

  // A custom window applies once both ends are picked; until then the month filter stays in force
  // so a half-picked range never queries an open-ended window.
  const range =
    mode === 'custom' && customRange?.from && customRange.to
      ? { from: formatISODateLocal(customRange.from), to: formatISODateLocal(customRange.to) }
      : monthToRange(month);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    ...adminMemberFinancialControllerPointsOptions({
      path: { memberId: memberId },
      query: {
        from: range.from,
        to: range.to,
        page,
        limit: PAGE_SIZE,
        sort: SORT_KEY[sortBy],
        order: toServerOrder(sortBy, sortOrder),
      },
    }),
    // Keep the previous month's data so switching months does not flash back to the skeleton
    placeholderData: keepPreviousData,
  });

  // `keepPreviousData` keeps the old month on screen while the new one loads, so show a dimming
  // overlay instead of a skeleton (same pattern as the shared DataTable).
  const showOverlay = isFetching && !isLoading;

  // Points are brand-locked at issuance (BR-PNT-007), so the response always carries a row for
  // both brand groups — ENJOYポイント and ベアレージポイント are separate currencies, and the row
  // that is not the member's own reads 0. Pick the member's row: the array order is not part of
  // the contract, and summing the two would add up unrelated point kinds.
  // A-01 FR-011 "the name is resolved dynamically from the brands master" — the server already
  // resolved `pointName` per row, so the FE only displays it.
  const brandBalance = data?.balance?.find((row) => row.brandGroup === memberBrand);
  const pointName = brandBalance?.pointName ?? 'ポイント';

  function handleSort(column: SortColumn) {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // First click on an inactive column sorts ascending, as its tooltip says (same as the shared
      // DataTableColumnHeader).
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  }

  function handleMonthChange(value: string) {
    setMonth(value);
    setPage(1);
  }

  function handleModeChange(value: FilterMode | null) {
    if (!value) return;
    setMode(value);
    setPage(1);
  }

  function handleCustomRangeChange(value: DateRange | undefined) {
    setCustomRange(value);
    setPage(1);
  }

  function renderSortIcon(column: SortColumn) {
    if (sortBy !== column) {
      return (
        <ArrowUpDown className="group-hover/sort:text-foreground text-muted-foreground size-3 transition-colors" />
      );
    }
    return sortOrder === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />;
  }

  function sortTooltip(column: SortColumn) {
    if (sortBy !== column) return 'クリックで昇順ソート';
    return sortOrder === 'asc' ? 'クリックで降順ソート' : 'クリックで昇順ソート';
  }

  // The real API returns one `transactions` stream instead of the mock's split earn/spend
  // lists; the sign of `points` carries the direction.
  const transactions = data?.transactions ?? [];
  const balance = brandBalance?.balance ?? 0;

  // Server-side totals for the whole `from`–`to` window, so they stay correct no matter which
  // page of `transactions` is on screen. `spentTotal` already arrives as a positive magnitude.
  const totalEarned = data?.summary?.earnedTotal ?? 0;
  const totalSpent = data?.summary?.spentTotal ?? 0;
  // 失効予定 is the whole live balance expiring at the next 年次リセット, so it ignores the month
  // filter the two totals above follow. `null` means the member's brand has no expiry rule.
  const expiringPoints = data?.summary?.expiringPoints ?? null;
  const expiringAt = data?.summary?.expiringAt ?? null;

  // Rows arrive already ordered by the server, so the table renders them as they come.
  const unifiedHistory = transactions.map((item) => ({
    ...item,
    kind: (item.points >= 0 ? '獲得' : '消費') as PointKind,
    date: item.createdAt,
    points: Math.abs(item.points),
  }));

  const total = data?.pagination.totalItems ?? 0;
  const limit = data?.pagination.limit ?? PAGE_SIZE;
  const totalPages = Math.ceil(total / limit);

  const boundaryProps = {
    isLoading,
    isError,
    isEmpty: !data,
    onRetry: () => {
      void refetch();
    },
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {/* Left column: unified table. MonthPicker stays outside the boundary so months can be switched on error */}
      <div className="w-full md:w-3/5">
        <Card className="gap-0 py-0">
          <CardHeader className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold">{pointName}履歴</CardTitle>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Select value={mode} onValueChange={handleModeChange} items={FILTER_MODE_OPTIONS}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {FILTER_MODE_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mode === 'month' ? (
                  <div className="w-40">
                    <MonthPicker value={month} onChange={handleMonthChange} className="w-full" />
                  </div>
                ) : (
                  <DateRangePicker
                    date={customRange}
                    placeholder="日付を選択"
                    className="h-8 justify-start gap-2 px-3 text-xs font-normal"
                    onDateChange={handleCustomRangeChange}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <DataStateBoundary
            {...boundaryProps}
            errorTitle={`${pointName}履歴の取得に失敗しました`}
            skeleton={
              <div className="space-y-3 px-4 pb-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={`point-row-${index}`} className="h-9 w-full" />
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
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex" />}>
                            <Button
                              variant="ghost"
                              className="group/sort h-auto gap-1 p-0 text-xs font-semibold hover:bg-transparent"
                              onClick={() => handleSort('date')}
                            >
                              日付
                              {renderSortIcon('date')}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">{sortTooltip('date')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex" />}>
                            <Button
                              variant="ghost"
                              className="group/sort h-auto gap-1 p-0 text-xs font-semibold hover:bg-transparent"
                              onClick={() => handleSort('kind')}
                            >
                              種別
                              {renderSortIcon('kind')}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">{sortTooltip('kind')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-xs font-semibold">事由</TableHead>
                    <TableHead className="text-right text-xs font-semibold">ポイント数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={cn('transition-opacity', showOverlay && 'opacity-50')}>
                  {unifiedHistory.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground py-8 text-center text-xs"
                      >
                        この{mode === 'month' ? '月' : '期間'}のデータはありません。
                      </TableCell>
                    </TableRow>
                  ) : (
                    unifiedHistory.map((item) => (
                      <TableRow key={item.transactionId}>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(item.date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.kind === '獲得'
                                ? 'bg-success/15 text-success border-success/20 text-[10px]'
                                : 'bg-destructive/15 text-destructive border-destructive/20 text-[10px]'
                            }
                          >
                            {item.kind}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-full max-w-0 text-sm font-medium wrap-anywhere whitespace-normal">
                          {item.description}
                        </TableCell>
                        <TableCell
                          className={
                            item.kind === '獲得'
                              ? 'text-success text-right text-sm font-semibold'
                              : 'text-destructive text-right text-sm font-semibold'
                          }
                        >
                          {item.kind === '獲得' ? '+' : '-'}
                          {item.points.toLocaleString()}pt
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </DataStateBoundary>
          {/* Pagination stays outside the boundary (like 請求一覧): a page that renders 0 rows must
              still let the user go back to a previous page. On an error the card shows only the error
              and its retry — a 0-count footer would describe data that never loaded. */}
          {!isError && (
            <CardContent className="px-0 py-0">
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                onPageChange={setPage}
                isLoading={isFetching}
              />
            </CardContent>
          )}
        </Card>
      </div>

      {/* Right column: point summary */}
      <div className="w-full md:w-2/5">
        <div className="sticky top-0 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">ポイントサマリー</CardTitle>
            </CardHeader>
            <DataStateBoundary
              {...boundaryProps}
              errorTitle="ポイントサマリーの取得に失敗しました"
              skeleton={
                <CardContent className="space-y-3 px-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              }
            >
              <CardContent
                className={cn('px-4 transition-opacity', showOverlay && 'opacity-50')}
                aria-busy={showOverlay}
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">残高</p>
                    <p className="text-3xl font-bold">
                      {balance.toLocaleString()}
                      <span className="text-muted-foreground ml-1 text-sm font-normal">pt</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">期間内獲得合計</span>
                      <PeriodTotal value={totalEarned} sign="+" className="text-success" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">期間内消費合計</span>
                      <PeriodTotal value={totalSpent} sign="-" className="text-destructive" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">失効予定</span>
                      <span className="text-muted-foreground text-sm font-medium">
                        {expiringPoints === null
                          ? '—'
                          : `${expiringPoints.toLocaleString()}pt${expiringAt ? `（${formatDate(expiringAt)}）` : ''}`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </DataStateBoundary>
          </Card>
        </div>
      </div>
    </div>
  );
}
