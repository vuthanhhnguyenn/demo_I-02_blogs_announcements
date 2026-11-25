import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  deleteCrmNoticesByIdMutation,
  getCrmNoticesByIdQueryKey,
  getCrmNoticesQueryKey,
  patchCrmNoticesByIdPublishStatusMutation,
  postCrmNoticesByIdRestoreMutation,
} from '@/lib/api/@tanstack/react-query.gen';

import type { NoticeDetailConfirmKind } from '../_components/notice-detail-confirm-dialog';

interface ToastCopy {
  title: string;
  description: string;
}

/** Per-screen success toasts (ブログ: 記事を… / お知らせ: お知らせを…). */
export interface NoticeDetailActionToasts {
  unpublished: string;
  scheduleCancelled: string;
  deleted: ToastCopy;
  restored: ToastCopy;
}

/**
 * 非公開にする / 予約を取り消す / 削除 / 復元する on ブログ詳細 / お知らせ詳細 (blog-detail research D5):
 * every action goes through the confirm dialog, then the detail re-renders in its new state.
 */
export function useNoticeDetailActions(
  id: string,
  { toasts }: { toasts: NoticeDetailActionToasts },
) {
  const queryClient = useQueryClient();
  const [confirmKind, setConfirmKind] = useState<NoticeDetailConfirmKind | null>(null);

  // Errors are toasted once by the global MutationCache. Refetching on error too lets a
  // conflict show the current state, and a 404 (deleted elsewhere / out of scope) fall into
  // the not-found state. Returning the promise keeps the mutation (and the dialog) pending
  // until the fresh detail is in; the detail key without `query` matches every store variant.
  const settle = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getCrmNoticesByIdQueryKey({ path: { id } }) }),
      queryClient.invalidateQueries({ queryKey: getCrmNoticesQueryKey() }),
    ]);
    setConfirmKind(null);
  };

  const publishStatusMutation = useMutation({
    ...patchCrmNoticesByIdPublishStatusMutation(),
    onSettled: settle,
  });

  const deleteMutation = useMutation({
    ...deleteCrmNoticesByIdMutation(),
    onSuccess: () => {
      toast.success(toasts.deleted.title, { description: toasts.deleted.description });
    },
    onSettled: settle,
  });

  const restoreMutation = useMutation({
    ...postCrmNoticesByIdRestoreMutation(),
    onSuccess: () => {
      toast.success(toasts.restored.title, { description: toasts.restored.description });
    },
    onSettled: settle,
  });

  const isPending =
    publishStatusMutation.isPending || deleteMutation.isPending || restoreMutation.isPending;

  const confirm = () => {
    if (!confirmKind || isPending) return;
    const path = { id };
    if (confirmKind === 'delete') {
      deleteMutation.mutate({ path });
    } else if (confirmKind === 'restore') {
      restoreMutation.mutate({ path });
    } else {
      // Both send `unpublished`; only the toast tells 公開中 and 公開予定 apart.
      const message =
        confirmKind === 'cancelSchedule' ? toasts.scheduleCancelled : toasts.unpublished;
      publishStatusMutation.mutate(
        { path, body: { publishStatus: 'unpublished' } },
        { onSuccess: () => toast.success(message) },
      );
    }
  };

  return {
    confirmKind,
    openConfirm: setConfirmKind,
    closeConfirm: () => {
      if (!isPending) setConfirmKind(null);
    },
    confirm,
    isPending,
  };
}
