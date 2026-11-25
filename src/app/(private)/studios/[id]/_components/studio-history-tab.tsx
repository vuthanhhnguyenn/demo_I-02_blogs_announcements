'use client';

import { useState } from 'react';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { TablePagination } from '@/components/common/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminStudioControllerHistoryOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import { toStudioHistoryRows } from '../../_utils/studio-detail.util';

interface StudioHistoryTabProps {
  studioId: string;
  active: boolean;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : format(date, 'yyyy/MM/dd HH:mm');
}

/** Entries per page, as on the lesson history tab */
const HISTORY_PAGE_LIMIT = 20;

export function StudioHistoryTab({ studioId, active }: StudioHistoryTabProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminStudioControllerHistoryOptions({
      path: { studioId },
      query: { page, limit: HISTORY_PAGE_LIMIT },
    }),
    enabled: Boolean(studioId) && active,
    placeholderData: keepPreviousData,
  });
  const pagination = data?.pagination;
  const hasOlderPage = !!pagination && pagination.page < pagination.totalPages;

  // The page's last entry is diffed against the entry right after the page: a one-row read at
  // that offset (page = offset + 1 with limit 1)
  const { data: olderData } = useQuery({
    ...adminStudioControllerHistoryOptions({
      path: { studioId },
      query: { page: page * HISTORY_PAGE_LIMIT + 1, limit: 1 },
    }),
    enabled: Boolean(studioId) && active && hasOlderPage,
  });

  // API-110 §5.2 answers snapshots; the field-by-field rows are rebuilt here (FE-side diff)
  const rows = toStudioHistoryRows(
    data?.items ?? [],
    hasOlderPage ? olderData?.items[0] : undefined,
  );
  const total = pagination?.totalItems ?? 0;

  return (
    <DataStateBoundary
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && rows.length === 0}
      onRetry={() => void refetch()}
      emptyTitle="変更履歴はありません"
      skeleton={
        <Card className="gap-0 py-0">
          <Table>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      }
    >
      <Card className="gap-0 py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold first:pl-4">更新日時</TableHead>
              <TableHead className="text-xs font-semibold">操作者</TableHead>
              <TableHead className="text-xs font-semibold">変更フィールド</TableHead>
              <TableHead className="text-xs font-semibold">変更前</TableHead>
              <TableHead className="w-12 text-center text-xs font-semibold" />
              <TableHead className="text-xs font-semibold last:pr-4">変更後</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm whitespace-nowrap first:pl-4">
                  {formatTimestamp(row.timestamp)}
                </TableCell>
                <TableCell className="text-sm">{row.user}</TableCell>
                <TableCell className="text-sm font-medium">
                  {row.field ? row.field : <span className="text-muted-foreground">&mdash;</span>}
                </TableCell>
                <TableCell className="max-w-44 truncate text-sm">
                  {row.before ? row.before : <span className="text-muted-foreground">&mdash;</span>}
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-muted-foreground text-xs">&rarr;</span>
                </TableCell>
                <TableCell className="max-w-[200px] text-sm last:pr-4">
                  {row.isCreate ? (
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant="outline"
                        className="bg-info/15 text-info border-info/20 w-fit text-xs font-medium"
                      >
                        新規作成
                      </Badge>
                      {row.note && (
                        <span className="text-muted-foreground text-xs">{row.note}</span>
                      )}
                    </div>
                  ) : (
                    (row.after ?? <span className="text-muted-foreground">&mdash;</span>)
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pagination && pagination.totalPages > 1 ? (
          <TablePagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.totalItems}
            limit={pagination.limit}
            onPageChange={setPage}
            isLoading={isFetching}
          />
        ) : (
          <div className="flex items-center border-t px-4 py-3">
            <p className="text-muted-foreground text-xs">全{total}件</p>
          </div>
        )}
      </Card>
    </DataStateBoundary>
  );
}
