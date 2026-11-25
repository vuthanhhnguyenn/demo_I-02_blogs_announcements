'use client';

import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import Image from 'next/image';

import { Upload, X } from 'lucide-react';

import {
  type MediaUploadContentType,
  useMediaUploadOutcome,
} from '@/hooks/use-media-upload-outcome.hook';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

import { cn } from '@/lib/utils';
import { findFileProblem } from '@/lib/utils/file-signature.util';

import {
  STORE_PHOTO_MAX_COUNT,
  STORE_PHOTO_MAX_SIZE_MB,
  type StoreFormValues,
  type StorePhotoDraft,
} from '../_schemas/store-form.schema';
import { storeImageSrc } from '../_utils/store-image-url.util';

const ACCEPTED_TYPES: readonly MediaUploadContentType[] = ['image/jpeg', 'image/png'];

/** Max uploads in flight at once — the backend's per-user pending-session cap (API-006 §11) */
const STORE_PHOTO_UPLOAD_CONCURRENCY = 5;

/** FR-057a / FR-057b — spec-proposed copy (no V0 source) */
const PHOTO_MESSAGES = {
  type: (name: string) => `JPG・PNG 以外の形式のため登録できません（選んだファイル: ${name}）`,
  size: (bytes: number) =>
    `${STORE_PHOTO_MAX_SIZE_MB}MBを超えているため登録できません（選んだファイル: ${(bytes / 1024 / 1024).toFixed(1)}MB）`,
  max: `写真は最大${STORE_PHOTO_MAX_COUNT}枚まで登録できます`,
  uploadFailed: '写真のアップロードに失敗しました。もう一度お試しください',
} as const;

/** A tile's React key: the stored key once uploaded, else the local preview URL (unique per file) */
const photoKey = (photo: StorePhotoDraft) => photo.previewUrl ?? photo.s3Key;

export interface StoreFormPhotosProps {
  /** Edit mode, while the store's current photo list is being read */
  isLoading?: boolean;
  /** Edit mode, the photo-list read failed — reported inside the card only (FR-056) */
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * 店舗写真 — dev-added, no V0 source (spec 028 FR-055–FR-059f, 2026-10-02).
 *
 * Visual reference is the I-01 store-page form's 写真管理 card (`store-page-form.tsx`
 * L1023-L1120), minus what is I-01-specific: no 公開/非公開 dot, no メイン badge, no 並び順を編集,
 * and no caption input (FR-059).
 *
 * Holds the list in the form's `photos` field, so adding or deleting marks the form dirty and the
 * discard dialog brings a deleted photo back — nothing is unlinked before the form is saved
 * (FR-058). Uploads start straight away (FR-057); the save itself is the pages' full-set
 * `PUT …/images`.
 *
 * Never locked for a restricted Staff user (FR-086a): the photo write is its own operation, which
 * the backend grants Staff for their own store.
 */
export function StoreFormPhotos({
  isLoading = false,
  isError = false,
  onRetry,
}: StoreFormPhotosProps) {
  const form = useFormContext<StoreFormValues>();
  const photos = useWatch({ control: form.control, name: 'photos' }) ?? [];
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const { uploadFile } = useMediaUploadOutcome({
    tag: 'store-image',
    maxSizeMB: STORE_PHOTO_MAX_SIZE_MB,
    acceptedTypes: ACCEPTED_TYPES,
  });

  const isFull = photos.length >= STORE_PHOTO_MAX_COUNT;
  const canAdd = !isFull && !isLoading && !isError;

  const setPhotos = (next: StorePhotoDraft[]) =>
    form.setValue('photos', next, { shouldDirty: true });

  const uploadOne = async (file: File, previewUrl: string) => {
    const outcome = await uploadFile(file);
    // Read the list afresh: other uploads may have settled, or a photo been deleted, meanwhile
    const current = form.getValues('photos');
    if (outcome.ok) {
      setPhotos(
        current.map((photo) =>
          photo.previewUrl === previewUrl
            ? { ...photo, s3Key: outcome.s3Key, status: 'uploaded' }
            : photo,
        ),
      );
      return;
    }
    URL.revokeObjectURL(previewUrl);
    setPhotos(current.filter((photo) => photo.previewUrl !== previewUrl));
    // One line however many uploads failed (Bug No.10)
    setMessages((previous) =>
      previous.includes(PHOTO_MESSAGES.uploadFailed)
        ? previous
        : [...previous, PHOTO_MESSAGES.uploadFailed],
    );
  };

  /**
   * Bug No.10: the backend allows only {@link STORE_PHOTO_UPLOAD_CONCURRENCY} pending upload
   * sessions per user (API-006 §11) and answers 429 E-MED-008 beyond that. Uploads therefore run
   * through one queue shared by every pick/drop; a queued photo keeps its 'uploading' tile.
   */
  const queueRef = useRef<{ file: File; previewUrl: string }[]>([]);
  const runningRef = useRef(0);

  const drainQueue = () => {
    while (runningRef.current < STORE_PHOTO_UPLOAD_CONCURRENCY && queueRef.current.length > 0) {
      const next = queueRef.current.shift();
      if (!next) break;
      // Skip a photo that left the form while it waited (e.g. the edits were discarded)
      if (!form.getValues('photos').some((photo) => photo.previewUrl === next.previewUrl)) {
        URL.revokeObjectURL(next.previewUrl);
        continue;
      }
      runningRef.current += 1;
      void uploadOne(next.file, next.previewUrl).finally(() => {
        runningRef.current -= 1;
        drainQueue();
      });
    }
  };

  // Leaving the form drops the photos still waiting: nothing would show their result
  useEffect(
    () => () => {
      queueRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      queueRef.current = [];
    },
    [],
  );

  const addFiles = async (files: File[]) => {
    if (files.length === 0 || !canAdd) return;

    // Bug No.13: `File.type` comes from the extension, so the leading bytes are checked too
    const problems = await Promise.all(
      files.map((file) =>
        findFileProblem(file, {
          acceptedTypes: ACCEPTED_TYPES,
          maxSizeMB: STORE_PHOTO_MAX_SIZE_MB,
        }),
      ),
    );

    const nextMessages: string[] = [];
    const accepted: File[] = [];
    let slots = STORE_PHOTO_MAX_COUNT - form.getValues('photos').length;
    let overflow = false;

    // Refused before upload, in pick order (FR-057a). The files that still fit are kept.
    files.forEach((file, index) => {
      const problem = problems[index];
      if (problem === 'type' || problem === 'empty') {
        nextMessages.push(PHOTO_MESSAGES.type(file.name));
      } else if (problem === 'size') {
        nextMessages.push(PHOTO_MESSAGES.size(file.size));
      } else if (slots <= 0) {
        overflow = true;
      } else {
        accepted.push(file);
        slots -= 1;
      }
    });
    if (overflow) nextMessages.push(PHOTO_MESSAGES.max);
    setMessages(nextMessages);

    if (accepted.length === 0) return;
    const drafts = accepted.map((file) => ({
      file,
      draft: {
        s3Key: '',
        caption: null,
        previewUrl: URL.createObjectURL(file),
        status: 'uploading',
      } satisfies StorePhotoDraft,
    }));
    // New photos are appended with no caption (FR-059)
    setPhotos([...form.getValues('photos'), ...drafts.map(({ draft }) => draft)]);
    queueRef.current.push(
      ...drafts.map(({ file, draft }) => ({ file, previewUrl: draft.previewUrl })),
    );
    drainQueue();
  };

  const removePhoto = (target: StorePhotoDraft) => {
    if (target.previewUrl) URL.revokeObjectURL(target.previewUrl);
    const key = photoKey(target);
    setPhotos(form.getValues('photos').filter((photo) => photoKey(photo) !== key));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void addFiles(Array.from(event.target.files ?? []));
    // Picking the same file again must fire `change` again
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    void addFiles(Array.from(event.dataTransfer.files ?? []));
  };

  return (
    <Card id="photos" className="scroll-mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">店舗写真</CardTitle>
          <span className="text-muted-foreground text-xs">
            {photos.length}枚 / 最大{STORE_PHOTO_MAX_COUNT}枚
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-xs">
            店舗の外観・内装・設備の写真を登録します。表示順は登録した順です。
          </p>

          {isError ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-6 text-center">
              <p className="text-destructive text-xs">店舗写真の取得に失敗しました</p>
              {onRetry && (
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                  再読み込み
                </Button>
              )}
            </div>
          ) : (
            // Four columns up to a 1024px viewport, five from 1280px (test plan LV-18, BUG-U2-14)
            <div className="grid grid-cols-4 gap-4 xl:grid-cols-5">
              {isLoading
                ? Array.from({ length: 4 }, (_, index) => (
                    <Skeleton key={index} className="aspect-video rounded-lg" />
                  ))
                : photos.map((photo, index) => (
                    <div
                      key={photoKey(photo)}
                      className="group relative overflow-hidden rounded-lg border"
                    >
                      <div className="bg-muted relative aspect-video overflow-hidden">
                        <Image
                          src={
                            photo.previewUrl ??
                            storeImageSrc({ s3Key: photo.s3Key, url: photo.displayUrl })
                          }
                          alt={`店舗写真 ${index + 1}`}
                          fill
                          unoptimized
                          className={cn(
                            'object-cover',
                            photo.status === 'uploading' && 'opacity-50',
                          )}
                        />
                        {photo.status === 'uploading' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Spinner className="text-muted-foreground size-5" />
                          </div>
                        )}
                      </div>
                      {photo.status === 'uploaded' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="写真を削除"
                          className="bg-background/80 hover:bg-destructive hover:text-destructive-foreground absolute top-1 right-1 size-6 p-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => removePhoto(photo)}
                        >
                          <X className="size-3" />
                        </Button>
                      )}
                    </div>
                  ))}

              {!isLoading && (
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (canAdd) setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={cn(
                    'border-muted-foreground/25 flex aspect-video items-center justify-center rounded-lg border-2 border-dashed transition-colors',
                    canAdd
                      ? 'hover:border-muted-foreground/40 cursor-pointer'
                      : 'cursor-not-allowed opacity-50',
                    isDragOver && 'border-primary/50',
                  )}
                >
                  <span className="flex flex-col items-center gap-1 text-center">
                    <Upload className="text-muted-foreground size-4" />
                    <span className="text-muted-foreground text-[10px]">写真を追加</span>
                  </span>
                </button>
              )}
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {messages.length > 0 && (
            <div className="flex flex-col gap-1" role="alert">
              {messages.map((message, index) => (
                // A refused file's name can be one unbroken 255-char token (LV-16, BUG-U2-12)
                <p
                  key={`${index}-${message}`}
                  className="text-destructive min-w-0 text-xs [overflow-wrap:anywhere]"
                >
                  {message}
                </p>
              ))}
            </div>
          )}

          <p className="text-muted-foreground text-[10px]">
            JPG, PNG / 最大{STORE_PHOTO_MAX_SIZE_MB}MB / 最大{STORE_PHOTO_MAX_COUNT}枚
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
