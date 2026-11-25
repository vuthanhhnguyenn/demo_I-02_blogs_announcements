'use client';

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

import type { ExerciseDeleteBlockReason } from '../_constants/constants';

/** Prototype `exercise-list.tsx` 削除確認 AlertDialog copy — one title for every variant. */
function getDeleteDialogBody(
  blocked: boolean,
  blockReason: ExerciseDeleteBlockReason | null | undefined,
  exerciseName: string,
) {
  if (!blocked) return `「${exerciseName}」を削除します。この操作は元に戻せません。`;
  if (blockReason === 'published') {
    return `「${exerciseName}」は公開中のため削除できません。先に非公開に変更してください。`;
  }
  // The list API does not name the routines (E-EXM-003), so the routine list is omitted.
  return 'このエクササイズはルーティンで使用中のため削除できません。削除するには、先に各ルーティンからエクササイズを外してください。';
}

interface ExerciseDeleteDialogsProps {
  mode: 'blocked' | 'confirm' | null;
  exerciseName: string;
  blockReason?: ExerciseDeleteBlockReason | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete?: () => void;
  /** Disables 削除する while the DELETE is in flight (prevents double submits). */
  isPending?: boolean;
}

export function ExerciseDeleteDialogs({
  mode,
  exerciseName,
  blockReason,
  open,
  onOpenChange,
  onConfirmDelete,
  isPending = false,
}: ExerciseDeleteDialogsProps) {
  if (!mode) return null;

  const blocked = mode === 'blocked';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader className="min-w-0">
          <AlertDialogTitle>削除しますか？</AlertDialogTitle>
          <AlertDialogDescription className="[overflow-wrap:anywhere] break-all">
            {getDeleteDialogBody(blocked, blockReason, exerciseName)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>閉じる</AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={() => {
                if (isPending) return;
                onConfirmDelete?.();
              }}
            >
              削除する
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
