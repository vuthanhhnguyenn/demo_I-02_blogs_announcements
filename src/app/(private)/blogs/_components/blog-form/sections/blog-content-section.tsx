'use client';

// Client component: react-hook-form controllers, the hidden file input and the upload hook.
import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { type Control, useController, useFormState } from 'react-hook-form';

import Image from 'next/image';

import { Upload } from 'lucide-react';

import { useImageUpload } from '@/hooks/use-image-upload.hook';

import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import type { BlogFormValues } from '../../../_schemas/blog-form.schema';

/** サムネイル画像: PNG / JPG only, at most 5MB (spec Assumptions, research F5). */
const THUMBNAIL_ACCEPTED_TYPES = ['image/jpeg', 'image/png'] as const;
const THUMBNAIL_MAX_SIZE_MB = 5;
const THUMBNAIL_UPLOAD_ERROR = '画像のアップロードに失敗しました';

interface BlogContentSectionProps {
  control: Control<BlogFormValues>;
  /** The 本文 editor (bound to `body` by the parent); label, required mark and error stay here. */
  bodyEditor: ReactNode;
  /** Reports the thumbnail upload state so the form can block saving meanwhile. */
  onUploadingChange?: (isUploading: boolean) => void;
}

export function BlogContentSection({
  control,
  bodyEditor,
  onUploadingChange,
}: Readonly<BlogContentSectionProps>) {
  const { errors } = useFormState({ control, name: ['title', 'body'] });
  const { field: titleField } = useController({ control, name: 'title' });
  const { field: thumbnailS3KeyField } = useController({ control, name: 'thumbnailS3Key' });
  const { field: thumbnailUrlField } = useController({ control, name: 'thumbnailUrl' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadFile, isUploading } = useImageUpload({
    acceptedTypes: THUMBNAIL_ACCEPTED_TYPES,
    maxSizeMB: THUMBNAIL_MAX_SIZE_MB,
    errorMessage: THUMBNAIL_UPLOAD_ERROR,
  });

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires `change`.
    event.target.value = '';
    if (!file) return;

    // Checked here (not only in the hook) so the reason is shown inline under the field.
    if (!(THUMBNAIL_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      setUploadError('PNG・JPG形式の画像を選択してください');
      return;
    }
    if (file.size > THUMBNAIL_MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`ファイルサイズは${THUMBNAIL_MAX_SIZE_MB}MB以下にしてください`);
      return;
    }

    setUploadError(null);
    const url = await uploadFile(file);
    if (!url) {
      setUploadError(THUMBNAIL_UPLOAD_ERROR);
      return;
    }
    // Mock presign only returns `public_url`; it doubles as the stored key until the real
    // upload flow returns a separate S3 key.
    thumbnailS3KeyField.onChange(url);
    thumbnailUrlField.onChange(url);
  };

  const thumbnailUrl = thumbnailUrlField.value;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">記事コンテンツ</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-6">
          <FormField label="タイトル" required error={errors.title?.message}>
            <Input
              placeholder="例: 初心者向け！自宅でもできる筋トレメニュー5選"
              {...titleField}
              aria-invalid={!!errors.title}
            />
          </FormField>

          <FormField label="本文" required error={errors.body?.message}>
            {bodyEditor}
          </FormField>

          <FormField label="サムネイル画像" error={uploadError ?? undefined}>
            <div className="flex items-start gap-4">
              <div className="bg-muted relative aspect-video w-[160px] shrink-0 overflow-hidden rounded-lg border">
                {thumbnailUrl ? (
                  <Image
                    src={thumbnailUrl}
                    alt="サムネイル"
                    fill
                    sizes="160px"
                    unoptimized
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit gap-1"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4" />
                  {isUploading ? 'アップロード中...' : '画像を選択'}
                </Button>
                <p className="text-muted-foreground text-xs">
                  推奨: 1200×630px / PNG, JPG (最大5MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={THUMBNAIL_ACCEPTED_TYPES.join(',')}
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}
