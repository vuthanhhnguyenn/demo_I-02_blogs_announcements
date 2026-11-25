'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import Image from 'next/image';

import { ImageIcon, Loader2, Map, Trash2, Upload } from 'lucide-react';

import {
  type MediaUploadContentType,
  type MediaUploadFailureReason,
  useMediaUploadOutcome,
} from '@/hooks/use-media-upload-outcome.hook';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { cn } from '@/lib/utils';

import { useLockerLocationDuplicate } from '../_hooks/use-locker-location-duplicate.hook';
import { formatLockerLocationLabel, useLockerLocations } from '../_hooks/use-locker-locations.hook';
import {
  LOCKER_LOCATION_CAPTION_MAX_LENGTH,
  LOCKER_SUPPLEMENTARY_NOTE_MAX_LENGTH,
  type LockerFormValues,
} from '../_schemas/locker-form.schema';
import { storeMapHref } from './locker-form-floor-map';

const PHOTO_ACCEPTED_TYPES: readonly MediaUploadContentType[] = ['image/jpeg', 'image/png'];
const PHOTO_MAX_SIZE_MB = 5;

const PHOTO_UPLOAD_MESSAGES: Record<MediaUploadFailureReason, string> = {
  type: 'JPG・PNG 以外の形式のため登録できません',
  size: `${PHOTO_MAX_SIZE_MB}MBを超えているため登録できません`,
  network: 'ロッカー写真のアップロードに失敗しました。通信環境をご確認ください',
  rejected: 'ロッカー写真のアップロードに失敗しました',
};

type LockerFormAreaSectionProps = {
  excludeLockerId?: string;
  onOpenStoreMap: (href: string) => void;
  /** Reports the S3 photo upload in flight, so the page holds 保存 / 登録 until its key is in the form */
  onUploadingChange?: (isUploading: boolean) => void;
};

export function LockerFormAreaSection({
  excludeLockerId,
  onOpenStoreMap,
  onUploadingChange,
}: LockerFormAreaSectionProps) {
  const form = useFormContext<LockerFormValues>();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const storeId = useWatch({ control: form.control, name: 'storeId' });
  const lockerLocationId = useWatch({ control: form.control, name: 'lockerLocationId' });
  const images = useWatch({ control: form.control, name: 'images' }) ?? [];
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { locations, byId: locationsById } = useLockerLocations();
  const selectedLocation = lockerLocationId ? locationsById.get(lockerLocationId) : undefined;

  /**
   * FR-012: one or more photos (S3). Uploaded straight to S3 under the `facility-image` tag; the
   * key is sent with the cabinet (create) or through `POST …/images` (edit). Format / size
   * failures are reported inline, under the photos.
   */
  const { uploadFile, isUploading } = useMediaUploadOutcome({
    tag: 'facility-image',
    maxSizeMB: PHOTO_MAX_SIZE_MB,
    acceptedTypes: PHOTO_ACCEPTED_TYPES,
  });

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  const isLocationDuplicate = useLockerLocationDuplicate({
    storeId,
    lockerLocationId,
    excludeLockerId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">設置エリア・案内文・写真</CardTitle>
      </CardHeader>
      <CardContent className="px-6">
        {/* TODO(round3) R303: the read-only floor map (image / static SVG) was shown here —
            FR-016 is a Could and Phase 2, and no API carries a floor-map image. The 店舗マップ設定
            link below stays. */}

        <FormField
          control={form.control}
          name="lockerLocationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                設置エリア（ロケーション記号）<span className="text-destructive ml-0.5">*</span>
              </FormLabel>
              <Select
                value={field.value || null}
                onValueChange={(value) => {
                  if (value) field.onChange(value);
                }}
              >
                <FormControl>
                  <SelectTrigger className={isLocationDuplicate ? 'border-destructive' : ''}>
                    <SelectValue placeholder="設置エリアを選択">
                      {selectedLocation ? formatLockerLocationLabel(selectedLocation) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {formatLockerLocationLabel(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLocationDuplicate ? (
                <p className="text-destructive mt-1 text-xs">
                  設置エリア（ロケーション記号）が同一店舗内で重複しています
                </p>
              ) : null}
              <FormMessage />
              <div className="border-info/20 bg-info/5 mt-3 flex items-start gap-2 rounded-lg border px-3 py-2">
                <Map className="text-info mt-0.5 size-4 shrink-0" />
                <div className="text-foreground/80 text-xs leading-relaxed">
                  選択肢は{' '}
                  {/* Prototype `locker-form.tsx` L598-L605: a link, through the form's guard */}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 align-baseline text-xs"
                    onClick={() => onOpenStoreMap(storeMapHref(storeId))}
                  >
                    店舗マップ設定
                  </Button>{' '}
                  で登録されたエリア記号と連動します。フロアマップ画像の管理・エリア追加は店舗マップ設定側で行ってください。
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="locationCaption"
          render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel>案内文</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-[80px] text-sm leading-relaxed"
                  placeholder="更衣室入口から右手奥、女性専用エリアの隣"
                  maxLength={LOCKER_LOCATION_CAPTION_MAX_LENGTH}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <p className="text-muted-foreground mt-2 text-xs">
                会員向けスロット選択画面に表示される案内情報です
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="supplementaryNote"
          render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel>補足説明</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-[80px] text-sm leading-relaxed"
                  placeholder="スタッフ向けの補足説明（例: 1F男性更衣室入口付近に設置）"
                  maxLength={LOCKER_SUPPLEMENTARY_NOTE_MAX_LENGTH}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <p className="text-muted-foreground mt-2 text-xs">
                スタッフ向けの補足説明です（会員には表示されません）
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="images"
          render={({ field, fieldState }) => (
            <FormItem className="mt-4">
              <FormLabel>
                ロッカー写真<span className="text-destructive ml-0.5">*</span>
              </FormLabel>
              {/* `aria-invalid` on the wrapper lets the scroll-to-first-error helper reach this field */}
              <div aria-invalid={Boolean(fieldState.error)} className="flex flex-wrap gap-3">
                {(field.value ?? []).map((image) => (
                  <div
                    key={image.imageId ?? image.imageS3Key}
                    className="relative w-48 overflow-hidden rounded-lg border"
                  >
                    <Image
                      src={image.imageUrl}
                      alt="ロッカー写真"
                      width={192}
                      height={144}
                      unoptimized
                      className="h-36 w-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 size-7"
                      aria-label="写真を削除"
                      onClick={() =>
                        field.onChange(
                          (form.getValues('images') ?? []).filter(
                            (item) => item.imageS3Key !== image.imageS3Key,
                          ),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={isUploading}
                  className={cn(
                    'text-muted-foreground hover:border-primary/40 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    images.length > 0 ? 'h-36 w-48' : 'w-full',
                    fieldState.error && 'border-destructive',
                  )}
                  onClick={() => photoInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="mx-auto mb-2 size-6 animate-spin" />
                  ) : (
                    <ImageIcon className="mx-auto mb-2 size-6" />
                  )}
                  <span className="border-input bg-background hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium">
                    <Upload className="size-4" />
                    {isUploading ? 'アップロード中...' : '写真を追加'}
                  </span>
                  {images.length === 0 ? (
                    <p className="mt-2 text-xs">
                      JPG/PNG、最大{PHOTO_MAX_SIZE_MB}MB、推奨サイズ 800x600px
                    </p>
                  ) : null}
                </button>
              </div>
              {uploadError ? <p className="text-destructive text-xs">{uploadError}</p> : null}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  setUploadError(null);
                  const outcome = await uploadFile(file);
                  if (!outcome.ok) {
                    setUploadError(PHOTO_UPLOAD_MESSAGES[outcome.reason]);
                    return;
                  }
                  form.setValue(
                    'images',
                    [
                      ...(form.getValues('images') ?? []),
                      {
                        imageId: null,
                        imageS3Key: outcome.s3Key,
                        imageUrl: URL.createObjectURL(file),
                      },
                    ],
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
