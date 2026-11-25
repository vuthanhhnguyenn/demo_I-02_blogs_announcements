'use client';

import { type RefObject, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import Image from 'next/image';

import { ImagePlus, Loader2, Trash2 } from 'lucide-react';

import { ExerciseRefMasterSelectInput } from '@/components/common/data-select-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { cn } from '@/lib/utils';

import {
  EXERCISE_HAND_USAGE_LABELS,
  EXERCISE_HAND_USAGE_OPTIONS,
  EXERCISE_IMAGE_MAX_COUNT,
  EXERCISE_LEVEL_OPTIONS,
  findExerciseOptionLabel,
} from '../_constants/constants';
import type { ExerciseMasterOption } from '../_hooks/use-exercise-master-options';
import type { ExerciseFormInput, ExerciseFormValues } from '../_schemas/exercise-form.schema';
import { exerciseMediaUrl } from '../_utils/exercise-image-url.util';
import { ExerciseEnglishTextField } from './exercise-english-text-field';
import { ExercisePublishConfirmDialog } from './exercise-publish-confirm-dialog';
import { ExerciseSecondaryMuscleChips } from './exercise-secondary-muscle-chips';

/** Matches the form's other selects (full width, input height). */
const REF_MASTER_TRIGGER_CLASS = 'h-8 w-full text-sm';

type ExerciseFormBasicTabProps = {
  imageInputRef: RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  onHandleImageFiles: (files: File[]) => Promise<void>;
  onToolChange: (value: string | null) => void;
  primaryMuscleOptions: ExerciseMasterOption[];
};

export function ExerciseFormBasicTab({
  imageInputRef,
  isUploading,
  onHandleImageFiles,
  onToolChange,
  primaryMuscleOptions,
}: Readonly<ExerciseFormBasicTabProps>) {
  const form = useFormContext<ExerciseFormInput>();
  const { fields, remove } = useFieldArray({
    control: form.control,
    name: 'images',
  });
  const images = useWatch({ control: form.control, name: 'images', defaultValue: [] });
  const publishStatus = useWatch({ control: form.control, name: 'publishStatus' });
  const explanationSteps = useWatch({ control: form.control, name: 'explanationSteps' });
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const setPublishStatus = (status: 'public' | 'private') =>
    form.setValue('publishStatus', status, { shouldDirty: true, shouldValidate: true });
  const primaryMuscleId = useWatch({ control: form.control, name: 'primaryMuscleId' });
  const secondaryMuscleIds =
    useWatch({
      control: form.control,
      name: 'secondaryMuscleIds',
      defaultValue: [],
    }) ?? [];
  const selectedSecondaryMuscleLabels = secondaryMuscleIds
    .map((id) => findExerciseOptionLabel(primaryMuscleOptions, id))
    .filter((label): label is string => Boolean(label));
  const canUploadMoreImages = images.length < EXERCISE_IMAGE_MAX_COUNT;
  const imageDropzoneDisabled = !canUploadMoreImages || isUploading;

  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="px-6">
          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
            {/* FR-003 / FR-005: auto-numbered by the BE, never editable. */}
            <FormField
              control={form.control}
              name="exerciseCode"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>エクササイズコード</FormLabel>
                  <div className="flex h-8 items-center gap-2">
                    <span className="text-muted-foreground font-mono text-sm">
                      {field.value || '保存後に自動採番されます'}
                    </span>
                    <span className="text-muted-foreground text-xs">（手動編集不可）</span>
                  </div>
                </FormItem>
              )}
            />
            {/* FR-014: the JP name with its EN name as a dependent block (always editable). */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="nameJa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      エクササイズ名（日本語）<span className="text-destructive ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="エクササイズ名を入力" className="h-8" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-2">
                {/* TODO(round3) R304 — the auto-translation helper (phase 2):
                  helpText={{
                    filled: '自動生成された英語名です。必要に応じて上書きできます。',
                    empty: '保存時に英語名が自動生成されます',
                  }} */}
                <ExerciseEnglishTextField field="name" label="エクササイズ名（英語）" />
              </div>
            </div>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    カテゴリ<span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <ExerciseRefMasterSelectInput
                    kind="category"
                    value={field.value || null}
                    onChange={(option) => field.onChange(option?.id ?? '')}
                    hasError={Boolean(fieldState.error)}
                    triggerClassName={REF_MASTER_TRIGGER_CLASS}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primaryMuscleId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    主働筋<span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <ExerciseRefMasterSelectInput
                    kind="muscle"
                    value={field.value || null}
                    onChange={(option) => {
                      const value = option?.id ?? '';
                      field.onChange(value);
                      if (!value) return;
                      // A muscle cannot be both primary and secondary.
                      const currentSecondary = form.getValues('secondaryMuscleIds') ?? [];
                      if (currentSecondary.includes(value)) {
                        form.setValue(
                          'secondaryMuscleIds',
                          currentSecondary.filter((id) => id !== value),
                          { shouldDirty: true },
                        );
                      }
                    }}
                    hasError={Boolean(fieldState.error)}
                    triggerClassName={REF_MASTER_TRIGGER_CLASS}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="secondaryMuscleIds"
              render={() => (
                <FormItem className="min-w-0 md:col-span-2">
                  <FormLabel>協働筋（任意）</FormLabel>
                  <ExerciseSecondaryMuscleChips
                    selectedIds={secondaryMuscleIds}
                    excludeId={primaryMuscleId}
                    onToggle={(muscleId, selected) => {
                      const current = form.getValues('secondaryMuscleIds') ?? [];
                      form.setValue(
                        'secondaryMuscleIds',
                        selected
                          ? current.filter((item) => item !== muscleId)
                          : [...current, muscleId],
                        { shouldDirty: true },
                      );
                    }}
                  />
                  {selectedSecondaryMuscleLabels.length > 0 ? (
                    <p className="text-muted-foreground mt-2 text-xs wrap-anywhere">
                      選択中: {selectedSecondaryMuscleLabels.join('、')}
                    </p>
                  ) : null}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toolId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    器具種別<span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <ExerciseRefMasterSelectInput
                    kind="tool"
                    value={field.value || null}
                    onChange={(option) => onToolChange(option?.id ?? null)}
                    hasError={Boolean(fieldState.error)}
                    triggerClassName={REF_MASTER_TRIGGER_CLASS}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="exerciseTypeId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    エクササイズタイプ<span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <ExerciseRefMasterSelectInput
                    kind="exerciseType"
                    value={field.value || null}
                    onChange={(option) => field.onChange(option?.id ?? '')}
                    hasError={Boolean(fieldState.error)}
                    triggerClassName={REF_MASTER_TRIGGER_CLASS}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="handUsage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    両手使用区分<span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="選択してください">
                          {field.value
                            ? EXERCISE_HAND_USAGE_LABELS[field.value]
                            : '選択してください'}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXERCISE_HAND_USAGE_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {EXERCISE_HAND_USAGE_LABELS[item.value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    レベル<span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="選択してください">
                          {field.value
                            ? (EXERCISE_LEVEL_OPTIONS.find((item) => item.value === field.value)
                                ?.label ?? '選択してください')
                            : '選択してください'}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXERCISE_LEVEL_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="restSeconds"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>休憩時間（秒）</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={field.value ?? ''}
                      placeholder="90"
                      className="h-8 w-28"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">動画URL</CardTitle>
          <p className="text-muted-foreground text-xs">
            YouTube等の動画URLを入力してください。会員アプリから参照できます。
          </p>
        </CardHeader>
        <CardContent className="px-6">
          <FormField
            control={form.control}
            name="videoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>動画URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="h-8"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">サムネイル画像</CardTitle>
              <p className="text-muted-foreground text-sm">最大5枚まで登録できます。</p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-normal">
              {images.length}/{EXERCISE_IMAGE_MAX_COUNT}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            disabled={imageDropzoneDisabled}
            className="hidden"
            onChange={async (event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length > 0) {
                await onHandleImageFiles(files);
              }
              event.target.value = '';
            }}
          />
          {canUploadMoreImages ? (
            <div
              role="button"
              tabIndex={imageDropzoneDisabled ? -1 : 0}
              className={cn(
                'border-border bg-background/50 flex min-h-40 items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
                imageDropzoneDisabled
                  ? 'pointer-events-none cursor-not-allowed opacity-60'
                  : 'hover:border-primary/50 hover:bg-muted/30 cursor-pointer',
              )}
              onClick={() => {
                if (!imageDropzoneDisabled) imageInputRef.current?.click();
              }}
              onKeyDown={(event) => {
                if (imageDropzoneDisabled) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  imageInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                if (!imageDropzoneDisabled) event.preventDefault();
              }}
              onDrop={async (event) => {
                event.preventDefault();
                if (imageDropzoneDisabled) return;
                const files = Array.from(event.dataTransfer.files ?? []);
                if (files.length > 0) {
                  await onHandleImageFiles(files);
                }
              }}
            >
              {isUploading ? (
                <div className="text-muted-foreground flex flex-col items-center gap-3">
                  <Loader2 className="size-10 animate-spin" />
                  <span className="text-sm">アップロード中...</span>
                </div>
              ) : fields.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center gap-2">
                  <ImagePlus className="text-foreground/70 size-12" />
                  <span className="text-base font-medium">
                    クリックまたはドラッグでアップロード
                  </span>
                  <span className="text-sm">JPG・PNG / 最大5MB</span>
                </div>
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-2">
                  <ImagePlus className="text-foreground/70 size-10" />
                  <span className="text-sm font-medium">さらに画像を追加</span>
                  <span className="text-xs">クリックまたはドラッグで追加できます</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground bg-muted/40 rounded-md border px-4 py-3 text-center text-xs">
              {`画像は最大${EXERCISE_IMAGE_MAX_COUNT}枚まで登録できます。追加する場合は既存の画像を削除してください。`}
            </p>
          )}
          {fields.length === 0 ? (
            <p className="text-muted-foreground text-center text-xs">画像が未設定です</p>
          ) : null}
          {fields.map((field, index) => {
            const image = images[index];
            const imageSrc = image
              ? (image.previewUrl ?? exerciseMediaUrl(image.s3Key))
              : undefined;
            const isPrimary = image?.isPrimary ?? false;

            return (
              <div
                key={field.id}
                className="bg-background grid gap-3 rounded-xl border p-3 md:grid-cols-[160px_1fr_auto]"
              >
                <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-lg">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={`サムネイル ${index + 1}`}
                      fill
                      unoptimized
                      sizes="160px"
                      className="object-cover"
                      // An expired / unsigned URL hides the thumbnail instead of a broken icon.
                      onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  ) : null}
                  {isPrimary ? (
                    <Badge className="absolute top-2 left-2 text-[10px]">メイン</Badge>
                  ) : null}
                </div>
                <div className="space-y-3">
                  {/* The stored media key (API-006) — set by the upload, not typed by hand. */}
                  <FormField
                    control={form.control}
                    name={`images.${index}.s3Key`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} readOnly className="h-8 font-mono text-xs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={isPrimary}
                      onCheckedChange={(checked) => {
                        const current = form.getValues('images').map((image, imageIndex) => ({
                          ...image,
                          isPrimary: checked ? imageIndex === index : image.isPrimary,
                        }));
                        form.setValue('images', current as ExerciseFormValues['images'], {
                          shouldDirty: true,
                        });
                      }}
                    />
                    <span>メイン画像</span>
                  </label>
                </div>
                <div className="flex items-start justify-end">
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">ステータス</CardTitle>
        </CardHeader>
        <CardContent className="px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">エクササイズの公開/非公開</p>
              <p className="text-muted-foreground text-xs">
                公開にすると、モバイルアプリで会員にエクササイズが表示されます
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">非公開</span>
              <Switch
                checked={publishStatus === 'public'}
                onCheckedChange={(checked) => {
                  // FR-007: 非公開→公開 with an empty 解説ステップ warns right at the switch; the
                  // switch only flips once the user confirms (saving stays possible).
                  const hasIncompleteSteps = (explanationSteps ?? []).some(
                    (step) => step.textJa.trim().length === 0,
                  );
                  if (checked && hasIncompleteSteps) {
                    setPublishConfirmOpen(true);
                    return;
                  }
                  setPublishStatus(checked ? 'public' : 'private');
                }}
              />
              <span className="text-sm font-medium">公開</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <ExercisePublishConfirmDialog
        open={publishConfirmOpen}
        onOpenChange={setPublishConfirmOpen}
        onConfirm={() => setPublishStatus('public')}
      />
    </div>
  );
}
