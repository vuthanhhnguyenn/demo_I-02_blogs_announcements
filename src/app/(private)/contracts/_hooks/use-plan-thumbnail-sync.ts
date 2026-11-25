'use client';

import { useCallback } from 'react';

import { useMutation } from '@tanstack/react-query';

import {
  adminPlanControllerAddImageMutation,
  adminPlanControllerRemoveImageMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { PlanImageDto } from '@/lib/api-real/types.gen';

/**
 * API-087 keeps plan pictures in a `plans/{planId}/images` sub-resource rather than a body field,
 * so the form's サムネイル画像 is saved in a second step, after the plan itself exists. The form
 * edits a single image, which is the first entry of that gallery.
 *
 * The client asked for a `thumbnailUrl` on the plan body instead (qa-102, answered 2026-07-15);
 * until the backend ships it this is the only place a plan picture can be stored.
 */
/** Shown when only the picture step fails; the plan itself is already saved. */
export const THUMBNAIL_SYNC_ERROR =
  'サムネイル画像を保存できませんでした。主契約自体は保存されています。';

export function usePlanThumbnailSync() {
  const addImage = useMutation({
    ...adminPlanControllerAddImageMutation(),
    meta: { suppressErrorToast: true },
  });
  const removeImage = useMutation({
    ...adminPlanControllerRemoveImageMutation(),
    meta: { suppressErrorToast: true },
  });

  const syncThumbnail = useCallback(
    async (planId: string, nextS3Key: string | null, currentImages: PlanImageDto[] = []) => {
      const current = currentImages[0];
      if ((current?.s3Key ?? null) === (nextS3Key ?? null)) return;

      if (current) {
        await removeImage.mutateAsync({ path: { planId, imageId: current.id } });
      }
      if (nextS3Key) {
        await addImage.mutateAsync({ path: { planId }, body: { s3Key: nextS3Key, sortOrder: 0 } });
      }
    },
    [addImage, removeImage],
  );

  return { syncThumbnail, isSyncing: addImage.isPending || removeImage.isPending };
}
