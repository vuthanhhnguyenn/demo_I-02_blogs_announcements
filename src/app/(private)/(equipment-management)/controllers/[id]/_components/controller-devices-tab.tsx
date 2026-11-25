'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { API_PAGE_SIZE_OPTIONS } from '@/constants/app.constants';
import { AlertTriangle } from 'lucide-react';

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

import type { ConnectedDeviceDto, RelayControllerDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { formatShortId } from '../../../_utils/device-api.util';
import {
  EQUIPMENT_STATUS_BADGE_MAP,
  EQUIPMENT_STATUS_LABELS,
} from '../../../equipment/_constants/constants';
import {
  useControllerDeviceStatusCounts,
  useControllerDevices,
} from '../../_hooks/use-controller-devices';

const DEFAULT_PAGE_SIZE = 50;

type DeviceRow = ConnectedDeviceDto;

interface ControllerDevicesTabProps {
  controller: RelayControllerDetailDto;
}

export function ControllerDevicesTab({ controller }: ControllerDevicesTabProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { data, isLoading, isError, refetch } = useControllerDevices(controller, {
    page,
    limit: pageSize,
  });
  const counts = useControllerDeviceStatusCounts(controller);

  const devices: DeviceRow[] = data?.items ?? [];
  const total = data?.pagination.totalItems ?? 0;

  // The footer counts every device on the controller, not just the page on screen: the total is
  // the list's `totalItems`, 正常 / 異常 are one-row counts (「—」 until they arrive).
  const formatCount = (count: number | undefined) => (count === undefined ? '—' : count);
  const summary = {
    total,
    normal: formatCount(counts.normal),
    error: formatCount(counts.abnormal),
  };

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

  // BUG-E02-E-05 — a failed request must not render as 紐付いている機器はありません + 合計 0台, the
  // opposite of the truth for a controller that does have devices: no table, no counts.
  if (isError) {
    return (
      <Card className="gap-0 py-0">
        <Empty
          icon={AlertTriangle}
          title="紐付き機器一覧の取得に失敗しました"
          description="時間をおいて再度お試しください。"
          actionLabel="再試行"
          onAction={() => void refetch()}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">機器ID</TableHead>
              <TableHead className="text-xs font-semibold">機器名</TableHead>
              <TableHead className="text-xs font-semibold">接点番号</TableHead>
              <TableHead className="text-xs font-semibold">ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.length > 0 ? (
              devices.map((device) => {
                const statusBadge = EQUIPMENT_STATUS_BADGE_MAP[device.status];

                return (
                  <TableRow
                    key={device.id}
                    className={`hover:bg-accent/50 cursor-pointer ${
                      device.status === 'abnormal'
                        ? 'bg-destructive/10 shadow-[inset_4px_0_0_0_var(--destructive)]'
                        : ''
                    }`}
                    onClick={() => router.push(navigate('/equipment/[id]', device.id))}
                  >
                    <TableCell
                      className="text-muted-foreground font-mono text-xs"
                      title={device.id}
                    >
                      {formatShortId(device.id)}
                    </TableCell>
                    {/* BUG-E02-E-10 — a long 機器名 must not push 接点番号 / ステータス out of view. */}
                    <TableCell className="text-sm">
                      <span className="block max-w-[320px] truncate" title={device.name}>
                        {device.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {device.outputPort ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge.badgeClassName}>
                        <span className={`size-1.5 rounded-full ${statusBadge.dotClassName}`} />
                        {EQUIPMENT_STATUS_LABELS[device.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center text-sm">
                  紐付いている機器はありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="bg-muted/50 flex flex-wrap items-center gap-4 border-t px-4 py-3">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            合計: <span className="text-foreground font-semibold">{summary.total}台</span>
          </div>
          <span className="text-border">|</span>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            正常: <span className="text-success font-semibold">{summary.normal}台</span>
          </div>
          <span className="text-border">|</span>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            異常: <span className="text-destructive font-semibold">{summary.error}台</span>
          </div>
        </div>

        {total > 0 && (
          <TablePaginationWithSize
            total={total}
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
    </div>
  );
}
