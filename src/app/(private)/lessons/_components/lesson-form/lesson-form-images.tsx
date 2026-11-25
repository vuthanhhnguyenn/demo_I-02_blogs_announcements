'use client';

import { useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import Image from 'next/image';

import { GripVertical, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';

import { useMediaUpload } from '@/hooks/use-media-upload.hook';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import type { LessonFormValues, LessonImageItem } from '../../_schemas/lesson-form.schema';

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-bold">
        {number}
      </div>
      <h3 className="text-sm font-bold">{title}</h3>
    </div>
  );
}

interface LessonFormImagesProps {
  /** True from a pick / drop until every picked file has been uploaded (or failed) */
  onUploadingChange?: (uploading: boolean) => void;
}

export function LessonFormImages({ onUploadingChange }: LessonFormImagesProps) {
  const form = useFormContext<LessonFormValues>();
  const images = useWatch({ control: form.control, name: 'images' });
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API-006 upload (tag `lesson-image` → member-shared/lesson-image/…, the prefix API-111 takes);
  // the lesson stores the S3 key, previewed here from the local file until saved
  const { uploadFile } = useMediaUpload({ tag: 'lesson-image' });
  // The hook's own flag covers the presign call only, not the PUT to S3 — so count the picked
  // batches still in flight here; the form blocks 確認 / 登録 until it is back to 0.
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
      const newItems: LessonImageItem[] = [];
      for (const file of files) {
        const s3Key = await uploadFile(file);
        if (s3Key) {
          newItems.push({ id: crypto.randomUUID(), s3Key, url: URL.createObjectURL(file) });
        }
      }
      if (newItems.length === 0) return;
      form.setValue('images', [...form.getValues('images'), ...newItems], { shouldDirty: true });
    } finally {
      trackUpload(-1);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    void appendImages(files);
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

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === dropIndex) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      return;
    }
    const current = [...form.getValues('images')];
    const [moved] = current.splice(draggingIndex, 1);
    current.splice(dropIndex, 0, moved);
    form.setValue('images', current, { shouldDirty: true });
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  return (
    <Card>
      <CardContent className="px-6">
        <SectionHeader number={3} title="レッスン画像" />
        {images.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-3">
            {images.map((img, index) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group relative cursor-grab overflow-hidden rounded-lg border-2 transition-all active:cursor-grabbing ${
                  dragOverIndex === index && draggingIndex !== index
                    ? 'border-primary scale-105'
                    : 'border-transparent'
                } ${draggingIndex === index ? 'opacity-50' : ''}`}
              >
                <div className="relative aspect-3/2">
                  <Image
                    src={img.url}
                    alt={`レッスン画像 ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                {/* The first image is the main one (displayOrder 0) */}
                {index === 0 && (
                  <div className="bg-primary text-primary-foreground absolute right-0 bottom-0 left-0 py-0.5 text-center text-[9px] font-medium">
                    メイン
                  </div>
                )}
                <div className="absolute top-1 left-1 flex size-6 items-center justify-center rounded bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical className="size-3 text-white" />
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
            void appendImages(Array.from(e.dataTransfer.files ?? []));
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
      </CardContent>
    </Card>
  );
}
