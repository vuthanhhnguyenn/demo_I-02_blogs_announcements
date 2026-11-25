'use client';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';

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

import { adminLockerSlotOpsControllerHistoryQueryKey } from '@/lib/api-real/@tanstack/react-query.gen';
import { AdminLockerSlotOperationsApi101 } from '@/lib/api-real/sdk.gen';
import type { LockerSlotHistoryListResponseDto } from '@/lib/api-real/types.gen';

import {
  LOCKER_SLOT_STATUS_LABELS,
  formatLockerHistoryActor,
  isLockerMemberAppRow,
} from '../../../_constants/locker-enum-labels.constants';
import { useQueryErrorToast } from '../../../_hooks/use-query-error-toast.hook';

/** API max page size of the slot status history */
const SLOT_HISTORY_LIMIT = 100;
/** Safety stop: a slot reaching 1,000 transitions is far beyond its lifetime */
const SLOT_HISTORY_MAX_PAGES = 10;

/**
 * The history EP has no `contractId` filter (API-101 §5.1), so every page is read and narrowed
 * here — otherwise rows of this contract past the 100 newest slot transitions would be lost.
 */
async function fetchContractSlotHistory(
  slotId: string,
  contractId: string | null,
  signal: AbortSignal,
) {
  const rows: LockerSlotHistoryListResponseDto['items'] = [];
  for (let page = 1; page <= SLOT_HISTORY_MAX_PAGES; page += 1) {
    const { data } = await AdminLockerSlotOperationsApi101.adminLockerSlotOpsControllerHistory({
      path: { slotId },
      query: { page, limit: SLOT_HISTORY_LIMIT, order: 'desc' },
      signal,
      throwOnError: true,
    });
    rows.push(...data.items.filter((entry) => entry.contractId === contractId));
    if (page >= data.pagination.totalPages) break;
  }
  return rows;
}

interface HistoryTabProps {
  slotId: string;
  contractId: string | null;
}

/**
 * The slot's status history narrowed to this contract (API-101 #8 / #12); 変更前 / 変更後 are the
 * from / to status. No field-level rows: they belonged to TBD-E01-SLOT-MOVE, closed as not adopted
 * (Otaki, 2026-10-20).
 */
export function HistoryTab({ slotId, contractId }: HistoryTabProps) {
  // Keyed under the generated history key so `invalidateLockerQueries` refreshes it too
  const {
    data: history = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      ...adminLockerSlotOpsControllerHistoryQueryKey({ path: { slotId } }),
      { contractId },
    ],
    queryFn: ({ signal }) => fetchContractSlotHistory(slotId, contractId, signal),
  });
  // A failed fetch is not 「変更履歴はありません」
  useQueryErrorToast(isError, '変更履歴の取得に失敗しました');

  if (isLoading) {
    return (
      <Card className="gap-0 py-0">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">変更日時</TableHead>
            <TableHead className="text-xs font-semibold">操作者</TableHead>
            <TableHead className="text-xs font-semibold">変更前</TableHead>
            <TableHead className="w-12 text-center text-xs font-semibold" />
            <TableHead className="text-xs font-semibold">変更後</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                {isError ? '変更履歴の取得に失敗しました' : '変更履歴はありません'}
              </TableCell>
            </TableRow>
          ) : (
            history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-sm">
                  {formatDateYYYYMMDD_HHMM(entry.changedAt)}
                </TableCell>
                <TableCell className="text-sm">{formatLockerHistoryActor(entry)}</TableCell>
                <TableCell className="text-sm">
                  {entry.fromStatus ? (
                    LOCKER_SLOT_STATUS_LABELS[entry.fromStatus]
                  ) : (
                    <span className="text-muted-foreground">&mdash;</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <ArrowRight className="text-muted-foreground inline size-4" />
                </TableCell>
                <TableCell className="text-sm">
                  {entry.fromStatus === null ? (
                    <Badge
                      variant="outline"
                      className="border-info/20 bg-info/15 text-info text-xs font-medium"
                    >
                      {LOCKER_SLOT_STATUS_LABELS[entry.toStatus]}
                    </Badge>
                  ) : (
                    LOCKER_SLOT_STATUS_LABELS[entry.toStatus]
                  )}
                  {entry.note && !isLockerMemberAppRow(entry) ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">{entry.note}</p>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
