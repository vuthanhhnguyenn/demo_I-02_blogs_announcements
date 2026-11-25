'use client';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminStaffPermissionControllerStaffChangeHistoriesOptions } from '@/lib/api-real/@tanstack/react-query.gen';

interface PermissionHistoryTabProps {
  staffId: string;
}

// `changedBy` is typed as a loose index signature on the generated DTO, but the API
// always returns `{ staffId, displayName }` (displayName null when the staff row is gone).
interface ChangedBy {
  staffId: string;
  displayName: string | null;
}

/**
 * 変更履歴 tab — 日時/操作者/変更内容 table, newest first, 全{N}件 footer
 * src: staff-detail.tsx L321-346
 */
export function PermissionHistoryTab({ staffId }: PermissionHistoryTabProps) {
  const { data } = useQuery({
    ...adminStaffPermissionControllerStaffChangeHistoriesOptions({
      path: { id: staffId },
      query: { page: 1, limit: 100 },
    }),
  });
  const history = data?.items ?? [];
  const total = data?.pagination.totalItems ?? 0;

  if (history.length === 0) {
    return (
      <Card className="gap-0 py-0">
        <Empty variant="empty" entityLabel="変更履歴" />
        <div className="flex items-center border-t px-4 py-3">
          <p className="text-muted-foreground text-xs">全{total}件</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-0">
      {/* `table-fixed` keeps the two left columns at their declared widths: with the default
          auto layout a long 変更内容 (cells default to whitespace-nowrap) stretched the table
          and squeezed 日時 / 操作者 down to about two thirds of their width. */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-40 text-xs font-semibold">日時</TableHead>
            <TableHead className="w-50 text-xs font-semibold">操作者</TableHead>
            <TableHead className="text-xs font-semibold">変更内容</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => {
            const changedBy = entry.changedBy as unknown as ChangedBy;
            return (
              <TableRow key={entry.historyId}>
                <TableCell className="text-muted-foreground align-top text-xs">
                  {formatDateYYYYMMDD_HHMM(entry.changedAt)}
                </TableCell>
                <TableCell className="truncate align-top text-sm">
                  {changedBy.displayName ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground align-top text-sm wrap-break-word whitespace-normal">
                  {entry.changeDescription}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex items-center border-t px-4 py-3">
        <p className="text-muted-foreground text-xs">全{total}件</p>
      </div>
    </Card>
  );
}
