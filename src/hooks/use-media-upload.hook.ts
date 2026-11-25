'use client';

import { useCallback } from 'react';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import { mediaControllerPresignMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import { findFileProblem } from '@/lib/utils/file-signature.util';

type UploadContentType = 'image/jpeg' | 'image/png' | 'image/webp';

const DEFAULT_ACCEPTED_TYPES: UploadContentType[] = ['image/jpeg', 'image/png', 'image/webp'];

interface UseMediaUploadOptions {
  /** API-006 upload tag; selects the S3 prefix and access level (unknown tag → 400 E-MED-011). */
  readonly tag: string;
  readonly maxSizeMB?: number;
  readonly acceptedTypes?: readonly UploadContentType[];
  readonly errorMessage?: string;
  /** Toast for a file outside `acceptedTypes`; defaults to `errorMessage`. */
  readonly typeErrorMessage?: string;
}

interface UseMediaUploadResult {
  /** Uploads one file and resolves to its S3 key — the value other endpoints store. */
  readonly uploadFile: (file: File) => Promise<string | null>;
  readonly isUploading: boolean;
}

/**
 * API-006 upload against the real media API: ask for a presigned PUT, send the bytes straight to
 * S3 with every header the signature was built from, then hand the caller the resulting `s3Key`.
 * The API never sees the bytes.
 */
export function useMediaUpload({
  tag,
  maxSizeMB = 5,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  errorMessage = 'アップロードに失敗しました',
  typeErrorMessage = errorMessage,
}: UseMediaUploadOptions): UseMediaUploadResult {
  // `uploadFile` toasts its own failures; the shared MutationCache toast would double them.
  const { mutateAsync: presign, isPending } = useMutation({
    ...mediaControllerPresignMutation(),
    meta: { suppressErrorToast: true },
  });

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      // The picker's `accept` filter never sees a dropped file, so this is the only type gate.
      const problem = await findFileProblem(file, { acceptedTypes, maxSizeMB });
      if (problem === 'size') {
        toast.error(`ファイルサイズは${maxSizeMB}MB以下にしてください`);
        return null;
      }
      if (problem) {
        toast.error(typeErrorMessage);
        return null;
      }

      try {
        const session = await presign({
          body: { fileName: file.name, fileSize: file.size, contentType: file.type, tag },
        });

        // `requiredHeaders` is part of the signature — S3 answers 403 SignatureDoesNotMatch
        // if any of them is dropped or altered, so send them verbatim.
        const response = await fetch(session.url, {
          method: session.method,
          body: file,
          headers: session.requiredHeaders,
        });
        if (!response.ok) {
          toast.error(errorMessage);
          return null;
        }

        return session.s3Key;
      } catch (error) {
        toast.error(resolveApiErrorMessage(error));
        return null;
      }
    },
    [acceptedTypes, errorMessage, maxSizeMB, presign, tag, typeErrorMessage],
  );

  return { uploadFile, isUploading: isPending };
}
