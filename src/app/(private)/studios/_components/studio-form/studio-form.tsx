'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';

import { useStoreLabel } from '@/components/common/data-select-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';

import type { StudioDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { useStudioSave } from '../../_hooks/use-studio-save.hook';
import { invalidateStudioQueries } from '../../_utils/studio-api.util';
import type { StudioFormInput, StudioFormMode, StudioFormValues } from '../studio-form.schema';
import { StudioFormSchema } from '../studio-form.schema';
import { SpaceLayoutEditor } from './space-layout-editor';
import { StudioFormBasicInfo } from './studio-form-basic-info';
import { StudioFormConfirmDialog } from './studio-form-confirm-dialog';
import { StudioFormEquipment } from './studio-form-equipment';
import { StudioFormImages } from './studio-form-images';
import { StudioFormNotes } from './studio-form-notes';
import { StudioFormStatus } from './studio-form-status';

interface StudioFormProps {
  mode: StudioFormMode;
  defaultValues?: Partial<StudioFormValues>;
  /** Edit: the studio as read for the form — its updatedAt is the optimistic lock */
  original?: StudioDetailDto;
  /** Edit: the stored grid is larger than the editor can show */
  layoutLocked?: boolean;
  assignedLessonCount?: number;
}

export function StudioForm({
  mode,
  defaultValues,
  original,
  layoutLocked = false,
  assignedLessonCount,
}: StudioFormProps) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitValues, setSubmitValues] = useState<Partial<StudioFormValues> | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const scrollToFirstError = useScrollToFirstError();
  const queryClient = useQueryClient();

  // Edit keeps its store (API-110 §6.2 #1); a new studio's store is read by id for the confirm
  // dialog, so it does not depend on which page of the store list the picker loaded
  const pickedStoreId = isEdit ? undefined : submitValues?.storeId;
  const { label: pickedStoreName } = useStoreLabel(pickedStoreId);
  const storeName = (isEdit ? original?.store.name : pickedStoreName) ?? undefined;

  const form = useForm<StudioFormInput, unknown, StudioFormValues>({
    resolver: zodResolver(StudioFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      storeId: '',
      name: '',
      studioType: 'studio-lesson',
      operatingHours: '',
      capacity: undefined as unknown as number,
      bufferValue: 0,
      equipmentNotes: '',
      internalNotes: '',
      status: 'active',
      images: [],
      ...defaultValues,
    },
  });

  const { save, isPending } = useStudioSave(isEdit ? original : undefined);

  const hasErrors = Object.keys(form.formState.errors).length > 0;

  const submitLabel = isEdit ? '変更を保存する' : '入力内容を確認する';

  const handleSubmit = () => {
    // The images are read when 確認 opens, so an upload still in flight would be left out
    if (isImageUploading) return;
    form.handleSubmit(
      (values) => {
        setSubmitValues(values);
        setConfirmOpen(true);
      },
      () => {
        // Validation failed
      },
    )();
  };

  const handleConfirm = async () => {
    if (!submitValues || isImageUploading) return;
    setConfirmOpen(false);
    const result = await save(submitValues as StudioFormValues, layoutLocked);
    if (!result) return; // nothing written; the MutationCache toasted why
    invalidateStudioQueries(queryClient);
    if (result.outcome === 'partial') {
      // Part of the save went through: stay on the form, reloaded from what is stored now
      toast.error('一部の保存に失敗しました。内容を確認して再度保存してください');
      if (!isEdit) router.push(navigate('/studios/[id]/edit', result.studioId));
      return;
    }
    toast.success(isEdit ? 'スタジオの変更を保存しました' : 'スタジオを登録しました');
    router.push(navigate('/studios/[id]', result.studioId));
  };

  const onInvalid = () => {
    scrollToFirstError();
  };

  const showWarning = isEdit && (assignedLessonCount ?? 0) > 0;

  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(handleSubmit, onInvalid)}>
        <main className="bg-background min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {showWarning && (
            <Alert className="border-warning/50 bg-warning/15 mx-auto mb-6 max-w-[960px]">
              <AlertTriangle className="text-warning size-4" />
              <AlertDescription className="text-muted-foreground text-xs">
                料金や制限条件を変更すると、予約済みの会員にも影響する場合があります。
              </AlertDescription>
            </Alert>
          )}
          <div className="mx-auto flex max-w-[960px] gap-6">
            {/* Left column – form fields */}
            <div className="min-w-0 flex-1 space-y-6">
              <Card>
                <CardContent className="px-4">
                  <StudioFormBasicInfo
                    storeLocked={isEdit}
                    storeName={original?.store.name ?? undefined}
                  />
                  <div className="space-y-4">
                    <StudioFormEquipment />
                    <StudioFormImages onUploadingChange={setIsImageUploading} />
                    <StudioFormNotes />
                  </div>
                </CardContent>
              </Card>
              <StudioFormStatus />
            </div>

            {/* Right column – space layout editor */}
            <SpaceLayoutEditor locked={layoutLocked} />
          </div>

          {/* Action buttons */}
          <div className="mx-auto mt-6 flex max-w-[960px] items-center justify-end gap-2 border-t px-4 py-4">
            <Button size="lg" variant="outline" type="button" onClick={() => router.back()}>
              キャンセル
            </Button>
            <Button
              size="lg"
              type="button"
              onClick={handleSubmit}
              disabled={isPending || isImageUploading}
            >
              {submitLabel}
            </Button>
          </div>
          {isImageUploading && (
            <div className="mx-auto flex max-w-[960px] justify-end px-4">
              <p className="text-muted-foreground text-xs">
                画像のアップロードが完了するまでお待ちください。
              </p>
            </div>
          )}
          {hasErrors && (
            <div className="mx-auto flex max-w-[960px] justify-end px-4">
              <p className="text-destructive text-xs">
                入力内容に不備があります。エラー表示の項目をご確認ください。
              </p>
            </div>
          )}
        </main>

        <StudioFormConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          mode={mode}
          values={submitValues ?? {}}
          storeName={storeName}
          onConfirm={() => void handleConfirm()}
          isSubmitting={isPending || isImageUploading}
        />
      </form>
    </Form>
  );
}
