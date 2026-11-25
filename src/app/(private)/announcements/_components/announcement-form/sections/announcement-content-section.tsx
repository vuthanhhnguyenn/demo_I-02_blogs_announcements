'use client';

// Client component: react-hook-form controllers, the hidden file input and the upload hook.
import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { type Control, useController, useFormState } from 'react-hook-form';

import Image from 'next/image';

import {
  ANNOUNCEMENT_THUMBNAIL_HINT,
  ANNOUNCEMENT_TITLE_PLACEHOLDER,
} from '@/app/(private)/announcements/_constants/announcement-form.constants';
import type { AnnouncementFormValues } from '@/app/(private)/announcements/_schemas/announcement-form.schema';
import { Settings, Upload } from 'lucide-react';

import { useImageUpload } from '@/hooks/use-image-upload.hook';

import { FormField } from '@/components/common/form-field';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { UserRole } from '@/types/permission.type';

/** サムネイル画像: PNG / JPG only, at most 5MB (spec Assumptions, research F5). */
const THUMBNAIL_ACCEPTED_TYPES = ['image/jpeg', 'image/png'] as const;
const THUMBNAIL_MAX_SIZE_MB = 5;
const THUMBNAIL_UPLOAD_ERROR = '画像のアップロードに失敗しました';
const CATEGORY_MANAGER_ROLES = [UserRole.Headquarter, UserRole.System] as const;

interface AnnouncementContentSectionProps {
  control: Control<AnnouncementFormValues>;
  /** The カテゴリ field (select bound to `categoryId`). */
  categoryField: ReactNode;
  /** The 本文 editor (bound to `body` by the parent); label, optional mark and error stay here. */
  bodyEditor: ReactNode;
  /** 「カテゴリを管理」 — the parent navigates to the category master for お知らせ (discard guard). */
  onManageCategories: () => void;
  /** Reports the thumbnail upload state so the form can block saving meanwhile. */
  onUploadingChange?: (isUploading: boolean) => void;
}

/**
 * Card 「コンテンツ情報」 (prototype announcement-form.tsx L242-L331): タイトル, カテゴリ, 本文 and
 * サムネイル画像 in one card, 「カテゴリを管理」 in its header.
 */
export function AnnouncementContentSection({
  control,
  categoryField,
  bodyEditor,
  onManageCategories,
  onUploadingChange,
}: Readonly<AnnouncementContentSectionProps>) {
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">コンテンツ情報</CardTitle>
        <RoleGatedButton
          type="button"
          allowedRoles={CATEGORY_MANAGER_ROLES}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground gap-1"
          onClick={onManageCategories}
        >
          <Settings className="size-4" />
          カテゴリを管理
        </RoleGatedButton>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-6">
          <FormField label="タイトル" required error={errors.title?.message}>
            <Input
              placeholder={ANNOUNCEMENT_TITLE_PLACEHOLDER}
              {...titleField}
              aria-invalid={!!errors.title}
            />
          </FormField>

          {categoryField}

          {/* 本文 is optional for お知らせ (I-02 FR-002, Clarification Q1). */}
          <FormField label="本文" optional error={errors.body?.message}>
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
                <p className="text-muted-foreground text-xs">{ANNOUNCEMENT_THUMBNAIL_HINT}</p>
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
