'use client';

import { useMutation } from '@tanstack/react-query';

import {
  adminStudioControllerAddImageMutation,
  adminStudioControllerCreateMutation,
  adminStudioControllerRemoveImageMutation,
  adminStudioControllerReplaceSeatsMutation,
  adminStudioControllerUpdateImageMutation,
  adminStudioControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StudioDetailDto } from '@/lib/api-real/types.gen';

import type { StudioFormValues } from '../_components/studio-form.schema';
import {
  formValuesToCreateBody,
  formValuesToPatchBody,
  layoutChanged,
  layoutToSeatInputs,
} from '../_utils/studio-form.util';

export type StudioSaveResult = { studioId: string; outcome: 'saved' | 'partial' };

/**
 * 登録 / 変更を保存. The API splits a studio into the row (POST / PATCH with an optimistic lock),
 * the seat grid (full-replace PUT, its own lock) and the images (add / remove / reorder), so one
 * save is several calls and not atomic. The first call failing aborts the save (nothing written,
 * the shared MutationCache toasts the userMessage — E-STD-006 stale, E-STD-007 PT, E-VAL-001 …);
 * a later call failing answers 'partial' — what succeeded stays saved. Unchanged parts are skipped.
 */
export function useStudioSave(original?: StudioDetailDto) {
  const create = useMutation({ ...adminStudioControllerCreateMutation() });
  const update = useMutation({ ...adminStudioControllerUpdateMutation() });
  const replaceSeats = useMutation({ ...adminStudioControllerReplaceSeatsMutation() });
  const addImage = useMutation({ ...adminStudioControllerAddImageMutation() });
  const removeImage = useMutation({ ...adminStudioControllerRemoveImageMutation() });
  const updateImage = useMutation({ ...adminStudioControllerUpdateImageMutation() });

  /** Create: the row + its initial images in one POST, then the grid when it holds any seat */
  const saveNew = async (values: StudioFormValues): Promise<StudioSaveResult | null> => {
    let created: StudioDetailDto;
    try {
      created = await create.mutateAsync({ body: formValuesToCreateBody(values) });
    } catch {
      return null;
    }
    const seats = layoutToSeatInputs(values.layout);
    if (seats.length === 0) return { studioId: created.id, outcome: 'saved' };
    try {
      await replaceSeats.mutateAsync({
        path: { studioId: created.id },
        body: { seats, expectedUpdatedAt: created.updatedAt },
      });
      return { studioId: created.id, outcome: 'saved' };
    } catch {
      return { studioId: created.id, outcome: 'partial' };
    }
  };

  /** Edit: PATCH the changed fields → PUT the grid if it changed → the image differences */
  const saveExisting = async (
    values: StudioFormValues,
    current: StudioDetailDto,
    layoutLocked: boolean,
  ): Promise<StudioSaveResult | null> => {
    const path = { studioId: current.id };
    let updatedAt = current.updatedAt;

    const patch = formValuesToPatchBody(values, current);
    if (patch) {
      try {
        updatedAt = (await update.mutateAsync({ path, body: patch })).updatedAt;
      } catch {
        return null;
      }
    }

    try {
      if (!layoutLocked && layoutChanged(values.layout, current)) {
        // A refused held seat (409 E-STD-009) lands here as 'partial' with its toast
        await replaceSeats.mutateAsync({
          path,
          body: { seats: layoutToSeatInputs(values.layout), expectedUpdatedAt: updatedAt },
        });
      }

      // Images: drop the removed ones, register the new uploads, then fix the order
      const kept = new Set(values.images.flatMap((image) => image.imageId ?? []));
      for (const image of current.images) {
        if (!kept.has(image.id)) {
          await removeImage.mutateAsync({ path: { studioId: current.id, imageId: image.id } });
        }
      }
      const finalIds: string[] = [];
      for (const image of values.images) {
        if (image.imageId) {
          finalIds.push(image.imageId);
        } else {
          const added = await addImage.mutateAsync({ path, body: { imageS3Key: image.s3Key } });
          finalIds.push(added.id);
        }
      }
      // The server keeps the remaining images in their order and appends each new one; per-image
      // PATCH (§7.4) only where the form's position differs from what is stored
      const storedOrder = new Map(current.images.map((image) => [image.id, image.displayOrder]));
      const keptInStoredOrder = [...current.images]
        .filter((image) => kept.has(image.id))
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((image) => image.id);
      const orderChanged = finalIds
        .filter((id) => storedOrder.has(id))
        .some((id, index) => id !== keptInStoredOrder[index]);
      if (orderChanged) {
        for (const [displayOrder, imageId] of finalIds.entries()) {
          await updateImage.mutateAsync({
            path: { studioId: current.id, imageId },
            body: { displayOrder },
          });
        }
      }
      return { studioId: current.id, outcome: 'saved' };
    } catch {
      return { studioId: current.id, outcome: 'partial' };
    }
  };

  const save = (values: StudioFormValues, layoutLocked = false) =>
    original ? saveExisting(values, original, layoutLocked) : saveNew(values);

  const isPending =
    create.isPending ||
    update.isPending ||
    replaceSeats.isPending ||
    addImage.isPending ||
    removeImage.isPending ||
    updateImage.isPending;

  return { save, isPending };
}
