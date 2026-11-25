'use client';

import { useEffect, useMemo, useRef } from 'react';

import Image from 'next/image';

import { ImageIcon, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { FormItem, FormLabel } from '@/components/ui/form';

import { findFileProblem } from '@/lib/utils/file-signature.util';

import {
  OPTION_IMAGE_ACCEPTED_TYPES,
  OPTION_IMAGE_MAX_SIZE_MB,
} from '../_hooks/use-option-image-upload';

interface OptionImageFieldProps {
  /** Delivery URL of the image already stored on the option (edit only). */
  currentUrl?: string | null;
  /** Newly picked file, not uploaded until the form is saved. */
  file: File | null;
  /** The stored image is marked for removal on save. */
  removed: boolean;
  onFileChange: (file: File | null) => void;
  onRemovedChange: (removed: boolean) => void;
  disabled?: boolean;
}

export function OptionImageField({
  currentUrl,
  file,
  removed,
  onFileChange,
  onRemovedChange,
  disabled,
}: Readonly<OptionImageFieldProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const shownUrl = previewUrl ?? (removed ? null : (currentUrl ?? null));

  const handlePick = async (picked: File | undefined) => {
    if (!picked) return;
    const problem = await findFileProblem(picked, {
      acceptedTypes: OPTION_IMAGE_ACCEPTED_TYPES,
      maxSizeMB: OPTION_IMAGE_MAX_SIZE_MB,
    });
    if (problem === 'type') toast.error('JPG / PNG 形式の画像を選択してください');
    else if (problem === 'empty') {
      toast.error('空のファイルは選択できません。別の画像を選択してください');
    } else if (problem === 'size') {
      toast.error(`ファイルサイズは${OPTION_IMAGE_MAX_SIZE_MB}MB以下にしてください`);
    } else onFileChange(picked);
  };

  const handleRemove = () => {
    if (file) onFileChange(null);
    else onRemovedChange(true);
  };

  return (
    <FormItem>
      <FormLabel>会員公開用画像</FormLabel>
      <div className="flex items-start gap-3">
        {shownUrl ? (
          // Prototype tile: 80px, with a round remove badge on the corner shown on hover. It also
          // shows on keyboard focus, so the action is not mouse-only.
          <div className="group relative size-20 rounded-lg border">
            <div className="absolute inset-0 overflow-hidden rounded-lg">
              <Image
                src={shownUrl}
                alt="会員公開用画像"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={disabled}
              onClick={handleRemove}
              aria-label="画像を削除"
              className="absolute -top-2 -right-2 size-5 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <div className="bg-muted/50 flex size-20 flex-col items-center justify-center gap-1 rounded-lg border">
            <ImageIcon className="text-muted-foreground/40 size-6" />
            <span className="text-muted-foreground text-[10px]">未設定</span>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="border-muted-foreground/30 size-20 flex-col gap-1 border-dashed"
        >
          <Upload className="text-muted-foreground size-4" />
          <span className="text-muted-foreground text-[10px]">{shownUrl ? '変更' : '追加'}</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={OPTION_IMAGE_ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            const input = e.target;
            const picked = input.files?.[0];
            input.value = '';
            void handlePick(picked);
          }}
        />
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        会員アプリに表示される画像です。推奨: 800×600px、JPG/PNG
      </p>
    </FormItem>
  );
}
