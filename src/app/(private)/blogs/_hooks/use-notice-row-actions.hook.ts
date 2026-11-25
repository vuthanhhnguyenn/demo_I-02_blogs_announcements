import { useCallback, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  deleteCrmNoticesByIdMutation,
  getCrmNoticesByIdQueryKey,
  getCrmNoticesQueryKey,
  patchCrmNoticesByIdPublishStatusMutation,
  postCrmNoticesByIdRestoreMutation,
} from '@/lib/api/@tanstack/react-query.gen';

import type { NoticeConfirmKind } from '../_components/notice-confirm-dialog';
import type { NoticeRow } from '../_types/notice.type';

interface ToastCopy {
  title: string;
  description: string;
}

export interface NoticeActionToasts {
  published: string;
  unpublished: string;
  deleted: ToastCopy;
  restored: ToastCopy;
}

/**
 * Row actions of the I-02 article lists (公開 / 非公開 / 削除 / 復元), moved from the blog list page
 * (specs/announcement-list research R1). Toast copy comes from each screen. Errors are toasted once
 * by the global MutationCache (FR-024), so there is no local `onError`.
 */
export function useNoticeRowActions({ toasts }: { toasts: NoticeActionToasts }) {
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<{
    kind: NoticeConfirmKind;
    row: NoticeRow;
  } | null>(null);

  // The detail key without `query` partially matches every header-store variant of it.
  const invalidateList = (id: string) => {
    void queryClient.invalidateQueries({ queryKey: getCrmNoticesQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getCrmNoticesByIdQueryKey({ path: { id } }) });
  };

  const publishMutation = useMutation({
    ...patchCrmNoticesByIdPublishStatusMutation(),
    onSuccess: (_, variables) => {
      toast.success(
        variables.body?.publishStatus === 'published' ? toasts.published : toasts.unpublished,
      );
      invalidateList(variables.path.id);
      setConfirmTarget(null);
    },
  });

  const deleteMutation = useMutation({
    ...deleteCrmNoticesByIdMutation(),
    onSuccess: (_, variables) => {
      toast.success(toasts.deleted.title, { description: toasts.deleted.description });
      invalidateList(variables.path.id);
      setConfirmTarget(null);
    },
  });

  const restoreMutation = useMutation({
    ...postCrmNoticesByIdRestoreMutation(),
    onSuccess: (_, variables) => {
      toast.success(toasts.restored.title, { description: toasts.restored.description });
      invalidateList(variables.path.id);
    },
  });
  const { mutate: restoreNotice } = restoreMutation;

  // Stable, so pages can list it in their column memo dependencies.
  const openConfirm = useCallback(
    (kind: NoticeConfirmKind, row: NoticeRow) => setConfirmTarget({ kind, row }),
    [],
  );
  const closeConfirm = () => setConfirmTarget(null);

  const confirm = () => {
    if (!confirmTarget) return;
    const path = { id: confirmTarget.row.id };
    if (confirmTarget.kind === 'delete') {
      deleteMutation.mutate({ path });
      return;
    }
    publishMutation.mutate({
      path,
      body: { publishStatus: confirmTarget.kind === 'publish' ? 'published' : 'unpublished' },
    });
  };

  return {
    confirmTarget,
    openConfirm,
    closeConfirm,
    confirm,
    /** Stable identity (React Query `mutate`), safe in memo dependency lists. */
    restore: restoreNotice,
    isPending: publishMutation.isPending || deleteMutation.isPending,
  };
}
