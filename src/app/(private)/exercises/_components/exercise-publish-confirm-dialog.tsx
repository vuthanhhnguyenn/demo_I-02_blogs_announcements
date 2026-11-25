'use client';

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';

type ExercisePublishConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs on 「公開する」; the dialog closes itself afterwards. */
  onConfirm: () => void;
  /**
   * The list opens the dialog the moment 公開にする is clicked, while the detail is still being
   * fetched to decide whether the warning applies; the modal blocks other rows meanwhile.
   */
  isChecking?: boolean;
};

/**
 * FR-007: 非公開→公開 while a 解説ステップ (step 0〜4) is empty warns first; publishing stays
 * possible. Shared by the list's 公開にする action and the edit form's 公開 switch.
 */
export function ExercisePublishConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isChecking = false,
}: Readonly<ExercisePublishConfirmDialogProps>) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader className="min-w-0">
          <AlertDialogTitle>エクササイズを公開しますか？</AlertDialogTitle>
          {isChecking ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Spinner />
              解説ステップを確認しています…
            </div>
          ) : (
            <Alert className="border-warning/50 bg-warning/15">
              <AlertTriangle className="text-warning size-4" />
              <AlertDescription className="text-xs">
                解説ステップ（ステップ0〜4）に未入力の項目があります。未入力のまま公開できますが、モバイルアプリで解説が表示されません。
              </AlertDescription>
            </Alert>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          {/* This AlertDialogAction is a plain Button — it does not close the dialog by itself. */}
          <AlertDialogAction
            disabled={isChecking}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            公開する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
