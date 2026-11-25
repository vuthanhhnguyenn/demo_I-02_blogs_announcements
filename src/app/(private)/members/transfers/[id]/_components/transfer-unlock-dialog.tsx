'use client';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { RequiredMark } from '@/components/common/field-marker';
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

/**
 * FR-012 manual override of a 縛り期間 exclusion.
 *
 * API-091 has no separate release step: the server does not re-check the cancellation-fee period
 * on a single approve, so the override *is* the approve call, and the reason travels as its
 * `comment` (stored on the history row). There is therefore no 手動解除済み state — the
 * application moves straight on. The reason stays mandatory here because that comment is the only
 * audit trail of the override.
 */
export function TransferUnlockDialog({ open, onOpenChange, transfer }: Readonly<Props>) {
  const queryClient = useQueryClient();
  const submitLock = useSubmitLock();
  const [reason, setReason] = useState('');

  // Cleared on close rather than in an effect, so reopening always starts from a blank draft
  // without triggering a cascading render.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setReason('');
    onOpenChange(nextOpen);
  }

  function refreshTransfer() {
    void invalidateAfterTransferDecision(queryClient, transfer);
  }

  const { mutate: approve, isPending } = useMutation({
    ...adminTransferControllerApproveMutation(),
    onSettled: submitLock.release,
    onSuccess: () => {
      toast.success('管理者権限で移籍申請を承認しました');
      refreshTransfer();
      onOpenChange(false);
    },
    onError: () => {
      // A 409 means the request already moved on: refetch and close, as the other decision dialogs do.
      refreshTransfer();
      onOpenChange(false);
    },
  });

  const isReasonValid = reason.trim().length > 0;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>解約手数料期間中の移籍を強制実行しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            キャンペーン縛り期間（解約手数料期間）中ですが、管理者権限で移籍を通します。
            会員に解約手数料が発生する可能性があります。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Label className="text-sm">
            解除理由
            <RequiredMark />
          </Label>
          <Textarea
            className={TRANSFER_COMMENT_TEXTAREA_CLASS}
            placeholder="手動解除の理由を入力してください（例: 会員同意済み、会員に手数料説明済み）"
            rows={3}
            maxLength={TRANSFER_COMMENT_MAX_LENGTH}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!isReasonValid || isPending}
            onClick={() => {
              // Same optimistic lock as the regular approve: a stale screen gets 409 E-TRF-005
              // instead of deciding a step the operator never saw.
              const { status } = transfer;
              if (!isTransferApplicationPending(status)) return;
              submitLock.run(() =>
                approve({
                  path: { transferApplicationId: transfer.transferApplicationId },
                  body: { comment: reason.trim(), expectedStatus: status },
                }),
              );
            }}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            解除して移籍を通す
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
