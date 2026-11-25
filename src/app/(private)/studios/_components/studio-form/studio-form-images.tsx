'use client';

import { useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import Image from 'next/image';

import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';

import { useMediaUpload } from '@/hooks/use-media-upload.hook';

import { Button } from '@/components/ui/button';

import type { StudioFormValues, StudioImageItem } from '../studio-form.schema';

interface StudioFormImagesProps {
  /** Fired when the first batch starts and when the last one ends */
  onUploadingChange?: (uploading: boolean) => void;
}

export function StudioFormImages({ onUploadingChange }: StudioFormImagesProps) {
  const form = useFormContext<StudioFormValues>();
  const images = useWatch({ control: form.control, name: 'images' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API-006 upload, tag `facility-image` — the tag API-110 §6.3 takes for studio images (FR-002-02:
  // JPG / PNG / WebP, 5 MB).
  const { uploadFile } = useMediaUpload({
    tag: 'facility-image',
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    typeErrorMessage: 'JPG / PNG / WebP の画像を選択してください',
  });
  // The hook's own flag covers the presign call only, not the PUT to S3 — so count the picked
  // batches still in flight here; the form blocks 確認 / 保存 until it is back to 0.
  const batchesInFlight = useRef(0);
  const [isUploading, setIsUploading] = useState(false);
  const trackUpload = (delta: 1 | -1) => {
    batchesInFlight.current += delta;
    const uploading = batchesInFlight.current > 0;
    setIsUploading(uploading);
    onUploadingChange?.(uploading);
  };

  const appendImages = async (files: File[]) => {
    if (files.length === 0) return;
    trackUpload(1);
    try {
      const newItems: StudioImageItem[] = [];
      for (const file of files) {
        const s3Key = await uploadFile(file);
        if (s3Key) {
          newItems.push({ id: crypto.randomUUID(), s3Key, url: URL.createObjectURL(file) });
        }
      }
      // Into the form before the flag drops, so 確認 never reads the list without them
      if (newItems.length === 0) return;
      form.setValue('images', [...form.getValues('images'), ...newItems], { shouldDirty: true });
    } finally {
      trackUpload(-1);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    appendImages(files);
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    const current = form.getValues('images');
    form.setValue(
      'images',
      current.filter((img) => img.id !== id),
      { shouldDirty: true },
    );
  };

  return (
    <>
      <h2 className="mb-4 text-base font-bold">スタジオ画像</h2>
      {images.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-lg border border-transparent"
            >
              <div className="relative aspect-3/2">
                <Image src={img.url} alt="スタジオ画像" fill unoptimized className="object-cover" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-destructive absolute top-1 right-1 size-6 rounded bg-black/50 p-0 text-white opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => removeImage(img.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          appendImages(Array.from(e.dataTransfer.files ?? []));
        }}
        className="border-muted-foreground/20 hover:border-primary/40 w-full cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? (
          <Loader2 className="text-muted-foreground/40 mx-auto mb-2 size-8 animate-spin" />
        ) : (
          <ImageIcon className="text-muted-foreground/40 mx-auto mb-2 size-8" />
        )}
        <p className="text-muted-foreground text-sm font-medium">
          {isUploading ? 'アップロード中...' : '画像をドラッグ&ドロップで追加'}
        </p>
        <p className="text-muted-foreground mt-1 text-[10px]">
          推奨: 1200 x 800px (3:2) | JPG, PNG, WebP | 最大5MB | 複数枚対応
        </p>
        <span className="bg-background hover:bg-accent mt-3 inline-flex h-8 items-center justify-center gap-1 rounded-md border px-3 text-xs">
          <Upload className="size-3" />
          画像を追加
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </>
  );
}
