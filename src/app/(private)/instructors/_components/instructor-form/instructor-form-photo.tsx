'use client';

import { useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import Image from 'next/image';

import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';

import { useMediaUpload } from '@/hooks/use-media-upload.hook';

import { Button } from '@/components/ui/button';

import type { InstructorFormValues } from '../instructor-form.schema';

interface InstructorFormPhotoProps {
  /** Fired when an upload starts and when it ends — the form blocks 確認 / 保存 meanwhile */
  onUploadingChange?: (uploading: boolean) => void;
}

export function InstructorFormPhoto({ onUploadingChange }: InstructorFormPhotoProps) {
  const form = useFormContext<InstructorFormValues>();
  const photoUrl = useWatch({ control: form.control, name: 'photoUrl' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  // API-006 `facility-image` (D17): the API stores the key; the form previews the local file
  const { uploadFile } = useMediaUpload({
    tag: 'facility-image',
    maxSizeMB: 2,
    acceptedTypes: ['image/jpeg', 'image/png'],
    errorMessage: '画像のアップロードに失敗しました',
    typeErrorMessage: 'JPG・PNG形式の画像を選択してください',
  });

  // The hook's own flag covers the presign call only, not the PUT to S3 — so the whole upload is
  // tracked here (studios precedent)
  const [isUploading, setIsUploading] = useState(false);
  const setUploading = (uploading: boolean) => {
    setIsUploading(uploading);
    onUploadingChange?.(uploading);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const s3Key = await uploadFile(file);
      if (!s3Key) return;
      // Into the form before the flag drops, so 確認 never reads the photo without it
      form.setValue('facePhotoS3Key', s3Key, { shouldDirty: true });
      form.setValue('photoUrl', URL.createObjectURL(file), { shouldDirty: true });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    form.setValue('facePhotoS3Key', null, { shouldDirty: true });
    form.setValue('photoUrl', null, { shouldDirty: true });
  };

  return (
    <>
      <h2 className="mb-4 text-base font-bold">顔写真</h2>
      <div className="flex items-start gap-6">
        {photoUrl ? (
          <div className="relative size-24 shrink-0 overflow-hidden rounded-full border">
            <Image
              src={photoUrl}
              alt="プロフィール画像"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        ) : (
          <div className="border-border text-muted-foreground flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed">
            <ImageIcon className="size-6" />
            <span className="text-[10px]">画像を追加</span>
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              画像をアップロード
            </Button>
            {photoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1 text-xs"
                disabled={isUploading}
                onClick={handleRemove}
              >
                <Trash2 className="size-3.5" />
                削除
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-[10px]">
            推奨サイズ: 400×400px / JPG, PNG / 最大2MB
          </p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileSelect}
      />
    </>
  );
}
