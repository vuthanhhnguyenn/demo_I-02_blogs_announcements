'use client';

import { useState } from 'react';

import { Loader2 } from 'lucide-react';

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
  TRANSFER_COMMENT_MAX_LENGTH,
  TRANSFER_COMMENT_TEXTAREA_CLASS,
} from '../_constants/constants';

interface TransferBulkApproveDialogProps {
  open: boolean;
  selectedCount: number;
  /** Selected FIT365 cases — approved at their current (source or destination) step. */
  selectedTwoStepCount: number;
  isPending: boolean;
  onConfirm: (comment: string | undefined) => void;
  onOpenChange: (open: boolean) => void;
}

export function TransferBulkApproveDialog({
  open,
  selectedCount,
  selectedTwoStepCount,
  isPending,
  onConfirm,
  onOpenChange,
}: Readonly<TransferBulkApproveDialogProps>) {
  const [comment, setComment] = useState('');

  // Cleared here rather than in an effect: the close event is what should reset the draft, and
  // resetting during render would cascade an extra render on every open/close.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setComment('');
    onOpenChange(nextOpen);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{selectedCount}件の移籍申請を承認しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            選択した各案件の現在のステップを承認します。JOYFITの案件は承認後、システムが自動で移籍を実行します。この操作は取り消せません。
            {selectedTwoStepCount > 0 && (
              <>
                <br />
                FIT365の案件（{selectedTwoStepCount}
                件）は現在のステップ（移籍元／移籍先）の承認として処理されます。
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Label className="text-sm">
            コメント
            <OptionalMark />
          </Label>
          <Textarea
            className={TRANSFER_COMMENT_TEXTAREA_CLASS}
            rows={3}
            maxLength={TRANSFER_COMMENT_MAX_LENGTH}
            placeholder="承認コメントを入力してください（任意）"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => onConfirm(comment.trim() || undefined)}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            承認する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
