'use client';

import { useState } from 'react';

import { formatISODateLocal } from '@/utils/date.util';
import { formatDate, formatYen } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { MonthPicker } from '@/components/common/month-picker';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminMemberRelationsControllerOneDayPassesOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { MemberOneDayPassItemDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { currentYearMonth, monthToRange } from '../../../_utils/month-range';

type DayPassStatus = 'active' | 'pending_start' | 'used' | 'expired' | 'cancelled';

/**
 * The real pass status is only `active` / `pending_cancel` / `cancelled`. The remaining two
 * states the table shows are derived: `usedAt` marks a pass as consumed, and a `validUntil`
 * already in the past marks it as expired. `pending_cancel` reads as still-active to the
 * operator (the cancellation has not taken effect yet).
 */
function normalizeDayPassStatus(pass: MemberOneDayPassItemDto): DayPassStatus {
  if (pass.status === 'cancelled') return 'cancelled';
  if (pass.usedAt) return 'used';
  // Local today, not UTC: `toISOString()` reads a day behind through the JST morning, which
  // would keep a pass that expired yesterday showing as 有効.
  if (pass.validUntil && pass.validUntil < formatISODateLocal(new Date())) return 'expired';
  return 'active';
}

const STATUS_LABEL: Record<DayPassStatus, string> = {
  active: '有効',
  pending_start: '開始前',
  used: '利用済み',
  expired: '期限切れ',
  cancelled: 'キャンセル',
};

const STATUS_CLASS: Record<DayPassStatus, string> = {
  active: 'border-success/20 bg-success/15 text-success',
  pending_start: 'border-info/20 bg-info/15 text-info',
  used: 'text-muted-foreground',
  expired: 'border-destructive/20 bg-destructive/15 text-destructive',
  cancelled: 'text-muted-foreground',
};

interface DayPassHistoryCardProps {
  memberId: string;
}

export function DayPassHistoryCard({ memberId }: DayPassHistoryCardProps) {
  const [month, setMonth] = useState(currentYearMonth);

  const range = monthToRange(month);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminMemberRelationsControllerOneDayPassesOptions({
      path: { memberId: memberId },
      query: { from: range.from, to: range.to },
    }),
    placeholderData: keepPreviousData,
  });

  const history = data?.items ?? [];
  // `keepPreviousData` keeps the previous month on screen while the new one loads:
  // dim it instead of falling back to the skeleton (same pattern as the shared DataTable)
  const showOverlay = isFetching && !isLoading;

  return (
    <Card className="gap-0 py-0">
      {/* MonthPicker stays outside the boundary so the user can switch months to recover from fetch errors */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3">
        <CardTitle className="text-base font-semibold">1DayPass購入履歴</CardTitle>
        <div className="w-40">
          <MonthPicker value={month} onChange={setMonth} className="w-full" />
        </div>
      </CardHeader>
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!data}
        onRetry={() => refetch()}
        errorTitle="1DayPass購入履歴の取得に失敗しました"
        skeleton={
          <div className="space-y-3 px-4 pb-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`day-pass-row-${index}`} className="h-9 w-full" />
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
                <TableHead className="text-xs font-semibold">購入日</TableHead>
                <TableHead className="text-xs font-semibold">利用店舗</TableHead>
                <TableHead className="text-right text-xs font-semibold">金額</TableHead>
                <TableHead className="text-xs font-semibold">有効期限</TableHead>
                <TableHead className="text-xs font-semibold">状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={cn('transition-opacity', showOverlay && 'opacity-50')}>
              {history.length > 0 ? (
                history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-sm">{formatDate(h.purchasedAt)}</TableCell>
                    <TableCell className="w-full max-w-0 text-sm whitespace-normal">
                      <span className="line-clamp-2 wrap-anywhere" title={h.storeName ?? undefined}>
                        {h.storeName ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatYen(h.fee)}</TableCell>
                    <TableCell className="text-sm">{formatDate(h.validUntil)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${STATUS_CLASS[normalizeDayPassStatus(h)]}`}
                      >
                        {STATUS_LABEL[normalizeDayPassStatus(h)]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-6 text-center text-sm">
                    この月の購入はありません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DataStateBoundary>
    </Card>
  );
}
