'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { TablePagination } from '@/components/common/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  adminStaffPermissionControllerGetStaffOptions,
  adminTrainerControllerHistoryOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { TrainerDetailDto } from '@/lib/api-real/types.gen';

import { historyStaffIds, toInstructorHistoryRows } from '../../_utils/instructor-detail.util';

interface InstructorHistoryTabProps {
  instructor: TrainerDetailDto;
  instructorName: string;
  active: boolean;
}

/** Entries per page, as on the studio history tab */
const HISTORY_PAGE_LIMIT = 20;

export function InstructorHistoryTab({
  instructor,
  instructorName,
  active,
}: InstructorHistoryTabProps) {
  const trainerId = instructor.id;
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminTrainerControllerHistoryOptions({
      path: { trainerId },
      query: { page, limit: HISTORY_PAGE_LIMIT },
    }),
    enabled: Boolean(trainerId) && active,
    placeholderData: keepPreviousData,
  });
  const pagination = data?.pagination;
  const hasOlderPage = !!pagination && pagination.page < pagination.totalPages;

  // The page's last entry is diffed against the entry right after the page: a one-row read at
  // that offset (page = offset + 1 with limit 1)
  const { data: olderData } = useQuery({
    ...adminTrainerControllerHistoryOptions({
      path: { trainerId },
      query: { page: page * HISTORY_PAGE_LIMIT + 1, limit: 1 },
    }),
    enabled: Boolean(trainerId) && active && hasOlderPage,
  });

  // Snapshots carry the linked staff's id only: name the other accounts with the staff read (D12)
  const items = data?.items ?? [];
  const olderItem = hasOlderPage ? olderData?.items[0] : undefined;
  const otherStaffIds = historyStaffIds(olderItem ? [...items, olderItem] : items).filter(
    (id) => id !== instructor.linkedStaff?.id,
  );
  const staffQueries = useQueries({
    queries: otherStaffIds.map((id) => ({
      ...adminStaffPermissionControllerGetStaffOptions({ path: { id } }),
      enabled: active,
      retry: false,
    })),
  });
  const staffNames = new Map<string, string>(
    staffQueries.flatMap((q) => (q.data ? [[q.data.id, q.data.name] as const] : [])),
  );
  if (instructor.linkedStaff)
    staffNames.set(instructor.linkedStaff.id, instructor.linkedStaff.name);
  const staffName = (id: string) => staffNames.get(id) ?? `スタッフ（${id.slice(0, 8)}…）`;

  // API-109 §5.3 answers snapshots; the field-by-field rows are rebuilt here (FE-side diff)
  const rows = toInstructorHistoryRows(items, olderItem, staffName);
  const total = pagination?.totalItems ?? 0;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && rows.length === 0}
        onRetry={() => void refetch()}
        emptyTitle="変更履歴がありません"
      >
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
                  {formatDateYYYYMMDD_HHMM(row.timestamp, row.timestamp)}
                </TableCell>
                <TableCell className="text-sm">{row.user}</TableCell>
                <TableCell className="text-sm font-medium">
                  {row.field ?? <span className="text-muted-foreground">&mdash;</span>}
                </TableCell>
                <TableCell className="max-w-44 truncate text-sm">
                  {row.before ?? <span className="text-muted-foreground">&mdash;</span>}
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-muted-foreground text-xs">→</span>
                </TableCell>
                <TableCell className="max-w-50 text-sm last:pr-4">
                  {row.isCreate ? (
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant="outline"
                        className="bg-info/15 text-info border-info/20 w-fit text-xs font-medium"
                      >
                        新規作成
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        インストラクター {instructorName}を新規登録
                      </span>
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
      </DataStateBoundary>
    </Card>
  );
}
