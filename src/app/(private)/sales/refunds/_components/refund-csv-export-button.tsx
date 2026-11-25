'use client';

// Client component: FR-010 / API-119 §11 refund CSV — async export (D14):
// create (202) → poll the accounting-exports list → fetch the signed `csvUrl` → download.
// The export worker runs hourly, so a request that is not ready within the poll is kept and
// offered for download from the dialog once it is `exported`.
import { useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { formatDateTime } from '@/utils/format.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { useCurrentUser } from '@/hooks/use-current-user';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { AdminWriteOff__AccountingApi119 } from '@/lib/api-real';
import { adminWriteoffAccountingControllerDownloadExportOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { AccountingExportListItemDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { fetchExportRows, useExportRows } from '../../_hooks/use-export-rows.hook';
import {
  EXPORT_POLL_INTERVAL_MS,
  EXPORT_POLL_MAX_ATTEMPTS,
  exportError,
  isExportRunning,
  readKeptExports,
  sleep,
  triggerDownload,
  writeKeptExports,
} from '../../_utils/accounting-export.util';

type ExportOutcome = { kind: 'ready'; exportId: string } | { kind: 'empty' } | { kind: 'timeout' };

// API-119 has no "my refund exports" filter that also covers pending rows, so requests are kept
// in the browser, keyed per staff
const pendingExportsKey = (staffId: string) => `sales.refund-csv-exports:${staffId}`;

type PendingExport = { exportId: string; fromDate: string; toDate: string };

function readPendingExports(staffId: string): PendingExport[] {
  return readKeptExports<PendingExport>(pendingExportsKey(staffId));
}

function writePendingExports(staffId: string, exports: PendingExport[]): void {
  writeKeptExports(pendingExportsKey(staffId), exports);
}

function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

interface RefundCsvExportButtonProps {
  /** The list's 申請日 range, used as the initial 返金日 range when set */
  defaultFromDate?: string | null;
  defaultToDate?: string | null;
}

/**
 * FR-010: refund CSV export — Manager+ (API-119 §11). The server always excludes SBPS refunds and
 * only exports executed (`refunds.status = succeeded`) refunds; the period is `refunded_at`.
 */
export function RefundCsvExportButton({
  defaultFromDate,
  defaultToDate,
}: Readonly<RefundCsvExportButtonProps>) {
  const queryClient = useQueryClient();
  const staffId = useCurrentUser().data?.staffId ?? '';
  const submittingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [pendingExports, setPendingExports] = useState<PendingExport[]>([]);

  function forgetExport(exportId: string) {
    setPendingExports((current) => {
      const next = current.filter((item) => item.exportId !== exportId);
      writePendingExports(staffId, next);
      return next;
    });
  }

  async function downloadExport(exportId: string) {
    const download = await queryClient.fetchQuery({
      ...adminWriteoffAccountingControllerDownloadExportOptions({ path: { exportId } }),
      staleTime: 0,
    });
    triggerDownload(download.csvUrl, download.fileName);
  }

  const downloadMutation = useMutation({
    mutationFn: (exportId: string) => downloadExport(exportId),
    onSuccess: (_, exportId) => {
      forgetExport(exportId);
      toast.success('CSVを出力しました');
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (period: { fromDate: string; toDate: string }): Promise<ExportOutcome> => {
      // Called through the SDK (not a nested mutation) so a failure is toasted once, by the
      // shared MutationCache on this mutation.
      const { data: accepted } =
        await AdminWriteOff__AccountingApi119.adminWriteoffAccountingControllerCreateRefundExport({
          body: period,
          throwOnError: true,
        });
      const kept = { exportId: accepted.exportId, ...period };
      setPendingExports((current) => {
        const next = [kept, ...current];
        writePendingExports(staffId, next);
        return next;
      });

      for (let attempt = 0; attempt < EXPORT_POLL_MAX_ATTEMPTS; attempt += 1) {
        await sleep(EXPORT_POLL_INTERVAL_MS);
        const polled = await fetchExportRows(queryClient, [accepted.exportId]);
        const row = polled.find((item) => item.exportId === accepted.exportId);
        if (!row || isExportRunning(row)) continue;
        if (row.status === 'failed' || row.status === 'expired') {
          forgetExport(accepted.exportId);
          throw exportError(row.failureReason ?? 'CSVの作成に失敗しました');
        }
        if (row.totalRecords === 0) {
          forgetExport(accepted.exportId);
          return { kind: 'empty' };
        }
        // Never download here: after the poll the click's user activation is gone and browsers
        // block it — the toast action / pending list starts the download from a click
        return { kind: 'ready', exportId: accepted.exportId };
      }
      return { kind: 'timeout' };
    },
    onSuccess: (outcome) => {
      if (outcome.kind === 'ready') {
        const { exportId } = outcome;
        toast.success('CSVを作成しました', {
          action: { label: 'ダウンロード', onClick: () => downloadMutation.mutate(exportId) },
        });
      } else if (outcome.kind === 'empty') toast.info('対象期間に出力対象の返金はありません');
      else {
        toast.info('CSVを作成中です', {
          description: '作成には最大1時間ほどかかります。完了後にこの画面からダウンロードできます',
        });
        return;
      }
      setOpen(false);
    },
    onSettled: () => {
      submittingRef.current = false;
    },
  });

  const pendingIds = pendingExports.map((item) => item.exportId);
  const pendingRows = useExportRows(
    pendingIds,
    open && pendingIds.length > 0 && !exportMutation.isPending,
  );

  function openDialog() {
    setPendingExports(readPendingExports(staffId));
    const today = new Date();
    const to = defaultToDate ? new Date(defaultToDate) : today;
    setRange({
      from: defaultFromDate ? new Date(defaultFromDate) : startOfMonth(today),
      to: to > today ? today : to,
    });
    setOpen(true);
  }

  const today = toIsoDate(new Date());
  const fromDate = range?.from ? toIsoDate(range.from) : null;
  const toDate = range?.to ? toIsoDate(range.to) : fromDate;
  const rangeError =
    fromDate && toDate && toDate > today ? '終了日は今日以前を指定してください' : undefined;
  const canSubmit = !!fromDate && !!toDate && !rangeError && !exportMutation.isPending;

  function handleSubmit() {
    if (!canSubmit || !fromDate || !toDate || submittingRef.current) return;
    submittingRef.current = true;
    exportMutation.mutate({ fromDate, toDate });
  }

  return (
    <>
      <RoleGatedButton
        requiredPermission={Permission.SalesRefundExport}
        denyTooltip="返金CSV出力の権限がありません"
        tooltip="SBPS以外の返金済みデータのみ対象"
        variant="outline"
        className="gap-1"
        disabled={exportMutation.isPending}
        onClick={openDialog}
      >
        <Download className="size-4" />
        {exportMutation.isPending ? 'CSV作成中...' : '返金CSV出力'}
      </RoleGatedButton>

      <Dialog open={open} onOpenChange={(value) => !exportMutation.isPending && setOpen(value)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>返金CSV出力</DialogTitle>
            <DialogDescription>
              SBPS以外の返金済みデータを出力します。期間は返金日で指定してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              返金日 <span className="text-destructive">*</span>
            </Label>
            <DateRangePicker
              date={range}
              placeholder="期間を選択"
              className="w-full justify-start gap-2 text-xs font-normal"
              onDateChange={setRange}
            />
            {rangeError && <p className="text-destructive text-xs">{rangeError}</p>}
          </div>
          {pendingExports.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs font-medium">作成を依頼したCSV</Label>
              <ul className="space-y-1.5">
                {pendingExports.map((item) => {
                  const row = pendingRows?.find((r) => r.exportId === item.exportId);
                  return (
                    <PendingExportRow
                      key={item.exportId}
                      item={item}
                      row={row}
                      isLoaded={pendingRows !== undefined}
                      isDownloading={
                        downloadMutation.isPending && downloadMutation.variables === item.exportId
                      }
                      onDownload={() => downloadMutation.mutate(item.exportId)}
                      onDismiss={() => forgetExport(item.exportId)}
                    />
                  );
                })}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={exportMutation.isPending}
              onClick={() => setOpen(false)}
            >
              キャンセル
            </Button>
            <Button disabled={!canSubmit} onClick={handleSubmit}>
              {exportMutation.isPending ? 'CSV作成中...' : '出力する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PendingExportRowProps {
  item: PendingExport;
  row: AccountingExportListItemDto | undefined;
  /** The list answered — a kept id it does not return is gone (other account, deleted) */
  isLoaded: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  onDismiss: () => void;
}

function getSettledLabel(row: AccountingExportListItemDto | undefined): string {
  if (!row) return '見つかりません';
  if (row.status === 'exported') return '対象の返金なし';
  return row.status === 'expired' ? '有効期限切れ' : '作成失敗';
}

function PendingExportRow({
  item,
  row,
  isLoaded,
  isDownloading,
  onDownload,
  onDismiss,
}: Readonly<PendingExportRowProps>) {
  const period = `${item.fromDate.replaceAll('-', '/')}〜${item.toDate.replaceAll('-', '/')}`;
  const isRunning = row ? isExportRunning(row) : !isLoaded;
  let status: React.ReactNode;
  if (isRunning) {
    status = <span className="text-muted-foreground">作成中</span>;
  } else if (row?.status === 'exported' && row.totalRecords > 0) {
    status = (
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1"
        disabled={isDownloading}
        onClick={onDownload}
      >
        <Download className="size-3.5" />
        ダウンロード
      </Button>
    );
  } else {
    status = (
      <span className="flex items-center gap-2">
        <span className="text-muted-foreground">{getSettledLabel(row)}</span>
        <Button size="sm" variant="ghost" className="h-7" onClick={onDismiss}>
          削除
        </Button>
      </span>
    );
  }
  return (
    <li className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0">
        <span className="tabular-nums">{period}</span>
        {row && (
          <span className="text-muted-foreground ml-2">依頼 {formatDateTime(row.requestedAt)}</span>
        )}
      </span>
      {status}
    </li>
  );
}
