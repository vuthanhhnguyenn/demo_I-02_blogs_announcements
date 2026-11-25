'use client';

import { useCallback, useState } from 'react';

import { useMediaUpload } from '@/hooks/use-media-upload.hook';

import type { PlanImageDto } from '@/lib/api-real/types.gen';

/** API-006 upload tag the plan-image sub-resource documents for its `s3Key`. */
const PLAN_IMAGE_UPLOAD_TAG = 'plan-image';
/** The thumbnail takes JPG / PNG only — dropped files included, so WebP is not inherited. */
const PLAN_IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png'] as const;

/**
 * Uploads the form's サムネイル画像 and keeps a renderable preview for every `s3Key` it may hold.
 *
 * An `s3Key` is not renderable on its own: `GET /media/assets/{key}` needs the bearer token, which
 * an <img> request never carries (401). A stored picture previews through the signed `imageUrl`
 * of the plan detail, a fresh upload through an object URL of the file the operator picked.
 *
 * Call it from the stepper, not from step 1: step 1 unmounts while the operator is on step 2 / 3,
 * and a preview map living there would be lost while the form still holds the uploaded key.
 */
export function usePlanThumbnailUpload(images: readonly PlanImageDto[] | undefined) {
  const { uploadFile: uploadPlanImage } = useMediaUpload({
    tag: PLAN_IMAGE_UPLOAD_TAG,
    acceptedTypes: PLAN_IMAGE_ACCEPTED_TYPES,
    typeErrorMessage: 'JPG・PNG形式の画像を選択してください',
  });

  const [thumbnailPreviews, setThumbnailPreviews] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (images ?? []).flatMap((image) => (image.imageUrl ? [[image.s3Key, image.imageUrl]] : [])),
    ),
  );

  const uploadThumbnail = useCallback(
    async (file: File) => {
      const s3Key = await uploadPlanImage(file);
      if (s3Key) {
        const previewUrl = URL.createObjectURL(file);
        setThumbnailPreviews((prev) => ({ ...prev, [s3Key]: previewUrl }));
      }
      return s3Key;
    },
    [uploadPlanImage],
  );

  return { thumbnailPreviews, uploadThumbnail };
}
