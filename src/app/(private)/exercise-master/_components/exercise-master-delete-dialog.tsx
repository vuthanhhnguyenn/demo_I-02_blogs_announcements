'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { type ExerciseMasterRow, getMasterRowName } from '../_constants/constants';

interface ExerciseMasterDeleteDialogProps {
  open: boolean;
  label: string;
  row: ExerciseMasterRow | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function ExerciseMasterDeleteDialog({
  open,
  label,
  row,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: ExerciseMasterDeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="min-w-0 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{label}を削除しますか？</DialogTitle>
          {/* Long unbroken names/codes must wrap, or the footer is pushed off-screen. */}
          <DialogDescription className="[overflow-wrap:anywhere]">
            「{row ? getMasterRowName(row) : ''}」（コード: {row?.code}
            ）を論理削除します。データは保持され、無効な状態として扱われます。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="button" variant="destructive" disabled={isSubmitting} onClick={onConfirm}>
            削除する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
