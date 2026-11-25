'use client';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { OptionalMark } from '@/components/common/field-marker';
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
  adminTransferControllerDetailQueryKey,
  adminTransferControllerListQueryKey,
  adminTransferControllerRejectMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { TransferDetailDto } from '@/lib/api-real/types.gen';

import { getTransferMemberName } from '../../_components/transfer-table-columns';
import {
  TRANSFER_COMMENT_MAX_LENGTH,
  TRANSFER_COMMENT_TEXTAREA_CLASS,
  isTransferApplicationPending,
} from '../../_constants/constants';
import { useSubmitLock } from '../../_hooks/use-submit-lock';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: TransferDetailDto;
}

export function TransferRejectDialog({ open, onOpenChange, transfer }: Readonly<Props>) {
  const queryClient = useQueryClient();
  const submitLock = useSubmitLock();
  const [comment, setComment] = useState('');

  // Cleared on close rather than in an effect, so reopening always starts from a blank draft
  // without triggering a cascading render.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setComment('');
    onOpenChange(nextOpen);
  }

  function refreshTransfer() {
    void queryClient.invalidateQueries({ queryKey: adminTransferControllerListQueryKey() });
    void queryClient.invalidateQueries({
      queryKey: adminTransferControllerDetailQueryKey({
        path: { transferApplicationId: transfer.transferApplicationId },
      }),
    });
  }

  const { mutate: reject, isPending } = useMutation({
    ...adminTransferControllerRejectMutation(),
    onSettled: submitLock.release,
    onSuccess: () => {
      toast.success('移籍申請を否認しました');
      refreshTransfer();
      onOpenChange(false);
    },
    onError: () => {
      // See the approve dialog: a 409 leaves a stale status with live buttons.
      refreshTransfer();
      onOpenChange(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>移籍申請を否認しますか？</AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            {getTransferMemberName(transfer)}{' '}
            さんの移籍申請を否認します。否認後、申請者へ通知され、案件はクローズされます。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Label className="text-sm">
            コメント
            <OptionalMark />
          </Label>
          <Textarea
            className={TRANSFER_COMMENT_TEXTAREA_CLASS}
            placeholder="否認理由を入力してください（任意）"
            rows={3}
            maxLength={TRANSFER_COMMENT_MAX_LENGTH}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            onClick={() => {
              // Only a pending application can be decided; the lock turns a stale screen into
              // a 409 E-TRF-005 instead of deciding a step the operator never saw.
              const { status } = transfer;
              if (!isTransferApplicationPending(status)) return;
              submitLock.run(() =>
                reject({
                  path: { transferApplicationId: transfer.transferApplicationId },
                  body: { comment: comment.trim() || undefined, expectedStatus: status },
                }),
              );
            }}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            否認する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
