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

import { adminTransferControllerApproveMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { TransferDetailDto } from '@/lib/api-real/types.gen';

import { getTransferMemberName } from '../../_components/transfer-table-columns';
import {
  TRANSFER_COMMENT_MAX_LENGTH,
  TRANSFER_COMMENT_TEXTAREA_CLASS,
  isTransferApplicationPending,
} from '../../_constants/constants';
import { useSubmitLock } from '../../_hooks/use-submit-lock';
import { invalidateAfterTransferDecision } from '../../_utils/transfer-cache.util';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: TransferDetailDto;
}

export function TransferApproveDialog({ open, onOpenChange, transfer }: Readonly<Props>) {
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
    void invalidateAfterTransferDecision(queryClient, transfer);
  }

  const { mutate: approve, isPending } = useMutation({
    ...adminTransferControllerApproveMutation(),
    onSettled: submitLock.release,
    onSuccess: () => {
      toast.success('移籍申請を承認しました');
      // Both queries are invalidated so the list count and this screen agree without a manual
      // refresh (SC-002). We deliberately stay on the detail screen rather than redirecting to
      // the list: the operator needs to see the timeline advance and the comment recorded.
      refreshTransfer();
      onOpenChange(false);
    },
    onError: () => {
      // A 409 (another operator moved the request on) leaves this screen showing a stale status
      // with live buttons — refetch so it shows the true state.
      refreshTransfer();
      onOpenChange(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>移籍申請を承認しますか？</AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            {getTransferMemberName(transfer)} さんの {transfer.fromStore.name ?? '—'} から{' '}
            {transfer.toStore.name ?? '—'} への移籍を承認します。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Label className="text-sm">
            コメント
            <OptionalMark />
          </Label>
          <Textarea
            className={TRANSFER_COMMENT_TEXTAREA_CLASS}
            placeholder="承認コメントを入力してください（任意）"
            rows={3}
            maxLength={TRANSFER_COMMENT_MAX_LENGTH}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              // Only a pending application can be decided; the lock turns a stale screen into
              // a 409 E-TRF-005 instead of deciding a step the operator never saw.
              const { status } = transfer;
              if (!isTransferApplicationPending(status)) return;
              submitLock.run(() =>
                approve({
                  path: { transferApplicationId: transfer.transferApplicationId },
                  body: { comment: comment.trim() || undefined, expectedStatus: status },
                }),
              );
            }}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            承認する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
