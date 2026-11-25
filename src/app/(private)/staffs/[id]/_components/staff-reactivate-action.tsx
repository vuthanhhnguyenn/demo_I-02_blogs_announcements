'use client';

import { useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { RoleGatedButton } from '@/components/common/role-gated-button';
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

import {
  adminStaffControllerReactivateMutation,
  adminStaffPermissionControllerGetStaffQueryKey,
  adminStaffPermissionControllerListStaffQueryKey,
  adminStaffPermissionControllerStaffChangeHistoriesQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { UserRole } from '@/types/permission.type';

import { invalidateDomainStaffCountQueries } from '../../_utils/invalidate-domain-staff-count.util';

interface StaffReactivateActionProps {
  staffId: string;
  staffName: string;
  /**
   * Fully external open state, for callers that must mount this dialog outside their own
   * trigger's React tree — e.g. the list screen's row menu, whose `DropdownMenuContent`
   * unmounts its whole subtree when the menu closes and would tear the dialog down before
   * it could render (same reason `StaffDeactivateAction` carries these props).
   * When provided, no trigger is rendered here; the caller drives `open`.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * "有効化する" — the counterpart to StaffDeactivateAction's "後から有効化することが
 * できます" promise (BUG-Y01DETAIL-05: no such control existed anywhere for an
 * already-inactive account).
 */
export function StaffReactivateAction({
  staffId,
  staffName,
  open: controlledOpen,
  onOpenChange,
}: StaffReactivateActionProps) {
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const isSubmittingRef = useRef(false);

  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const activateMutation = useMutation({
    ...adminStaffControllerReactivateMutation(),
    onSuccess: () => {
      toast.success('スタッフを有効化しました', {
        description: `${staffName}は再びCRMにログインできるようになります。`,
      });
      queryClient.invalidateQueries({
        queryKey: adminStaffPermissionControllerListStaffQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: adminStaffPermissionControllerGetStaffQueryKey({ path: { id: staffId } }),
      });
      queryClient.invalidateQueries({
        queryKey: adminStaffPermissionControllerStaffChangeHistoriesQueryKey({
          path: { id: staffId },
        }),
      });
      invalidateDomainStaffCountQueries(queryClient);
      setOpen(false);
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const handleConfirm = () => {
    if (isSubmittingRef.current || activateMutation.isPending) return;
    isSubmittingRef.current = true;
    activateMutation.mutate({ path: { id: staffId } });
  };

  const trigger = isControlled ? null : (
    <RoleGatedButton
      allowedRoles={[UserRole.Headquarter, UserRole.System]}
      denyTooltip="本部権限が必要です"
      variant="outline"
      size="sm"
      className="w-full"
      disabled={activateMutation.isPending}
      onClick={() => setOpen(true)}
    >
      <RotateCcw className="size-4" />
      有効化する
    </RoleGatedButton>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger}

      {/* Stop propagation: when this dialog is mounted inside a table row (the list's row
          menu), a click on キャンセル or 有効化する otherwise bubbles up to the row's own
          click handler and navigates away to the detail screen mid-action. */}
      <AlertDialogContent onClick={(event) => event.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>このスタッフを有効化しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            有効化すると、このスタッフは再びCRMにログインできるようになります。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={activateMutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            disabled={activateMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            有効化する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
