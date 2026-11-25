'use client';

import { useCallback } from 'react';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { mediaControllerPresignMutation } from '@/lib/api-real/@tanstack/react-query.gen';

const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];
const UPLOAD_FAILED = '顔写真のアップロードに失敗しました';
const INVALID_TYPE = '顔写真はJPG・PNG形式の画像を選択してください';

/** JPEG (FF D8 FF) / PNG (89 50 4E 47 0D 0A 1A 0A) signatures. */
const IMAGE_SIGNATURES = [
  [0xff, 0xd8, 0xff],
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
];

/** The file's bytes really are a JPEG / PNG — a renamed text file is refused (BUG-D-09). */
async function hasImageSignature(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  return IMAGE_SIGNATURES.some((sig) => sig.every((byte, i) => head[i] === byte));
}

export type MemberPhotoUploadResult =
  | { ok: true; s3Key: string; previewUrl: string }
  /** `invalid` = the chosen file is refused (shown under the field); `failed` = upload error. */
  | { ok: false; reason: 'invalid' | 'failed'; message: string };

/**
 * 顔写真 upload for the admin enrolment form (FR-M009): API-006 presign with
 * `tag: 'member-photo'` (private access level), then PUT the bytes straight to S3 with the
 * headers the signature requires. On success resolves to `{ s3Key, previewUrl }` — the s3Key is what
 * `POST /admin/applications` expects as `member.facePhotoS3Key`; the preview is a local
 * object URL (the private object is not publicly readable).
 */
export function useMemberPhotoUpload() {
  const { mutateAsync: presign } = useMutation({
    ...mediaControllerPresignMutation(),
    // Reported once below as a single upload failure.
    meta: { suppressErrorToast: true },
  });

  return useCallback(
    async (file: File): Promise<MemberPhotoUploadResult> => {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return {
          ok: false,
          reason: 'invalid',
          message: `顔写真のファイルサイズは${MAX_SIZE_MB}MB以下にしてください`,
        };
      }
      if (!ACCEPTED_TYPES.includes(file.type) || !(await hasImageSignature(file))) {
        return { ok: false, reason: 'invalid', message: INVALID_TYPE };
      }
      try {
        const target = await presign({
          body: {
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            tag: 'member-photo',
          },
        });
        // Send exactly the signed headers — an extra or duplicated Content-Type breaks the S3
        // signature (403). The browser sets Content-Length itself.
        const res = await fetch(target.url, {
          method: target.method || 'PUT',
          headers: target.requiredHeaders,
          body: file,
        });
        if (!res.ok) {
          toast.error(UPLOAD_FAILED);
          return { ok: false, reason: 'failed', message: UPLOAD_FAILED };
        }
        return { ok: true, s3Key: target.s3Key, previewUrl: URL.createObjectURL(file) };
      } catch {
        toast.error(UPLOAD_FAILED);
        return { ok: false, reason: 'failed', message: UPLOAD_FAILED };
      }
    },
    [presign],
  );
}
