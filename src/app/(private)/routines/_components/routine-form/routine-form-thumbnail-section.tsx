'use client';

import { useCallback, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import Image from 'next/image';

import { useMutation } from '@tanstack/react-query';
import { ImageIcon, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import { mediaControllerPresignMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import { findFileProblem } from '@/lib/utils/file-signature.util';

import type { RoutineFormValues } from '../../_schemas/routine-form.schema';

const MAX_THUMBNAILS = 5;

const ROUTINE_THUMBNAIL_UPLOAD_TAG = 'routine-thumbnail';
const ROUTINE_THUMBNAIL_ACCEPTED_TYPES = ['image/jpeg', 'image/png'] as const;
const ROUTINE_THUMBNAIL_MAX_SIZE_MB = 5;

/**
 * Presign + S3 PUT, toasting each failure exactly once. The shared `useMediaUpload` toasts in its
 * own catch *and* lets the MutationCache toast the same presign error (two identical toasts), so
 * this presign opts out of the cache toast.
 */
function useRoutineThumbnailUpload() {
  const { mutateAsync: presign } = useMutation({
    ...mediaControllerPresignMutation(),
    meta: { suppressErrorToast: true },
  });

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      const problem = await findFileProblem(file, {
        acceptedTypes: ROUTINE_THUMBNAIL_ACCEPTED_TYPES,
        maxSizeMB: ROUTINE_THUMBNAIL_MAX_SIZE_MB,
      });
      if (problem === 'size') {
        toast.error(`ファイルサイズは${ROUTINE_THUMBNAIL_MAX_SIZE_MB}MB以下にしてください`);
        return null;
      }
      if (problem) {
        toast.error('JPG・PNG形式の画像を選択してください');
        return null;
      }

      try {
        const session = await presign({
          body: {
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            tag: ROUTINE_THUMBNAIL_UPLOAD_TAG,
          },
        });
        // `requiredHeaders` are part of the signature — send them verbatim.
        const response = await fetch(session.url, {
          method: session.method,
          body: file,
          headers: session.requiredHeaders,
        });
        if (!response.ok) {
          toast.error('アップロードに失敗しました');
          return null;
        }
        return session.s3Key;
      } catch (error) {
        toast.error(resolveApiErrorMessage(error));
        return null;
      }
    },
    [presign],
  );

  return { uploadFile };
}

export function RoutineFormThumbnailSection({
  storedPreviews = {},
  onUploadingChange,
}: {
  /** S3 key → signed delivery URL of the gallery the routine already has (edit mode). */
  storedPreviews?: Record<string, string>;
  /** Fired when an upload starts and when it ends — the form blocks 登録 / 更新 meanwhile */
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const form = useFormContext<RoutineFormValues>();
  const value = useWatch({ control: form.control, name: 'thumbnailS3Keys' });
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useRoutineThumbnailUpload();
  // The presign mutation's own flag covers neither the PUT to S3 nor the gap between files, so
  // the whole batch is tracked here (instructors / lockers precedent)
  const [isUploading, setIsUploading] = useState(false);
  const setUploading = (uploading: boolean) => {
    setIsUploading(uploading);
    onUploadingChange?.(uploading);
  };
  // An S3 key is not renderable on its own: stored keys preview through the signed URL the detail
  // returns, fresh uploads through an object URL of the picked file.
  const [previews, setPreviews] = useState<Record<string, string>>(storedPreviews);

  const handleFiles = async (files: FileList | null) => {
    if (isUploading || !files || files.length === 0) return;
    const remaining = MAX_THUMBNAILS - value.length;
    const selected = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded: Array<{ key: string; previewUrl: string }> = [];
      for (const file of selected) {
        const key = await uploadFile(file);
        if (key) uploaded.push({ key, previewUrl: URL.createObjectURL(file) });
      }
      if (uploaded.length > 0) {
        setPreviews((prev) => ({
          ...prev,
          ...Object.fromEntries(uploaded.map(({ key, previewUrl }) => [key, previewUrl])),
        }));
        // Into the form before the flag drops, so a save never reads the gallery without them
        const current = form.getValues('thumbnailS3Keys');
        form.setValue(
          'thumbnailS3Keys',
          [...current, ...uploaded.map(({ key }) => key)].slice(0, MAX_THUMBNAILS),
          { shouldDirty: true },
        );
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (index: number) => {
    form.setValue(
      'thumbnailS3Keys',
      value.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  };

  return (
    <Card>
      <CardContent className="px-6 py-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-bold">
            2
          </div>
          <h3 className="text-sm font-bold">サムネイル画像</h3>
        </div>
        <p className="text-muted-foreground mb-3 text-xs">
          最大{MAX_THUMBNAILS}枚まで登録できます。1枚目がメイン画像として使用されます。
        </p>

        <div className="space-y-3">
          {value.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {value.map((key, index) => (
                <div key={key} className="group relative">
                  <div className="bg-muted relative flex size-24 items-center justify-center overflow-hidden rounded-md">
                    {previews[key] ? (
                      <Image
                        src={previews[key]}
                        alt={`サムネイル ${index + 1}`}
                        fill
                        sizes="96px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <ImageIcon
                        className="text-muted-foreground size-6"
                        aria-label={`サムネイル ${index + 1}（登録済み）`}
                      />
                    )}
                  </div>
                  {index === 0 && (
                    <span className="bg-primary text-primary-foreground absolute top-1 left-1 rounded px-1 text-[10px]">
                      メイン
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="bg-background/80 absolute top-1 right-1 size-6 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                    disabled={isUploading}
                    onClick={() => removeAt(index)}
                  >
                    <Trash2 className="text-destructive size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {value.length < MAX_THUMBNAILS && (
            <button
              type="button"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void handleFiles(event.dataTransfer.files);
              }}
              className="border-border hover:border-primary/50 hover:bg-muted/30 flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors disabled:opacity-60"
            >
              {isUploading ? (
                <Loader2 className="text-muted-foreground size-8 animate-spin" />
              ) : (
                <ImagePlus className="text-muted-foreground size-8" />
              )}
              <p className="text-muted-foreground text-sm">
                {isUploading ? 'アップロード中...' : 'クリックまたはドラッグでアップロード'}
              </p>
              <p className="text-muted-foreground text-xs">JPG・PNG / 最大5MB</p>
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(event) => void handleFiles(event.target.files)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
