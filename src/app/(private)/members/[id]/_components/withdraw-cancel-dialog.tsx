'use client';
import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
  adminSuspensionWithdrawalControllerCancelMutation,
  adminSuspensionWithdrawalControllerListQueryKey,
  adminSuspensionWithdrawalControllerWithdrawalDetailQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { MEMBER_STATUS_LABELS } from '../../_constants/constants';
import { invalidateMemberContractReads } from '../_utils/member-cache.util';

// `CancelWithdrawalRequestDto.comment` caps at 500 on the server, half of the shared
// TEXTAREA_MAX_LENGTH — cap the field here so the request cannot be rejected.
const WITHDRAW_CANCEL_COMMENT_MAX_LENGTH = 500;

interface WithdrawCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  /** 退会取消 is keyed by the withdrawal application — from `currentMainContract.pendingWithdrawal`. */
  withdrawalApplicationId?: string;
}

export function WithdrawCancelDialog({
  open,
  onOpenChange,
  memberId,
  withdrawalApplicationId,
}: Readonly<WithdrawCancelDialogProps>) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const { acquire, release } = useSingleFlight();

  const { mutate, isPending } = useMutation({
    ...adminSuspensionWithdrawalControllerCancelMutation(),
    onSettled: release,
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
      void queryClient.invalidateQueries({
        queryKey: adminSuspensionWithdrawalControllerListQueryKey(),
      });
    },
    onSuccess: (data, variables) => {
      // A-03 FR-002 v3 restores the status the member held before the application, which is
      // 有効 in the ordinary case and 仮会員 when the usage start date is still ahead — so the
      // confirmation repeats what the server actually set rather than assuming 有効.
      toast.success('退会を取り消しました', {
        description: `ステータスを「${MEMBER_STATUS_LABELS[data.memberStatus]}」に戻しました`,
      });
      handleClose();
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
      void queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      // The cancelled application leaves the A-03 list and its detail reads 取り消し済み.
      void queryClient.invalidateQueries({
        queryKey: adminSuspensionWithdrawalControllerListQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: adminSuspensionWithdrawalControllerWithdrawalDetailQueryKey({
          path: { withdrawalApplicationId: variables.path.withdrawalApplicationId },
        }),
      });
      void invalidateMemberContractReads(queryClient, memberId);
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => setComment(''), 300);
  };

  // A-03 FR-002: the reason is recorded on the application history. The server requires it too
  // (`comment` is required, minLength 1 — an empty one comes back as 400 `E-VAL-001`).
  const trimmedComment = comment.trim();

  const handleConfirm = () => {
    if (!withdrawalApplicationId || !trimmedComment || !acquire()) return;
    mutate({
      path: { withdrawalApplicationId },
      body: { comment: trimmedComment },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>退会を取り消しますか？</AlertDialogTitle>
          <AlertDialogDescription>会員ステータスを「有効」に戻します。</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 px-1 pb-2">
          <Label htmlFor="withdraw-cancel-comment" className="text-sm font-medium">
            取り消し事由 <span className="text-destructive ml-1 text-xs">*</span>
          </Label>
          <Textarea
            id="withdraw-cancel-comment"
            rows={3}
            maxLength={WITHDRAW_CANCEL_COMMENT_MAX_LENGTH}
            placeholder="例：会員から継続の申し出があったため"
            // The shared Textarea is `field-sizing-content`: a long value stretched the dialog past
            // the viewport and an unbroken token widened it off-screen. Fix the box and scroll.
            className="field-sizing-fixed max-h-40 min-h-20 resize-none overflow-y-auto text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isPending}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction disabled={isPending || !trimmedComment} onClick={handleConfirm}>
            取り消す
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
