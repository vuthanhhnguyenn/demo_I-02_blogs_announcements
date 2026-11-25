'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';

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

import { adminLockerSlotOpsControllerCabinetHistoryOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LockerHistoryEntryDto } from '@/lib/api-real/types.gen';

import {
  LOCKER_CHANGED_BY_ROLE_LABELS,
  LOCKER_SLOT_STATUS_BADGE_CLASSES,
  LOCKER_SLOT_STATUS_LABELS,
  formatLockerHistoryActor,
  formatLockerSlotLabel,
  isLockerMemberAppRow,
} from '../../_constants/locker-enum-labels.constants';

const HISTORY_PAGE_LIMIT = 20;

interface LockerHistoryTabProps {
  lockerId: string;
  /** Slot labels are 「A-001」: `locationCode` + `slotCode` */
  locationCode: string;
}

function StatusBadge({ status }: { status: LockerHistoryEntryDto['toStatus'] }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${LOCKER_SLOT_STATUS_BADGE_CLASSES[status]}`}
    >
      {LOCKER_SLOT_STATUS_LABELS[status]}
    </Badge>
  );
}

/**
 * 変更履歴: the cabinet's slot status transitions (`GET /admin/lockers/{lockerId}/status-history`,
 * API-101 §6.8), newest first.
 */
export function LockerHistoryTab({ lockerId, locationCode }: LockerHistoryTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    ...adminLockerSlotOpsControllerCabinetHistoryOptions({
      path: { lockerId },
      query: { page, limit: HISTORY_PAGE_LIMIT, order: 'desc' },
    }),
    placeholderData: keepPreviousData,
  });

  const history = data?.items ?? [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <Card className="gap-0 py-0">
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[160px] text-xs font-semibold">日時</TableHead>
            <TableHead className="w-[140px] text-xs font-semibold">操作者</TableHead>
            <TableHead className="w-[100px] text-xs font-semibold">スロット</TableHead>
            <TableHead className="w-[220px] text-xs font-semibold">操作内容</TableHead>
            <TableHead className="text-xs font-semibold">詳細</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length > 0 ? (
            history.map((row) => {
              // The app-enrollment note is a raw source marker (`enrollment (API-153)`), not user text
              const note = isLockerMemberAppRow(row) ? null : row.note;
              return (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateYYYYMMDD_HHMM(row.changedAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{formatLockerHistoryActor(row)}</div>
                    {/* 「システム（自動）」 already names the system user */}
                    {row.changedByRole && row.changedByRole !== 'system' ? (
                      <div className="text-muted-foreground text-xs">
                        {LOCKER_CHANGED_BY_ROLE_LABELS[row.changedByRole]}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatLockerSlotLabel(locationCode, row.slotCode)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {row.fromStatus ? <StatusBadge status={row.fromStatus} /> : null}
                      {row.fromStatus ? (
                        <ArrowRight className="text-muted-foreground size-3" />
                      ) : null}
                      <StatusBadge status={row.toStatus} />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.memberName ? (
                      <div>
                        {row.memberName}
                        {row.memberNumber ? `（${row.memberNumber}）` : ''}
                      </div>
                    ) : null}
                    {note ? <div className="text-xs">{note}</div> : null}
                    {!row.memberName && !note ? '—' : null}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                履歴はありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {pagination && pagination.totalItems > 0 ? (
        <TablePagination
          currentPage={pagination.page}
          totalPages={Math.max(1, Math.ceil(pagination.totalItems / pagination.limit))}
          total={pagination.totalItems}
          limit={pagination.limit}
          onPageChange={setPage}
        />
      ) : null}
    </Card>
  );
}
