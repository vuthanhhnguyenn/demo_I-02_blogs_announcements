'use client';

import { useState } from 'react';

import { formatDate } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { TablePagination } from '@/components/common/table-pagination';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminMemberActivityControllerBodyHistoryOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

import { SOURCE_LABELS, formatMetric } from './body-data.util';

/** 全件 Sheet pages 20 rows at a time, as the prototype's footer pagination does. */
const HISTORY_PAGE_SIZE = 20;

/**
 * 測定履歴 全件 — one merged list of 体組成 and 身体データ rows under a single pagination, so it
 * pages on its own request instead of sharing the tab's, which feeds the 最新値 cards.
 */
export function MeasurementHistorySheet({
  memberId,
  open,
  onOpenChange,
}: {
  memberId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminMemberActivityControllerBodyHistoryOptions({
      path: { memberId },
      query: { page, limit: HISTORY_PAGE_SIZE },
    }),
    enabled: open,
    // Keep the previous page's rows so paging does not flash back to the skeleton.
    placeholderData: keepPreviousData,
  });
  const showOverlay = isFetching && !isLoading;

  const records = data?.items ?? [];
  const total = data?.pagination.totalItems ?? 0;
  const limit = data?.pagination.limit ?? HISTORY_PAGE_SIZE;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) setPage(1);
      }}
    >
      <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader className="gap-0 p-0">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              測定履歴
              <Badge variant="secondary" className="text-[10px]">
                全{total}件
              </Badge>
            </SheetTitle>
            <SheetDescription className="sr-only">
              ボディーデータの測定履歴（全{total}件）
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto">
          <DataStateBoundary
            isLoading={isLoading}
            isError={isError}
            isEmpty={!data}
            onRetry={() => refetch()}
            errorTitle="測定履歴の取得に失敗しました"
            emptyTitle="測定履歴がありません"
            skeleton={
              <div className="space-y-3 px-6 py-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={`measurement-sheet-row-${index}`} className="h-9 w-full" />
                ))}
              </div>
            }
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-30 text-xs font-semibold first:pl-6">測定日</TableHead>
                  <TableHead className="w-30 text-xs font-semibold">データソース</TableHead>
                  <TableHead className="text-right text-xs font-semibold">体重</TableHead>
                  <TableHead className="text-right text-xs font-semibold last:pr-6">
                    体脂肪率
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody
                className={cn('transition-opacity', showOverlay && 'opacity-50')}
                aria-busy={showOverlay}
              >
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground py-6 text-center text-xs"
                    >
                      測定履歴がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground text-sm first:pl-6">
                        {formatDate(item.recordedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {SOURCE_LABELS[item.source]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatMetric(item.weightKg, 'kg')}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums last:pr-6">
                        {formatMetric(item.bodyFatPercent, '%')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DataStateBoundary>
        </div>

        <TablePagination
          currentPage={page}
          totalPages={data?.pagination.totalPages ?? 1}
          total={total}
          limit={limit}
          isLoading={isFetching}
          onPageChange={setPage}
          className="shrink-0 px-6 py-4"
        />
      </SheetContent>
    </Sheet>
  );
}
