'use client';

import { useState } from 'react';

import { PAGE_SIZE } from '@/constants/app.constants';
import { formatDate } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { MonthPicker } from '@/components/common/month-picker';
import { TablePagination } from '@/components/common/table-pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminMemberActivityControllerLessonBookingsOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { MemberLessonBookingItemDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { currentYearMonth, monthToRange } from '../../../_utils/month-range';
import { LessonStatusBadge } from './lesson-status-badge';

/**
 * The lesson name is now a top-level field and the session block is typed, so the table reads
 * them straight off the DTO. 担当 comes from `trainers`, ordered by `displayOrder`.
 */
function trainerNames(row: MemberLessonBookingItemDto): string {
  const names = [...row.trainers]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((trainer) => trainer.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join('・') : '—';
}

/**
 * The real booking status has seven values against the badge's four: the three cancellation
 * reasons collapse into キャンセル, `no_show` is 欠席, and `pending` (awaiting confirmation) reads
 * as 予約済み to the operator.
 */
function toLessonStatus(status: MemberLessonBookingItemDto['status']) {
  if (status === 'attended') return 'attended';
  if (status === 'no_show') return 'absent';
  if (
    status === 'cancelled_by_member' ||
    status === 'cancelled_by_staff' ||
    status === 'cancelled_by_trainer'
  )
    return 'cancelled';
  return 'reserved';
}

interface LessonTableProps {
  readonly memberId: string;
}

export function LessonTable(props: LessonTableProps) {
  const { memberId } = props;
  const [month, setMonth] = useState(currentYearMonth);
  const [page, setPage] = useState(1);

  const range = monthToRange(month);
  const query = { from: range.from, to: range.to, page, limit: PAGE_SIZE };

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    ...adminMemberActivityControllerLessonBookingsOptions({
      path: { memberId: memberId },
      query,
    }),
    placeholderData: keepPreviousData,
  });
  const reservations = data?.items ?? [];
  const showOverlay = isFetching && !isLoading;
  const totalPages = Math.max(1, Math.ceil((data?.pagination.totalItems ?? 0) / PAGE_SIZE));

  const handleMonthChange = (value: string) => {
    setMonth(value);
    setPage(1);
  };

  return (
    <Card className="gap-0 py-0">
      {/* MonthPicker stays outside the boundary so the user can switch months to recover from fetch errors */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3">
        <CardTitle className="text-base font-semibold">レッスン予約履歴</CardTitle>
        <div className="w-40">
          <MonthPicker value={month} onChange={handleMonthChange} className="w-full" />
        </div>
      </CardHeader>

      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!data}
        onRetry={() => {
          void refetch();
        }}
        errorTitle="レッスン予約履歴の取得に失敗しました"
        skeleton={
          <CardContent className="space-y-3 px-4 pb-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`lesson-row-${index}`} className="h-9 w-full" />
            ))}
          </CardContent>
        }
      >
        <CardContent className="px-0">
          <Table size="md">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">日付</TableHead>
                <TableHead className="text-xs font-semibold">レッスン名</TableHead>
                <TableHead className="text-xs font-semibold">担当</TableHead>
                <TableHead className="text-xs font-semibold">状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              className={cn('transition-opacity', showOverlay && 'opacity-50')}
              aria-busy={showOverlay}
            >
              {reservations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground px-4 py-8 text-center text-xs"
                  >
                    この月のデータはありません。
                  </TableCell>
                </TableRow>
              ) : (
                reservations.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm">
                      {formatDate(row.lessonSchedule?.scheduledDate)}
                    </TableCell>
                    {/* Long lesson / trainer names are clamped to two lines; the full text is on hover. */}
                    <TableCell className="w-1/2 max-w-0 text-sm font-medium whitespace-normal">
                      <span
                        className="line-clamp-2 wrap-anywhere"
                        title={row.lessonName ?? undefined}
                      >
                        {row.lessonName ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground w-1/2 max-w-0 text-sm whitespace-normal">
                      <span className="line-clamp-2 wrap-anywhere" title={trainerNames(row)}>
                        {trainerNames(row)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <LessonStatusBadge status={toLessonStatus(row.status)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {reservations.length > 0 && (
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              total={data?.pagination.totalItems ?? 0}
              limit={PAGE_SIZE}
              isLoading={isFetching}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </DataStateBoundary>
    </Card>
  );
}
