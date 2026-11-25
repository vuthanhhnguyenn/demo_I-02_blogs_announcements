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

import { adminConnectedDeviceControllerRemoveMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { useSubmitGuard } from '../../../_hooks/use-submit-guard.hook';
import { isDeviceNotFoundError } from '../../../_utils/device-api.util';
import {
  invalidateEquipmentRosterCaches,
  removeDeletedEquipmentQueries,
} from '../../_utils/equipment-cache.util';

interface EquipmentDeleteDialogProps {
  equipmentId: string;
  equipmentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentDeleteDialog({
  equipmentId,
  equipmentName,
  open,
  onOpenChange,
}: EquipmentDeleteDialogProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const deletedRef = useRef(false);

  // Drop the deleted device's own queries only after the detail screen is gone; see
  // `invalidateEquipmentRosterCaches`.
  useEffect(
    () => () => {
      if (deletedRef.current) removeDeletedEquipmentQueries(queryClient, equipmentId);
    },
    [queryClient, equipmentId],
  );

  const deleteMutation = useMutation({
    ...adminConnectedDeviceControllerRemoveMutation(),
    onSuccess: () => {
      toast.success('接続機器を削除しました');
      deletedRef.current = true;
      invalidateEquipmentRosterCaches(queryClient);
      onOpenChange(false);
      router.push(navigate('/equipment'));
    },
    // The toast comes from the shared MutationCache (D12); only the screen reaction lives here.
    onError: (error) => {
      // BUG-E02-B-10: already deleted elsewhere — the detail is stale, so leave it for the list
      // just as a successful delete would.
      if (!isDeviceNotFoundError(error)) return;
      deletedRef.current = true;
      invalidateEquipmentRosterCaches(queryClient);
      onOpenChange(false);
      router.push(navigate('/equipment'));
    },
  });

  // BUG-E02-B-04: a double click must send one DELETE, not a second one that 404s.
  const { submitOnce, resetSubmitGuard } = useSubmitGuard(
    deleteMutation.isPending,
    deleteMutation.isError,
  );

  useEffect(() => {
    if (open) resetSubmitGuard();
  }, [open, resetSubmitGuard]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="min-w-0">
        <AlertDialogHeader>
          <AlertDialogTitle>接続機器を削除しますか？</AlertDialogTitle>
          {/* An unbroken name wraps instead of pushing the buttons out of the dialog (BUG-E02-B-09). */}
          <AlertDialogDescription className="wrap-anywhere">
            「{equipmentName}」を削除します。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              submitOnce(() => deleteMutation.mutate({ path: { deviceId: equipmentId } }));
            }}
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
