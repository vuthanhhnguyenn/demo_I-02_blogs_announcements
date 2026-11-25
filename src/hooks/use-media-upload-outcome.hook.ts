'use client';

import { useCallback, useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { mediaControllerPresignMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import { findFileProblem } from '@/lib/utils/file-signature.util';

/**
 * Upload tags of `POST /api/v1/media/presign` this app uses. The backend whitelist is longer
 * (`CreatePresignDto.tag`); a tag is added here when a screen starts uploading under it.
 */
export type MediaUploadTag = 'store-image' | 'option-image' | 'terms' | 'facility-image';

/**
 * `store-image` / `option-image` presign accept PNG / JPEG only — SVG is not on its whitelist (BQ1);
 * `terms` takes `application/pdf`.
 */
export type MediaUploadContentType = 'image/jpeg' | 'image/png' | 'application/pdf';

/**
 * Why an upload did not happen:
 * - `type` / `size` — refused locally, before any request
 * - `rejected` — the presign or the S3 PUT answered with an error
 * - `network` — a request never got an answer
 */
export type MediaUploadFailureReason = 'type' | 'size' | 'network' | 'rejected';

export type MediaUploadOutcome =
  | { ok: true; s3Key: string }
  | { ok: false; reason: MediaUploadFailureReason };

interface UseMediaUploadOptions {
  readonly tag: MediaUploadTag;
  readonly maxSizeMB: number;
  readonly acceptedTypes: readonly MediaUploadContentType[];
}

interface UseMediaUploadResult {
  /** Presigns and uploads one file; resolves with its `s3Key` or the reason it failed */
  readonly uploadFile: (file: File) => Promise<MediaUploadOutcome>;
  /** True while at least one upload started by this hook is in flight */
  readonly isUploading: boolean;
}

/**
 * The real-API counterpart of `use-file-upload.hook.ts` (which serves the mock API and stays as
 * it is): `POST /api/v1/media/presign`, then a `PUT` of the bytes straight to S3.
 *
 * Unlike `useMediaUpload` (`use-media-upload.hook.ts`), which toasts and resolves to `s3Key | null`,
 * this one resolves to an outcome carrying the failure reason, for screens that show the error
 * inline.
 *
 * The PUT carries **every** `requiredHeaders` entry verbatim — they are part of the signature,
 * and S3 answers 403 SignatureDoesNotMatch when one is missing or altered.
 *
 * Never toasts: the caller shows the failure where it belongs (inline under a photo grid, …), so
 * the presign mutation opts out of the shared MutationCache toast too.
 */
export function useMediaUploadOutcome({
  tag,
  maxSizeMB,
  acceptedTypes,
}: UseMediaUploadOptions): UseMediaUploadResult {
  const { mutateAsync: presign } = useMutation({
    ...mediaControllerPresignMutation(),
    // Fail instead of pausing while offline, so callers' saving state always settles.
    networkMode: 'always',
    meta: { suppressErrorToast: true },
  });
  const [pendingCount, setPendingCount] = useState(0);

  const uploadFile = useCallback(
    async (file: File): Promise<MediaUploadOutcome> => {
      const problem = await findFileProblem(file, { acceptedTypes, maxSizeMB });
      // An empty file carries no valid header either, so it is reported as a wrong type.
      if (problem) return { ok: false, reason: problem === 'size' ? 'size' : 'type' };

      setPendingCount((count) => count + 1);
      try {
        let ticket;
        try {
          ticket = await presign({
            body: { fileName: file.name, fileSize: file.size, contentType: file.type, tag },
          });
        } catch (error) {
          // An HTTP error from the API is thrown as its body; a fetch that never answered is a TypeError
          return { ok: false, reason: error instanceof TypeError ? 'network' : 'rejected' };
        }

        let response: Response;
        try {
          response = await fetch(ticket.url, {
            method: ticket.method,
            headers: ticket.requiredHeaders,
            body: file,
          });
        } catch {
          return { ok: false, reason: 'network' };
        }

        return response.ok ? { ok: true, s3Key: ticket.s3Key } : { ok: false, reason: 'rejected' };
      } finally {
        setPendingCount((count) => count - 1);
      }
    },
    [acceptedTypes, maxSizeMB, presign, tag],
  );

  return { uploadFile, isUploading: pendingCount > 0 };
}
