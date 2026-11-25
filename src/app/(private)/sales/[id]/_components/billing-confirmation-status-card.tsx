'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';

import { getApiErrorCode, resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminSalesBillingControllerConfirmMutation,
  adminSalesBillingControllerUnconfirmMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { Permission } from '@/types/permission.type';

import { formatYen } from '../../_constants/sales-labels.constant';
import { toBillingDate } from '../../_utils/billing-date.util';
import {
  BILLING_ERROR_CODE,
  type BillingHeader,
  invalidateBillingQueries,
  isBillingConfirmed,
} from '../_utils/billing-detail-api.util';

interface BillingConfirmationStatusCardProps {
  header: BillingHeader;
}

/** FR-002 個別確定 / FR-003 確定後の変更 — API-114 §7 confirm, §9 unconfirm */
export function BillingConfirmationStatusCard({
  header,
}: Readonly<BillingConfirmationStatusCardProps>) {
  const queryClient = useQueryClient();
  const { billingId } = header;
  const isConfirmed = isBillingConfirmed(header);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  // S2 (FR-003 異常系): the API refused the unconfirm with 409 E-BIL-105 — ask again
  const [pspWarningOpen, setPspWarningOpen] = useState(false);

  const { acquire, release } = useSingleFlight();

  const confirmMutation = useMutation({
    ...adminSalesBillingControllerConfirmMutation(),
    onSettled: release,
    onSuccess: () => {
      toast.success('この請求を確定しました');
      invalidateBillingQueries(queryClient);
    },
    // Another tab may have changed the billing (e.g. already confirmed, E-BIL-101): the shared
    // toast says why, the refetch brings the banner and buttons up to date
    onError: () => invalidateBillingQueries(queryClient),
  });

  const unconfirmMutation = useMutation({
    ...adminSalesBillingControllerUnconfirmMutation(),
    onSettled: release,
    // E-BIL-105 opens the PSP warning instead of a toast; every other failure is toasted below
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      toast.success('請求を未確定に戻しました');
      setPspWarningOpen(false);
      invalidateBillingQueries(queryClient);
    },
    onError: (error) => {
      if (getApiErrorCode(error) === BILLING_ERROR_CODE.pspSentAcknowledgeRequired) {
        setPspWarningOpen(true);
        return;
      }
      setPspWarningOpen(false);
      toast.error(resolveApiErrorMessage(error));
      invalidateBillingQueries(queryClient);
    },
  });

  const isPending = confirmMutation.isPending || unconfirmMutation.isPending;
  const isCancelled = header.collectionStatus === 'cancelled';

  const handleToggle = () => {
    if (!acquire()) return;
    if (isConfirmed) {
      unconfirmMutation.mutate({ path: { billingId }, body: {} });
    } else {
      confirmMutation.mutate({ path: { billingId }, body: {} });
    }
    setConfirmDialogOpen(false);
  };

  const handleAcknowledgedUnconfirm = () => {
    if (!acquire()) return;
    unconfirmMutation.mutate({ path: { billingId }, body: { acknowledgePspSent: true } });
  };

  return (
    <Card
      className={`gap-0 py-0 ${
        isConfirmed ? 'border-success/30 bg-success/15' : 'border-warning/30 bg-warning/15'
      }`}
    >
      <div className="flex items-center gap-4 px-6 py-4">
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
            isConfirmed ? 'bg-success/15' : 'bg-warning/15'
          }`}
        >
          {isConfirmed ? (
            <CheckCircle2 className="text-success size-4" />
          ) : (
            <AlertTriangle className="text-warning size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${isConfirmed ? 'text-success' : 'text-warning'}`}>
            {isConfirmed ? '確定済み' : '未確定'}
          </p>
          {isConfirmed && header.confirmedBy && (
            <p className="text-muted-foreground text-xs">
              確定者: {header.confirmedBy.staffName ?? '—'}
              {header.confirmedAt && <> / {formatDateYYYYMMDD_HHMM(header.confirmedAt)}</>}
            </p>
          )}
        </div>
        <RoleGatedButton
          requiredPermission={Permission.SalesConfirm}
          denyTooltip="請求確定の権限がありません"
          variant={isConfirmed ? 'outline' : 'default'}
          size="sm"
          className="h-8 shrink-0 gap-2 text-xs"
          // API-115: a cancelled billing can be neither confirmed nor unconfirmed (E-BIL-106)
          disabled={isPending || isCancelled}
          tooltip={isCancelled ? 'キャンセル済みの請求は確定状態を変更できません' : undefined}
          onClick={() => setConfirmDialogOpen(true)}
        >
          {isConfirmed ? (
            <>
              <Unlock className="size-3" />
              未確定に戻す
            </>
          ) : (
            <>
              <Lock className="size-3" />
              この請求を確定する
            </>
          )}
        </RoleGatedButton>
      </div>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-warning size-5" />
              {isConfirmed ? '請求を未確定に戻す' : '請求を確定'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isConfirmed
                ? '確定済みの請求を未確定に戻します。未確定に戻した後は、再度確定操作を実行する必要があります。'
                : '確定後は請求明細の追加・変更ができなくなります。'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isConfirmed ? (
            <Alert className="bg-destructive/15 border-destructive/20 text-destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">
                決済事業者への送信が完了している場合、別途決済事業者への取消処理が必要になります。
              </AlertDescription>
            </Alert>
          ) : (
            <div className="bg-muted/50 space-y-2 rounded-lg border p-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">請求ID</span>
                <span className="font-mono font-medium">{header.publicId}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">利用者</span>
                <span className="font-medium">{header.memberName ?? '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">請求日</span>
                <span className="font-medium">{toBillingDate(header.createdAt)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">請求総額</span>
                <span className="font-bold">{formatYen(header.totalAmount)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle} disabled={isPending}>
              {isConfirmed ? '未確定に戻す' : '確定する'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* S2 — FR-003 異常系: 409 E-BIL-105 → warn, then resend with acknowledgePspSent */}
      <AlertDialog open={pspWarningOpen} onOpenChange={setPspWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive size-5" />
              決済事業者へ送信済みの請求です
            </AlertDialogTitle>
            <AlertDialogDescription>
              この請求は決済事業者への送信が完了しています。未確定に戻す場合、別途決済事業者への取消処理が必要になります。続行しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-muted/50 space-y-2 rounded-lg border p-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">請求ID</span>
              <span className="font-mono font-medium">{header.publicId}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">決済事業者送信日時</span>
              <span className="font-medium">
                {header.sentAt ? formatDateYYYYMMDD_HHMM(header.sentAt) : '—'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <AlertDialogCancel disabled={unconfirmMutation.isPending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleAcknowledgedUnconfirm}
              disabled={unconfirmMutation.isPending}
            >
              送信済みを確認して未確定に戻す
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
