'use client';

import { useRef } from 'react';

import { invalidateAreaUsageCaches } from '@/app/(private)/area-master/_utils/area-cache.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import {
  adminPlanControllerDetailQueryKey,
  adminPlanControllerListQueryKey,
  adminPlanControllerRemoveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';

interface PlanDeleteDialogProps {
  planId: string;
  planName: string;
  /** 親主契約 of the deleted plan: its 子主契約 count / list (and 削除 guard) change with it. */
  parentPlanId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the 204 — the detail screen leaves the now-deleted plan for the list. */
  onDeleted?: () => void;
  /** The prototype words the dialog differently on the list and on the detail header. */
  context?: 'list' | 'detail';
}

const DIALOG_COPY = {
  list: {
    title: '主契約を削除しますか？',
    irreversible: 'この操作は元に戻せません。',
    success: (name: string) => `「${name}」を削除しました`,
  },
  detail: {
    title: '主契約マスタを削除しますか？',
    irreversible: 'この操作は取り消せません。',
    success: (name: string) => `主契約マスタ「${name}」を削除しました`,
  },
} as const;

/**
 * 主契約マスタ削除 on API-087 `DELETE /admin/plans/{planId}` (logical delete, 204).
 *
 * The menu's guard is only a pre-check: a plan can gain a contract holder or a derived child
 * between the probe and the click, so the 409 (`E-PLN-002` / `E-PLN-003`) is still surfaced.
 * Shared by the list's row menu and the detail header.
 */
export function PlanDeleteDialog({
  planId,
  planName,
  parentPlanId,
  open,
  onOpenChange,
  onDeleted,
  context = 'list',
}: Readonly<PlanDeleteDialogProps>) {
  const queryClient = useQueryClient();
  const copy = DIALOG_COPY[context];

  // `isPending` only disables the button after the next render, so a double-click lands two
  // DELETEs (the second answers 404). The ref closes that gap within the same tick.
  const submittingRef = useRef(false);

  const deleteMutation = useMutation({
    ...adminPlanControllerRemoveMutation(),
    // No toast in `onError`: the shared MutationCache toasts the backend's own message (E-PLN-002 /
    // E-PLN-003 carry the reason the plan cannot be deleted), so a local toast would double it.
    onSuccess: () => {
      toast.success(copy.success(planName));
      queryClient.invalidateQueries({ queryKey: adminPlanControllerListQueryKey() });
      // The areas the plan used lose one use (使われている所, the area's 削除 guard).
      invalidateAreaUsageCaches(queryClient);
      if (parentPlanId) {
        queryClient.invalidateQueries({
          queryKey: adminPlanControllerDetailQueryKey({ path: { planId: parentPlanId } }),
        });
      }
      onOpenChange(false);
      onDeleted?.();
    },
    // The refusal means what the screen shows is stale (a child or holder appeared, or the plan
    // was deleted elsewhere): refetch so the guards and the not-found state catch up.
    onError: () => {
      queryClient.invalidateQueries({ queryKey: adminPlanControllerListQueryKey() });
      queryClient.invalidateQueries({
        queryKey: adminPlanControllerDetailQueryKey({ path: { planId } }),
      });
      onOpenChange(false);
    },
    onSettled: () => {
      submittingRef.current = false;
    },
  });

  const handleDelete = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    deleteMutation.mutate({ path: { planId } });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>
            「<span className="text-foreground font-medium wrap-anywhere">{planName}</span>
            」を削除します。{copy.irreversible}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>キャンセル</AlertDialogCancel>
          <Button variant="destructive" disabled={deleteMutation.isPending} onClick={handleDelete}>
            削除する
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
