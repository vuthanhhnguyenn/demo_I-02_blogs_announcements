'use client';

import { useMutation } from '@tanstack/react-query';

import {
  adminLessonControllerAddImageMutation,
  adminLessonControllerPutOptionRestrictionsMutation,
  adminLessonControllerPutPlanRestrictionsMutation,
  adminLessonControllerRemoveImageMutation,
  adminLessonControllerReorderImagesMutation,
  adminLessonControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonDetailDto } from '@/lib/api-real/types.gen';

import type { LessonFormValues } from '../_schemas/lesson-form.schema';
import { sameIdSet, toUpdateLessonBody } from '../_utils/lesson-form.util';

export type LessonEditSaveResult = 'saved' | 'partial';

/**
 * 編集 save. The API splits a lesson into the core row (PATCH, optimistic lock), the two
 * restriction sets (full-replace PUTs) and the images (add / remove / reorder), so one save is
 * up to 1 + 2 + N calls and not atomic. The core PATCH failing aborts the save (nothing written,
 * the error is toasted); a later call failing returns 'partial' — what succeeded stays saved.
 * Unchanged parts are skipped.
 */
export function useLessonEditSave(original: LessonDetailDto | undefined) {
  const update = useMutation({ ...adminLessonControllerUpdateMutation() });
  const putPlans = useMutation({ ...adminLessonControllerPutPlanRestrictionsMutation() });
  const putOptions = useMutation({ ...adminLessonControllerPutOptionRestrictionsMutation() });
  const addImage = useMutation({ ...adminLessonControllerAddImageMutation() });
  const removeImage = useMutation({ ...adminLessonControllerRemoveImageMutation() });
  const reorderImages = useMutation({ ...adminLessonControllerReorderImagesMutation() });

  const save = async (values: LessonFormValues): Promise<LessonEditSaveResult | null> => {
    if (!original) return null;
    const path = { lessonId: original.id };

    try {
      await update.mutateAsync({ path, body: toUpdateLessonBody(values, original) });
    } catch {
      return null; // toasted by the shared MutationCache (E-LSM-005 stale, E-VAL-001, …)
    }

    try {
      if (!sameIdSet(values.restrictedMainContracts, original.planRestrictionIds)) {
        await putPlans.mutateAsync({ path, body: { planIds: values.restrictedMainContracts } });
      }
      if (!sameIdSet(values.restrictedOptionContracts, original.optionRestrictionIds)) {
        await putOptions.mutateAsync({
          path,
          body: { optionIds: values.restrictedOptionContracts },
        });
      }

      // Images: drop the removed ones, register the new uploads, then set the final order
      const kept = new Set(values.images.flatMap((image) => image.imageId ?? []));
      for (const image of original.images) {
        if (!kept.has(image.id)) {
          await removeImage.mutateAsync({ path: { lessonId: original.id, imageId: image.id } });
        }
      }
      const finalIds: string[] = [];
      const addedIds: string[] = [];
      for (const image of values.images) {
        if (image.imageId) {
          finalIds.push(image.imageId);
        } else {
          const added = await addImage.mutateAsync({ path, body: { imageS3Key: image.s3Key } });
          finalIds.push(added.id);
          addedIds.push(added.id);
        }
      }
      // The server keeps the remaining images in their order and appends each added one at the
      // end — reorder only when the form's order differs from that
      const serverOrder = [
        ...[...original.images]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((image) => image.id)
          .filter((id) => kept.has(id)),
        ...addedIds,
      ];
      const orderChanged = finalIds.some((id, index) => id !== serverOrder[index]);
      if (orderChanged) {
        await reorderImages.mutateAsync({
          path,
          body: { order: finalIds.map((imageId, displayOrder) => ({ imageId, displayOrder })) },
        });
      }
      return 'saved';
    } catch {
      return 'partial';
    }
  };

  const isPending =
    update.isPending ||
    putPlans.isPending ||
    putOptions.isPending ||
    addImage.isPending ||
    removeImage.isPending ||
    reorderImages.isPending;

  return { save, isPending };
}
