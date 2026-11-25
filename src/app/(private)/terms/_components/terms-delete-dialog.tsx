'use client';

import { useRef } from 'react';

import { invalidateTermsQueries } from '@/app/(private)/terms/_utils/terms-cache.util';
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

import { getApiErrorStatus } from '@/lib/api-error.util';
import { adminTermsControllerRemoveMutation } from '@/lib/api-real/@tanstack/react-query.gen';

interface TermsDeleteDialogTarget {
  id: string;
  title: string;
}

interface TermsDeleteDialogProps {
  target: TermsDeleteDialogTarget | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function TermsDeleteDialog({
  target,
  onOpenChange,
  onDeleted,
}: Readonly<TermsDeleteDialogProps>) {
  const queryClient = useQueryClient();
  const isSubmittingRef = useRef(false);

  // Error toasts come from the shared MutationCache.
  const deleteMutation = useMutation({
    ...adminTermsControllerRemoveMutation(),
    onSuccess: () => {
      toast.success('規約を削除しました');
      invalidateTermsQueries(queryClient);
      onOpenChange(false);
      onDeleted?.();
    },
    onError: (error) => {
      // Deleted elsewhere meanwhile (404 E-TERM-001): close and refetch, so the list drops the
      // row and the detail re-renders as the deleted document (lesson-delete-dialog pattern).
      if (getApiErrorStatus(error) === 404) {
        invalidateTermsQueries(queryClient);
        onOpenChange(false);
      }
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const handleDelete = () => {
    // Ref guard (franchise-company-delete-dialog): two clicks dispatched in the same tick both
    // read the pre-mutate `isPending`, so a state-only guard still lets a second DELETE through.
    if (isSubmittingRef.current || !target) return;
    isSubmittingRef.current = true;
    deleteMutation.mutate({ path: { id: target.id } });
  };

  return (
    <AlertDialog open={target !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>規約を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            「{target?.title}
            」を論理削除します。実データは保持されますが、通常検索からは除外されます。「削除済みも含めて表示」チェックで再表示できます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            {deleteMutation.isPending ? '削除中...' : '削除する'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
