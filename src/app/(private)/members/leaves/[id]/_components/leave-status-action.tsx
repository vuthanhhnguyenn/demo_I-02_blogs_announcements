'use client';

// Interactive: owns dialog state and drives the cancellation mutation.
import { useRef, useState } from 'react';

import Link from 'next/link';

import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { StatusCard } from '@/components/common/status-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import {
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
  adminSuspensionWithdrawalControllerCancelMutation,
  adminSuspensionWithdrawalControllerListQueryKey,
  adminSuspensionWithdrawalControllerWithdrawalDetailQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { SuspWdrDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { invalidateMemberContractReads } from '../../../[id]/_utils/member-cache.util';
import { LeaveCancelReasonField } from '../../_components/leave-cancel-reason-field';
import {
  CancellationBlockedReason,
  LeaveStatus,
  STATUS_ICON_CONFIG,
  lastUpdatedAt,
  memberDisplayName,
} from '../../_constants/constants';

interface Props {
  leave: SuspWdrDetailDto;
  /** Resolved by the page from `displayStatus` / `status`; null for an unknown value. */
  status: LeaveStatus | null;
}

export function LeaveStatusAction({ leave, status }: Readonly<Props>) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  // `isPending` only flips after a re-render, so a double click needs a synchronous latch.
  const submittingRef = useRef(false);
  const queryClient = useQueryClient();
  const memberName = memberDisplayName(leave.member);
  const detailQueryKey = adminSuspensionWithdrawalControllerWithdrawalDetailQueryKey({
    path: { withdrawalApplicationId: leave.applicationId },
  });

  const handleCancelOpenChange = (open: boolean) => {
    setCancelOpen(open);
    if (!open) setCancelReason('');
  };

  const cancelMutation = useMutation({
    ...adminSuspensionWithdrawalControllerCancelMutation(),
    onSuccess: () => {
      toast.success(
        `${memberName} さんの退会申請を取り消しました。会員ステータスを有効（通常）に戻しました。`,
      );
      handleCancelOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: detailQueryKey });
      void queryClient.invalidateQueries({
        queryKey: adminSuspensionWithdrawalControllerListQueryKey(),
      });
      // The cancel restores the member's status, so every member screen reading it is stale.
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({
          path: { memberId: leave.member.memberId },
        }),
      });
      void queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      void invalidateMemberContractReads(queryClient, leave.member.memberId);
    },
    /*
     * FR-082a — a failure keeps the operator on this view with the application unchanged,
     * and the server's message reaches them through the shared MutationCache handler. An
     * `onError` toast here would only duplicate it. `cancellable` is a snapshot, so a
     * refusal reloads the detail to show why the button is now blocked (qa-155).
     */
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: detailQueryKey });
    },
  });

  const statusConfig = status ? STATUS_ICON_CONFIG[status] : null;

  const isWithdrawalScheduled = status === LeaveStatus.WITHDRAWAL_SCHEDULED;
  const isSuspended = status === LeaveStatus.SUSPENDED;
  const isCompleted = status === LeaveStatus.COMPLETED;

  /**
   * FR-077 — an action area exists only for these states. Approval / rejection belong to
   * A-01-01 and withdrawal execution to the System batch; 休会中 only carries a hand-off,
   * since releasing a suspension early is A-01-01's status change.
   */
  const hasAction = isWithdrawalScheduled || isSuspended || isCompleted;

  /**
   * FR-078 — the button explains itself in both directions: `denyTooltip` covers the
   * missing permission, `blockedTooltip` the server's date restriction. They are separate
   * props because `RoleGatedButton` only renders `denyTooltip` on the role-denied branch;
   * an operator who *has* the permission but faces a non-cancellable application would
   * otherwise get a greyed-out button with no reason. Cancellability is server-derived —
   * never recomputed from dates here.
   */
  const denyTooltip = '退会取り消しの権限がありません';
  const blockedTooltip = leave.cancellable
    ? undefined
    : leave.cancellationBlockedReason === CancellationBlockedReason.USAGE_STARTED
      ? leave.usageStartDate
        ? `利用開始日（${formatDateYYYYMMDD(leave.usageStartDate)}）以降のため取り消し不可`
        : '利用開始日以降のため取り消し不可'
      : '退会処理が開始されているため取り消し不可';

  return (
    <>
      <div className="sticky top-0 flex flex-col gap-4">
        <StatusCard
          tone={statusConfig?.tone ?? 'muted'}
          icon={statusConfig?.icon ?? Clock}
          label={statusConfig?.label ?? '—'}
          meta={[
            `最終更新: ${formatDateYYYYMMDD_HHMM(lastUpdatedAt(leave))}`,
            ...(isSuspended
              ? ['休会の解除（早期復帰）は会員詳細のステータス変更から行います']
              : []),
          ]}
          action={
            hasAction && (
              <div className="flex w-full flex-col gap-2">
                {/* Cancelling a scheduled withdrawal is gated by A-03 権限マトリクス / FR-006. */}
                {isWithdrawalScheduled && (
                  <RoleGatedButton
                    requiredPermission={Permission.MembersCancelWithdrawal}
                    denyTooltip={denyTooltip}
                    tooltip={blockedTooltip}
                    variant="outline"
                    fullWidth
                    disabled={!leave.cancellable || cancelMutation.isPending}
                    onClick={() => setCancelOpen(true)}
                  >
                    退会取り消し
                  </RoleGatedButton>
                )}
                {isSuspended && (
                  <Button
                    variant="outline"
                    className="w-full"
                    nativeButton={false}
                    render={<Link href={navigate('/members/[id]', leave.member.memberId)} />}
                  >
                    会員詳細で休会を解除する
                  </Button>
                )}
                {isCompleted && (
                  <p className="text-muted-foreground py-2 text-center text-xs">
                    処理が完了しています
                  </p>
                )}
              </div>
            )
          }
        />
      </div>

      {/* FR-080 — this screen keeps its own wording; the list dialog keeps its own (Q-08). */}
      <AlertDialog open={cancelOpen} onOpenChange={handleCancelOpenChange}>
        <AlertDialogContent className="grid-cols-1">
          <AlertDialogHeader>
            <AlertDialogTitle>退会を取り消しますか？</AlertDialogTitle>
            <AlertDialogDescription className="break-all">
              {memberName}{' '}
              さんの退会予定を取り消します。取り消し後、会員ステータスは有効（通常）に戻ります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <LeaveCancelReasonField
            value={cancelReason}
            onChange={setCancelReason}
            disabled={cancelMutation.isPending}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={!cancelReason.trim() || cancelMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (submittingRef.current) return;
                submittingRef.current = true;
                cancelMutation.mutate(
                  {
                    path: { withdrawalApplicationId: leave.applicationId },
                    body: { comment: cancelReason.trim() },
                  },
                  { onSettled: () => (submittingRef.current = false) },
                );
              }}
            >
              {cancelMutation.isPending ? '処理中...' : '取り消す'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
