'use client';

import { useState } from 'react';

import { API_PAGE_SIZE_OPTIONS } from '@/constants/app.constants';
import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, ClipboardList, Clock } from 'lucide-react';

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

import { adminRelayControllerControllerHistoryOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  RelayControllerDetailDto,
  RelayControllerStatusHistoryEntryDto,
} from '@/lib/api-real/types.gen';

import { CONTROLLER_STATUS_BADGE_MAP, CONTROLLER_STATUS_LABELS } from '../../_constants/constants';

type HistoryRow = RelayControllerStatusHistoryEntryDto;

/** Paged like every table on the screen (API-104 caps `limit` at 100). */
const DEFAULT_PAGE_SIZE = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

interface ControllerHistoryTabProps {
  controller: Pick<RelayControllerDetailDto, 'id' | 'createdAt'>;
}

/**
 * A null `previousStatus` marks the install row (written on register, backfilled for older
 * controllers) — the prototype renders that as a single 新規作成 badge instead of a transition.
 */
function StatusTransition({ row }: { row: HistoryRow }) {
  // Codegen drops `nullable` on `previousStatus`; the API sends null on the install row.
  if (!row.previousStatus) {
    return (
      <Badge variant="outline" className="border-info/20 bg-info/15 text-info text-xs font-medium">
        新規作成
      </Badge>
    );
  }

  const fromBadge = CONTROLLER_STATUS_BADGE_MAP[row.previousStatus];
  const toBadge = CONTROLLER_STATUS_BADGE_MAP[row.newStatus];

  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant="outline" className={fromBadge.badgeClassName}>
        <span className={`size-1.5 rounded-full ${fromBadge.dotClassName}`} />
        {CONTROLLER_STATUS_LABELS[row.previousStatus]}
      </Badge>
      <ArrowRight className="text-muted-foreground size-3" />
      <Badge variant="outline" className={toBadge.badgeClassName}>
        <span className={`size-1.5 rounded-full ${toBadge.dotClassName}`} />
        {CONTROLLER_STATUS_LABELS[row.newStatus]}
      </Badge>
    </span>
  );
}

/**
 * Footer figures of the prototype's 変更履歴 tab, computed over the controller's **whole** history
 * rather than the rows loaded so far. The install row (the oldest, null `previousStatus`) is not a
 * maintenance action and is left out of both:
 *
 * - 直近1年の対応 — `totalItems` of the rows changed within the last year, minus the install row
 *   when the controller itself was registered within that year;
 * - 平均対応間隔 — (newest action − oldest action) / (actions − 1). The history is latest first,
 *   so with `limit=1` page 1 is the newest action, the install row the last page and the oldest
 *   action the one before it.
 */
function useHistoryStats(controller: ControllerHistoryTabProps['controller'], totalCount: number) {
  // Fixed per mount so the window — and the query key — does not drift on every render.
  const [oneYearAgo] = useState(() => new Date(Date.now() - 365 * DAY_MS));
  const path = { relayControllerId: controller.id };

  const { data: lastYearCount } = useQuery({
    ...adminRelayControllerControllerHistoryOptions({
      path,
      query: { changedFrom: oneYearAgo.toISOString(), limit: 1 },
    }),
    select: (data) => data.pagination.totalItems,
  });

  const actionCount = Math.max(totalCount - 1, 0);
  const { data: newestRow } = useQuery({
    ...adminRelayControllerControllerHistoryOptions({ path, query: { limit: 1, page: 1 } }),
    enabled: actionCount >= 2,
    select: (data) => data.items[0],
  });
  const { data: oldestAction } = useQuery({
    ...adminRelayControllerControllerHistoryOptions({
      path,
      query: { limit: 1, page: actionCount },
    }),
    enabled: actionCount >= 2,
    select: (data) => data.items[0],
  });

  const installedWithinYear = new Date(controller.createdAt).getTime() >= oneYearAgo.getTime();
  const actionsLastYear =
    lastYearCount === undefined
      ? undefined
      : Math.max(lastYearCount - (installedWithinYear ? 1 : 0), 0);

  const averageIntervalDays =
    actionCount >= 2 && newestRow?.previousStatus && oldestAction
      ? Math.round(
          (new Date(newestRow.changedAt).getTime() - new Date(oldestAction.changedAt).getTime()) /
            (actionCount - 1) /
            DAY_MS,
        )
      : null;

  return { actionsLastYear, averageIntervalDays };
}

/**
 * 接点制御装置 変更履歴 (`GET /admin/relay-controllers/{id}/status-history`). Columns match the
 * connected-device tab: 変更理由 shows the free-text `changedNote` the status dialog writes.
 */
export function ControllerHistoryTab({ controller }: ControllerHistoryTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { data, isLoading, isError, refetch } = useQuery({
    ...adminRelayControllerControllerHistoryOptions({
      path: { relayControllerId: controller.id },
      query: { page, limit: pageSize },
    }),
    placeholderData: keepPreviousData,
  });

  const history: HistoryRow[] = data?.items ?? [];
  const totalCount = data?.pagination.totalItems ?? 0;
  const { actionsLastYear, averageIntervalDays } = useHistoryStats(controller, totalCount);

  if (isLoading) {
    return (
      <Card className="gap-0 py-0">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  // A failure must not read as 履歴はありません, which is a meaningful state of its own.
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
                <TableCell className="text-sm">{row.changedBy?.name?.trim() || '—'}</TableCell>
                <TableCell>
                  <StatusTransition row={row} />
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[280px] text-sm wrap-anywhere whitespace-normal">
                  {row.changedNote?.trim() || '—'}
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

      <div className="bg-muted/50 flex flex-wrap items-center gap-4 border-t px-4 py-3">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <ClipboardList className="size-3" />
          直近1年の対応:{' '}
          <span className="text-foreground font-semibold">
            {actionsLastYear === undefined ? '—' : `${actionsLastYear}回`}
          </span>
        </div>
        <span className="text-border">|</span>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Clock className="size-3" />
          平均対応間隔:{' '}
          <span className="text-foreground font-semibold">
            {averageIntervalDays === null ? '—' : `${averageIntervalDays}日`}
          </span>
        </div>
      </div>
    </Card>
  );
}
