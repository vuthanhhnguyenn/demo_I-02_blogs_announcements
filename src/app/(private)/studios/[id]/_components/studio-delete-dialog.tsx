'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  adminStudioControllerDetailQueryKey,
  adminStudioControllerListQueryKey,
  adminStudioControllerRemoveMutation,
  adminStudioControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StudioDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { isDeleteBlocked } from '@/lib/utils/studio-action-permissions.util';

import { STUDIO_ERROR_CODE, invalidateStudioQueries } from '../../_utils/studio-api.util';

interface StudioDeleteDialogProps {
  open: boolean;
  studio: StudioDetailDto;
  /** Rows of the linked-lesson card (API-110 #13) — the API's in-use rule decides in the end */
  assignedLessonCount: number;
  onOpenChange: (open: boolean) => void;
}

export function StudioDeleteDialog({
  open,
  studio,
  assignedLessonCount,
  onOpenChange,
}: Readonly<StudioDeleteDialogProps>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  // The server refused with E-STD-004 (a schedule from today uses it) although no lesson row showed
  const [serverInUse, setServerInUse] = useState(false);
  const isBlocked = isDeleteBlocked(assignedLessonCount) || serverInUse;
  const canDeactivateInstead = isBlocked && studio.isActive;
  const inUseLabel =
    assignedLessonCount > 0
      ? `${assignedLessonCount}件のレッスンで使用中`
      : '今後のスケジュールで使用中';

  const deleteMutation = useMutation({
    ...adminStudioControllerRemoveMutation(),
    onSuccess: () => {
      toast.success('スタジオを削除しました');
      void queryClient.invalidateQueries({ queryKey: adminStudioControllerListQueryKey() });
      // Only mark the deleted studio's detail stale: refetching it while this screen is still
      // mounted would flash the not-found state before the redirect
      void queryClient.invalidateQueries({
        queryKey: adminStudioControllerDetailQueryKey({ path: { studioId: studio.id } }),
        refetchType: 'none',
      });
      onOpenChange(false);
      router.push(navigate('/studios'));
    },
    // The shared MutationCache toasts the userMessage; these only adjust the dialog
    onError: (error) => {
      if (error?.code === STUDIO_ERROR_CODE.inUse) setServerInUse(true);
      if (error?.code === STUDIO_ERROR_CODE.notFound) {
        invalidateStudioQueries(queryClient);
        onOpenChange(false);
      }
    },
  });

  const deactivateMutation = useMutation({
    ...adminStudioControllerUpdateMutation(),
    onSuccess: () => {
      toast.success('スタジオを無効化しました');
      invalidateStudioQueries(queryClient);
      onOpenChange(false);
    },
    onError: (error) => {
      // Edited elsewhere meanwhile (stale lock): reload so the next try carries the fresh updatedAt
      if (error?.code === STUDIO_ERROR_CODE.invalidOrStale) invalidateStudioQueries(queryClient);
    },
  });

  const handleConfirm = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (!isBlocked) {
        deleteMutation.mutate({ path: { studioId: studio.id } });
      }
    },
    [deleteMutation, isBlocked, studio.id],
  );

  // FR-005 deactivate path: isActive=false under the optimistic lock
  const handleDeactivateInstead = useCallback(() => {
    deactivateMutation.mutate({
      path: { studioId: studio.id },
      body: { isActive: false, expectedUpdatedAt: studio.updatedAt },
    });
  }, [deactivateMutation, studio.id, studio.updatedAt]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[480px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBlocked ? 'このスタジオは削除できません' : 'スタジオを削除しますか？'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked
              ? `「${studio.name}」は${inUseLabel}です。`
              : `「${studio.name}」を削除します。この操作は取り消せません。`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {isBlocked && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              このスタジオは{inUseLabel}
              のため削除できません。利用を止める場合は削除ではなく「無効化」に切り替えてください。
            </AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending || deactivateMutation.isPending}>
            キャンセル
          </AlertDialogCancel>
          {canDeactivateInstead && (
            <Button
              type="button"
              variant="outline"
              disabled={deactivateMutation.isPending}
              onClick={handleDeactivateInstead}
            >
              {deactivateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              代わりに無効化する
            </Button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className={isBlocked ? 'inline-flex' : 'contents'} />}>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isBlocked || deleteMutation.isPending}
                  onClick={handleConfirm}
                >
                  {deleteMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  削除する
                </AlertDialogAction>
              </TooltipTrigger>
              {isBlocked && (
                <TooltipContent>
                  <p className="text-xs">
                    {inUseLabel}
                    のため削除できません。紐付きレッスンをすべて解除すると削除できます
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
