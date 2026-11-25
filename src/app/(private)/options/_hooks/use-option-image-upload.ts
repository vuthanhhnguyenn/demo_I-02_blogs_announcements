import { useCallback } from 'react';

import { useMutation } from '@tanstack/react-query';

import { useMediaUploadOutcome } from '@/hooks/use-media-upload-outcome.hook';

import {
  adminOptionControllerAddImageMutation,
  adminOptionControllerDeleteImageMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionImageDto } from '@/lib/api-real/types.gen';

export const OPTION_IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png'] as const;
/** The presign API's limit (`CreatePresignDto.fileSize` ≤ 100 MB); neither G-02 nor the prototype sets a lower one. */
export const OPTION_IMAGE_MAX_SIZE_MB = 100;

/**
 * The file never reached object storage (presign refused, PUT refused, or no network). Unlike the
 * API calls around it, nothing toasts this one for the caller: the shared upload hook opts out of
 * the app-wide MutationCache toast and the PUT is not a mutation.
 */
export class OptionImageUploadError extends Error {}

/**
 * Applies the member-facing image edit of the option form. The screen shows one image, so a
 * replacement registers the new one (presign → PUT to S3 → `POST ~/images`) and only then drops
 * the previously stored images; a removal just drops them.
 */
export function useOptionImageUpload() {
  const { uploadFile } = useMediaUploadOutcome({
    tag: 'option-image',
    maxSizeMB: OPTION_IMAGE_MAX_SIZE_MB,
    acceptedTypes: OPTION_IMAGE_ACCEPTED_TYPES,
  });
  const { mutateAsync: addImage } = useMutation(adminOptionControllerAddImageMutation());
  const { mutateAsync: deleteImage } = useMutation(adminOptionControllerDeleteImageMutation());

  const uploadImage = useCallback(
    async (optionId: string, file: File) => {
      const outcome = await uploadFile(file);
      if (!outcome.ok) throw new OptionImageUploadError(`Image upload failed (${outcome.reason})`);
      await addImage({ path: { optionId }, body: { s3Key: outcome.s3Key } });
    },
    [uploadFile, addImage],
  );

  const deleteImages = useCallback(
    async (optionId: string, images: readonly OptionImageDto[]) => {
      for (const image of images) {
        await deleteImage({ path: { optionId, imageId: image.id } });
      }
    },
    [deleteImage],
  );

  return { uploadImage, deleteImages };
}
