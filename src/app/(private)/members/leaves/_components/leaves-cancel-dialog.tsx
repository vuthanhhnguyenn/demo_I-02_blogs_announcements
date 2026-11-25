'use client';

// Interactive: owns the confirmation dialog and drives the cancellation mutation.
import { useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

import {
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
  adminSuspensionWithdrawalControllerCancelMutation,
  adminSuspensionWithdrawalControllerListQueryKey,
  adminSuspensionWithdrawalControllerWithdrawalDetailQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { SuspWdrListItemDto } from '@/lib/api-real/types.gen';

import { invalidateMemberContractReads } from '../../[id]/_utils/member-cache.util';
import { memberDisplayName } from '../_constants/constants';
import { LeaveCancelReasonField } from './leave-cancel-reason-field';

type LeaveRow = SuspWdrListItemDto;

interface Props {
  /** The row awaiting confirmation, or null when the dialog is closed. */
  target: LeaveRow | null;
  onOpenChange: (open: boolean) => void;
}

export function LeavesCancelDialog({ target, onOpenChange }: Readonly<Props>) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  // `isPending` only flips after a re-render, so a double click needs a synchronous latch.
  const submittingRef = useRef(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) setReason('');
    onOpenChange(open);
  };

  const cancelMutation = useMutation({
    ...adminSuspensionWithdrawalControllerCancelMutation(),
    onSuccess: (_data, variables) => {
      const name = target ? memberDisplayName(target.member) : '';
      toast.success(
        `${name} の退会申請を取り消しました。会員ステータスを有効（通常）に戻しました。`,
      );
      handleOpenChange(false);
      void queryClient.invalidateQueries({
        queryKey: adminSuspensionWithdrawalControllerListQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: adminSuspensionWithdrawalControllerWithdrawalDetailQueryKey({
          path: { withdrawalApplicationId: variables.path.withdrawalApplicationId },
        }),
      });
      // The cancel restores the member's status, so every member screen reading it is stale.
      if (target) {
        void queryClient.invalidateQueries({
          queryKey: adminMemberControllerDetailQueryKey({
            path: { memberId: target.member.memberId },
          }),
        });
        void invalidateMemberContractReads(queryClient, target.member.memberId);
      }
      void queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
    },
    /*
     * FR-052 — a refused cancellation keeps the operator on the list: the dialog stays open
     * and the server's reason reaches them through the shared MutationCache handler.
     * `cancellable` is a snapshot, so a refusal (409 E-WDR-200 / 422 E-WDR-201) reloads
     * the rows to show the current state (qa-155).
     */
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: adminSuspensionWithdrawalControllerListQueryKey(),
      });
    },
  });

  return (
    <AlertDialog open={target !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="grid-cols-1">
        <AlertDialogHeader>
          <AlertDialogTitle>退会取り消しを実行しますか？</AlertDialogTitle>
          <AlertDialogDescription className="break-all">
            {target && (
              <>
                <strong>{memberDisplayName(target.member)}</strong>（
                {target.member.memberNumber ?? '—'}）の退会申請を取り消します。
                <br />
                取り消し後、会員ステータスは有効（通常）に戻ります。この操作は記録されます。
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <LeaveCancelReasonField
          value={reason}
          onChange={setReason}
          disabled={cancelMutation.isPending}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelMutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            disabled={!reason.trim() || cancelMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              if (!target || submittingRef.current) return;
              submittingRef.current = true;
              cancelMutation.mutate(
                {
                  path: { withdrawalApplicationId: target.applicationId },
                  body: { comment: reason.trim() },
                },
                { onSettled: () => (submittingRef.current = false) },
              );
            }}
          >
            {cancelMutation.isPending ? '処理中...' : '取り消しを実行する'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
