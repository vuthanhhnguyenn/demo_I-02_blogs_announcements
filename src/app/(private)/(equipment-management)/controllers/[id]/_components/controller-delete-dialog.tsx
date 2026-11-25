'use client';

import { useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';

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

import { adminRelayControllerControllerRemoveMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { useSubmitGuard } from '../../../_hooks/use-submit-guard.hook';
import { isDeviceConflictError, isDeviceNotFoundError } from '../../../_utils/device-api.util';
import {
  invalidateControllerCaches,
  invalidateControllerRosterCaches,
  removeDeletedControllerQueries,
} from '../../_utils/controller-cache.util';

interface ControllerDeleteDialogProps {
  controllerId: string;
  /**
   * How the confirmation text names the unit: its IP address, as the prototype does
   * (BUG-E02-E-02), with the 装置名 as the fallback for a controller without one.
   */
  controllerLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * FR-007 異常系: a controller with connected devices cannot be deleted. The 削除 button is
 * disabled in that case, so this dialog only ever confirms a deletable unit; the 409 `E-DEV-011`
 * guard is still surfaced in case the count changed underneath (D11).
 */
export function ControllerDeleteDialog({
  controllerId,
  controllerLabel,
  open,
  onOpenChange,
}: ControllerDeleteDialogProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const deletedRef = useRef(false);

  useEffect(
    () => () => {
      if (deletedRef.current) removeDeletedControllerQueries(queryClient, controllerId);
    },
    [queryClient, controllerId],
  );

  const deleteMutation = useMutation({
    ...adminRelayControllerControllerRemoveMutation(),
    // The failure toast (server userMessage) comes from the global MutationCache.
    onSuccess: () => {
      toast.success('接点制御装置を削除しました');
      deletedRef.current = true;
      // Without the id: the detail query is removed after unmount (see above).
      invalidateControllerRosterCaches(queryClient);
      onOpenChange(false);
      router.push(navigate('/controllers'));
    },
    onError: (error) => {
      onOpenChange(false);
      if (isDeviceNotFoundError(error)) {
        // BUG-E02-E-08 — already deleted elsewhere: never leave the user on the stale detail.
        deletedRef.current = true;
        invalidateControllerRosterCaches(queryClient);
        router.push(navigate('/controllers'));
        return;
      }
      if (isDeviceConflictError(error)) {
        // BUG-E02-E-07 — a device was attached meanwhile (E-DEV-011): refetch so 紐付き機器数 and
        // the disabled 削除 with its reason reflect it.
        invalidateControllerCaches(queryClient, controllerId);
      }
    },
  });

  // BUG-E02-E-03 — a double click must send one DELETE, not a second one that fails with 404.
  const { submitOnce, resetSubmitGuard } = useSubmitGuard(
    deleteMutation.isPending,
    deleteMutation.isError,
  );
  useEffect(() => {
    if (open) resetSubmitGuard();
  }, [open, resetSubmitGuard]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>接点制御装置を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            「{controllerLabel}」を削除します。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              submitOnce(() =>
                deleteMutation.mutate({ path: { relayControllerId: controllerId } }),
              );
            }}
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
