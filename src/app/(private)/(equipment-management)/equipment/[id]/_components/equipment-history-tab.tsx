'use client';

import { useState } from 'react';

import { API_PAGE_SIZE_OPTIONS } from '@/constants/app.constants';
import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, QrCode } from 'lucide-react';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
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

import { adminConnectedDeviceControllerHistoryOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { DeviceStatusHistoryEntryDto } from '@/lib/api-real/types.gen';

import {
  EQUIPMENT_CHANGED_REASON_LABELS,
  EQUIPMENT_QR_HISTORY_LABELS,
  EQUIPMENT_STATUS_BADGE_MAP,
  EQUIPMENT_STATUS_LABELS,
  isQrHistoryReason,
} from '../../_constants/constants';

type HistoryRow = DeviceStatusHistoryEntryDto;

/** Paged like every table on the screen (API-103 caps `limit` at 100). */
const DEFAULT_PAGE_SIZE = 50;

/**
 * 操作者: the staff display name API-103 joins in. `changedBy` is null for system changes and
 * `name` is null when the staff cannot be resolved — both render `—`, never the raw staff id.
 */
function getChangedByName(row: HistoryRow): string | null {
  const name = row.changedBy?.name?.trim();
  return name ? name : null;
}

/**
 * 変更理由 cell: free-text note first; the structured reason only when no note was written.
 * The install row (null `previousStatus`) carries `changedReason: install`, but 新規作成 is not a
 * status change with a reason — it renders 「—」 (006 US4 AS3, BUG-E02-B-02). The same holds for the
 * QR sticker rows (qr_create / qr_change): the event itself is in ステータス変化.
 */
function getReasonText(row: HistoryRow): string | null {
  const note = row.changedNote?.trim();
  if (note) return note;
  if (!row.previousStatus || isQrHistoryReason(row.changedReason)) return null;
  return row.changedReason ? (EQUIPMENT_CHANGED_REASON_LABELS[row.changedReason] ?? null) : null;
}

interface EquipmentHistoryTabProps {
  equipmentId: string;
}

/**
 * A null `previousStatus` marks the install row (design doc §5) — the prototype renders that as
 * a single 新規作成 badge instead of a transition. A QR sticker issue / re-issue (`changedReason`
 * qr_create / qr_change) leaves the status as it was, so it is one QRコード発行 / QRコード再発行
 * badge rather than a 正常 → 正常 transition.
 */
function StatusTransition({ row }: { row: HistoryRow }) {
  if (isQrHistoryReason(row.changedReason)) {
    return (
      <Badge
        variant="outline"
        className="border-info/20 bg-info/15 text-info gap-1 text-xs font-medium"
      >
        <QrCode className="size-3" />
        {EQUIPMENT_QR_HISTORY_LABELS[row.changedReason ?? '']}
      </Badge>
    );
  }

  // Codegen drops `nullable` on `previousStatus`; the API sends null on the install row.
  if (!row.previousStatus) {
    return (
      <Badge variant="outline" className="border-info/20 bg-info/15 text-info text-xs font-medium">
        新規作成
      </Badge>
    );
  }

  const fromBadge = EQUIPMENT_STATUS_BADGE_MAP[row.previousStatus];
  const toBadge = EQUIPMENT_STATUS_BADGE_MAP[row.newStatus];

  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant="outline" className={fromBadge.badgeClassName}>
        <span className={`size-1.5 rounded-full ${fromBadge.dotClassName}`} />
        {EQUIPMENT_STATUS_LABELS[row.previousStatus]}
      </Badge>
      <ArrowRight className="text-muted-foreground size-3" />
      <Badge variant="outline" className={toBadge.badgeClassName}>
        <span className={`size-1.5 rounded-full ${toBadge.dotClassName}`} />
        {EQUIPMENT_STATUS_LABELS[row.newStatus]}
      </Badge>
    </span>
  );
}

export function EquipmentHistoryTab({ equipmentId }: EquipmentHistoryTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { data, isLoading, isError, refetch } = useQuery({
    ...adminConnectedDeviceControllerHistoryOptions({
      path: { deviceId: equipmentId },
      query: { page, limit: pageSize },
    }),
    placeholderData: keepPreviousData,
  });

  const history: HistoryRow[] = data?.items ?? [];
  const totalCount = data?.pagination.totalItems ?? 0;

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

  // A failure must not read as 履歴はありません, which is a meaningful state of its own
  // (BUG-E02-B-06): show the error with a retry instead of the empty table.
  if (isError) {
    return (
      <Card className="gap-0 py-0">
        <Empty
          icon={AlertTriangle}
          title="変更履歴の取得に失敗しました"
          description="時間をおいて再度お試しください。"
          actionLabel="再試行"
          onAction={() => refetch()}
        />
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[160px] text-xs font-semibold">日時</TableHead>
            <TableHead className="w-[100px] text-xs font-semibold">操作者</TableHead>
            <TableHead className="w-[220px] text-xs font-semibold">ステータス変化</TableHead>
            <TableHead className="text-xs font-semibold">変更理由</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length > 0 ? (
            history.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDateYYYYMMDD_HHMM(row.changedAt)}
                </TableCell>
                <TableCell className="text-sm">{getChangedByName(row) ?? '—'}</TableCell>
                <TableCell>
                  <StatusTransition row={row} />
                </TableCell>
                {/* The table cell default is nowrap: a long or unbroken reason must wrap inside the
                    bounded column instead of being clipped (BUG-E02-B-05). */}
                <TableCell className="text-muted-foreground max-w-[280px] text-sm wrap-anywhere whitespace-normal">
                  {getReasonText(row) ?? '—'}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground py-8 text-center text-sm">
                履歴はありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {totalCount > 0 && (
        <TablePaginationWithSize
          total={totalCount}
          currentPage={page}
          pageSize={pageSize}
          pageSizeOptions={API_PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </Card>
  );
}
