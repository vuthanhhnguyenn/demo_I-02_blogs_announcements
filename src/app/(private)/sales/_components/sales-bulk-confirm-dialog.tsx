'use client';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { adminSalesBillingControllerBulkConfirmMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  Api114BillingListItemDto,
  Api114BulkConfirmFailureDto,
} from '@/lib/api-real/types.gen';

import { BULK_CONFIRM_FAILURE_LABELS } from '../_constants/sales-labels.constant';
import { invalidateSalesBillingQueries } from '../_utils/sales-query.util';

/** API-114 §8 `mode=ids` accepts 1–200 ids (> 200 → 400 E-BIL-104) */
const BULK_CONFIRM_MAX_IDS = 200;

interface SalesBulkConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  unconfirmedSelectedRecords: Api114BillingListItemDto[];
  onSuccess?: () => void;
}

export function SalesBulkConfirmDialog({
  open,
  onOpenChange,
  selectedIds,
  unconfirmedSelectedRecords,
  onSuccess,
}: Readonly<SalesBulkConfirmDialogProps>) {
  const queryClient = useQueryClient();
  // The publicId is kept with each failure: `onSuccess` clears the selection the names come from
  const [failures, setFailures] = useState<Array<Api114BulkConfirmFailureDto & { label: string }>>(
    [],
  );
  const [succeededCount, setSucceededCount] = useState(0);

  const { acquire, release } = useSingleFlight();

  const confirmMutation = useMutation({
    ...adminSalesBillingControllerBulkConfirmMutation(),
    onSettled: release,
    onSuccess: (result) => {
      invalidateSalesBillingQueries(queryClient);
      // `mode=ids` always answers 200 with the per-id split (202 is the filter-mode job)
      if (!('succeeded' in result)) return;
      const { successCount } = result.summary;
      onSuccess?.();
      // One message per outcome: rows another user confirmed meanwhile (E-BIL-101) are named in
      // the toast; any other failure opens the per-row list instead
      if (result.failed.length > 0 && result.failed.some((f) => f.code !== 'E-BIL-101')) {
        setSucceededCount(successCount);
        setFailures(
          result.failed.map((f) => ({ ...f, label: publicIdById.get(f.billingId) ?? f.billingId })),
        );
        return;
      }
      const alreadyConfirmed = result.failed.map(
        (f) => publicIdById.get(f.billingId) ?? f.billingId,
      );
      if (alreadyConfirmed.length === 0) {
        toast.success(`${successCount}件を確定しました`);
      } else if (successCount > 0) {
        toast.success(`${successCount}件を確定しました`, {
          description: `${alreadyConfirmed.join('、')} は既に確定済みのため対象外です`,
        });
      } else {
        toast.info(`${alreadyConfirmed.join('、')} は既に確定済みです`);
      }
      onOpenChange(false);
    },
  });

  const handleOpenChange = (next: boolean) => {
    // Esc / overlay / キャンセル wait for the request: its failures would land on the next open
    if (!next && confirmMutation.isPending) return;
    onOpenChange(next);
    if (!next) setFailures([]);
  };

  const unconfirmedSelectedTotal = unconfirmedSelectedRecords.reduce(
    (sum, item) => sum + item.totalAmount,
    0,
  );
  const targetIds = unconfirmedSelectedRecords.map((item) => item.billingId);
  const isOverLimit = targetIds.length > BULK_CONFIRM_MAX_IDS;
  const publicIdById = new Map(
    unconfirmedSelectedRecords.map((item) => [item.billingId, item.publicId]),
  );

  if (failures.length > 0) {
    return (
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>一部の売上を確定できませんでした</AlertDialogTitle>
            <AlertDialogDescription>
              {succeededCount > 0 && `${succeededCount}件を確定しました。`}
              {failures.length}件の売上は確定されませんでした。内容を確認してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="bg-muted/50 max-h-60 space-y-1 overflow-y-auto rounded-lg border p-3 text-xs">
            {failures.map((failure) => (
              <li key={failure.billingId} className="flex justify-between gap-3">
                <span className="font-mono">{failure.label}</span>
                <span className="text-muted-foreground text-right">
                  {BULK_CONFIRM_FAILURE_LABELS[failure.code] ?? failure.message}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button onClick={() => handleOpenChange(false)}>閉じる</Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="bg-warning/15 flex size-8 items-center justify-center rounded-full">
              <Lock className="text-warning size-4" />
            </span>
            選択した売上を一括確定しますか？
          </AlertDialogTitle>
          <AlertDialogDescription>
            対象の売上を一括確定します。確定後は明細の追加・変更ができなくなります。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="bg-muted/50 space-y-2 rounded-lg border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">選択件数</span>
            <span className="tabular-nums">{selectedIds.length}件</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">確定対象</span>
            <span className="tabular-nums">{targetIds.length}件</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>売上合計</span>
            <span className="tabular-nums">
              ¥{unconfirmedSelectedTotal.toLocaleString('ja-JP')}
            </span>
          </div>
        </div>
        {isOverLimit && (
          <p className="text-destructive text-xs">
            一度に確定できるのは{BULK_CONFIRM_MAX_IDS}件までです。
          </p>
        )}
        <div className="flex justify-end gap-2">
          <AlertDialogCancel disabled={confirmMutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmMutation.isPending || targetIds.length === 0 || isOverLimit}
            onClick={() => {
              if (!acquire()) return;
              confirmMutation.mutate({ body: { mode: 'ids', billingIds: targetIds } });
            }}
          >
            確定する
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
