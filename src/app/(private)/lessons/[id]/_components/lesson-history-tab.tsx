'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

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

import { adminLessonControllerHistoryOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

import { HISTORY_ACTION_CLASSES } from '../_constants/constants';
import { describeLessonHistoryEntry } from '../_utils/lesson-history.util';

const HISTORY_PAGE_LIMIT = 20;

interface LessonHistoryTabProps {
  lessonId: string;
  canViewHistory: boolean;
  active: boolean;
}

/**
 * 変更履歴 tab — read-only change-log table (日時 / 操作者 / 操作 / 変更内容)
 * with a total-count footer. Fetched lazily, role-gated (FR-003-P1-18 / D7).
 * API-111 history is HQ-only (E-LSM-101) and paginated, newest first.
 */
export function LessonHistoryTab({ lessonId, canViewHistory, active }: LessonHistoryTabProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    ...adminLessonControllerHistoryOptions({
      path: { lessonId },
      query: { page, limit: HISTORY_PAGE_LIMIT },
    }),
    enabled: Boolean(lessonId) && canViewHistory && active,
    placeholderData: keepPreviousData,
  });

  const entries = data?.items ?? [];
  const pagination = data?.pagination;
  const total = pagination?.totalItems ?? 0;

  return (
    <Card className="gap-0 py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[160px] text-xs font-semibold">日時</TableHead>
            <TableHead className="w-[140px] text-xs font-semibold">操作者</TableHead>
            <TableHead className="w-[80px] text-xs font-semibold">操作</TableHead>
            <TableHead className="text-xs font-semibold">変更内容</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={4}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground py-8 text-center text-sm">
                変更履歴はありません
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry, index) => {
              // Entries come newest first, so the next row is the older snapshot to diff against.
              const { action, detail } = describeLessonHistoryEntry(entry, entries[index + 1]);
              return (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateYYYYMMDD_HHMM(entry.changedAt, entry.changedAt)}
                  </TableCell>
                  <TableCell className="text-sm">{entry.changedByName || '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-normal',
                        HISTORY_ACTION_CLASSES[action] ??
                          'bg-muted text-muted-foreground border-border',
                      )}
                    >
                      {action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{detail ?? '—'}</TableCell>
                </TableRow>
              );
            })
          )}
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
  );
}
