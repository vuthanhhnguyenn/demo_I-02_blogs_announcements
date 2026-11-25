'use client';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';

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

interface AppVersionDeleteDialogProps {
  open: boolean;
  /** Record name shown in the description; `null` falls back to a generic sentence. */
  targetName: string | null;
  onOpenChange: (open: boolean) => void;
  /**
   * The delete write. It must return the write's promise: a second click while it runs is dropped.
   */
  onConfirm: () => Promise<unknown>;
  isPending: boolean;
}

export function AppVersionDeleteDialog({
  open,
  targetName,
  onOpenChange,
  onConfirm,
  isPending,
}: AppVersionDeleteDialogProps) {
  // `disabled={isPending}` lands a render late: without this a double click sends two DELETEs
  const runConfirm = useInFlightGuard();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>このバージョン設定を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            {targetName
              ? `${targetName} のバージョン情報を削除します。`
              : 'このバージョン情報を削除します。'}
            この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            onClick={() => {
              // A failure is already toasted by the shared MutationCache; the rejection is only
              // swallowed here so it does not surface as an unhandled one.
              void runConfirm(onConfirm).catch(() => undefined);
            }}
          >
            {isPending ? '削除中...' : '削除する'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
