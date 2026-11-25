'use client';

import { useState } from 'react';

import { formatISODateLocal, jstToday } from '@/utils/date.util';
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
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { adminLockerSlotOpsControllerReleaseMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LockerContractDetailDto } from '@/lib/api-real/types.gen';

import { invalidateLockerQueries } from '../../../_utils/locker-query-invalidation.util';

/** API-101 §6.2: `ReleaseLockerSlotBodyDto.reason` max length */
const RELEASE_REASON_MAX_LENGTH = 500;

interface LockerContractTerminateDialogProps {
  contract: LockerContractDetailDto;
  slotLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * 解約 = `POST /locker-slots/{slotId}/release` (API-101 §6.2). A failure — e.g. 422 E-LOC-015 for an
 * `active` contract inside its fee period — is toasted with its `userMessage` by the shared
 * MutationCache, so no local onError here.
 */
export function LockerContractTerminateDialog({
  contract,
  slotLabel,
  open,
  onOpenChange,
  onSuccess,
}: LockerContractTerminateDialogProps) {
  const queryClient = useQueryClient();
  const [cancellationDate, setCancellationDate] = useState<Date | undefined>();
  // API-101 §6.2 #2.2: a 「翌月から」 locker can only be withdrawn before its start date
  const withdrawBefore = contract.optionStatus === 'pending_start' ? contract.contractedAt : null;
  const [reason, setReason] = useState('');
  const releaseMutation = useMutation({
    ...adminLockerSlotOpsControllerReleaseMutation(),
    onSuccess: () => {
      toast.success('ロッカー契約を解約しました');
      onSuccess?.();
    },
    onSettled: () => invalidateLockerQueries(queryClient),
  });

  const reset = () => {
    setCancellationDate(undefined);
    setReason('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  };

  const handleConfirm = () => {
    if (!cancellationDate) return;

    releaseMutation.mutate(
      {
        path: { slotId: contract.slotId },
        body: {
          cancellationDate: formatISODateLocal(cancellationDate),
          reason: reason.trim() || undefined,
          // No `expectedSlotUpdatedAt`: the detail's `updatedAt` is the option contract's, not the slot's
        },
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ロッカー契約を解約しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            {contract.memberName ?? '—'} さんのロッカー契約（{slotLabel}
            ）を解約します。解約日を指定してください。解約日経過後、スロットは自動的に「開放待ち」状態へ遷移します。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Label className="text-sm">
            解約日
            <span className="text-destructive ml-1">*</span>
          </Label>
          <DatePicker
            date={cancellationDate}
            placeholder="日付を選択"
            onDateChange={setCancellationDate}
            disabledDate={(date) =>
              date < jstToday() ||
              (withdrawBefore !== null && formatISODateLocal(date) >= withdrawBefore)
            }
          />
          {withdrawBefore && (
            <p className="text-muted-foreground text-xs">
              利用開始前のため、利用開始日（{withdrawBefore}）より前の日付のみ指定できます。
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            解約日まではスロット状態「使用中」を維持します。解約日経過後にシステムバッチで「開放待ち」へ自動遷移します。
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-sm">解約理由</Label>
          <Textarea
            value={reason}
            maxLength={RELEASE_REASON_MAX_LENGTH}
            placeholder="任意"
            rows={3}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={reset} disabled={releaseMutation.isPending}>
            キャンセル
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleConfirm}
            disabled={!cancellationDate || releaseMutation.isPending}
          >
            {releaseMutation.isPending ? '処理中...' : '解約を確定する'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
