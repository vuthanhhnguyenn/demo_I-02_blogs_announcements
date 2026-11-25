'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

import { adminLessonControllerCreateMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { useLessonEditSave } from '../../_hooks/use-lesson-edit-save';
import type {
  LessonFormInput,
  LessonFormMode,
  LessonFormValues,
} from '../../_schemas/lesson-form.schema';
import { LessonFormSchema } from '../../_schemas/lesson-form.schema';
import { invalidateLessonQueries } from '../../_utils/lesson-api.util';
import { toCreateLessonBody } from '../../_utils/lesson-form.util';
import { LessonFormBasicInfo } from './lesson-form-basic-info';
import { LessonFormConfirmDialog } from './lesson-form-confirm-dialog';
import { LessonFormDescription } from './lesson-form-description';
import { LessonFormImages } from './lesson-form-images';
import { LessonFormNotes } from './lesson-form-notes';
import { LessonFormRestrictions } from './lesson-form-restrictions';
import { LessonFormStatus } from './lesson-form-status';

interface LessonFormProps {
  mode: LessonFormMode;
  defaultValues?: Partial<LessonFormValues>;
  /** The stored lesson (編集) — its updatedAt, images and restrictions are diffed on save */
  original?: LessonDetailDto;
  /** id → name of the copied / edited lesson's restrictions (編集・複製) */
  restrictionLabels?: Readonly<Record<string, string>>;
}

export function LessonForm({ mode, defaultValues, original, restrictionLabels }: LessonFormProps) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Holds the schema-transformed (coerced) output values captured in handleSubmit.
  // Needed because form.getValues() returns the raw input type (e.g. duration as
  // unknown/string) — only the resolver output has duration coerced to a number.
  const [submitValues, setSubmitValues] = useState<LessonFormValues | null>(null);
  const scrollToFirstError = useScrollToFirstError();
  const queryClient = useQueryClient();
  // A picked image reaches `images` only once its upload resolves, so confirming or saving before
  // then would save the form without it (create, edit and duplicate alike).
  const [isImageUploading, setIsImageUploading] = useState(false);

  const form = useForm<LessonFormInput, unknown, LessonFormValues>({
    resolver: zodResolver(LessonFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      name: '',
      // レッスン区分 starts unselected on 新規作成 (編集・複製 pass the stored one)
      perUseFee: null,
      restrictedMainContracts: [],
      restrictedOptionContracts: [],
      images: [],
      description: '',
      notes: '',
      status: 'active',
      ...defaultValues,
    },
  });

  // Errors (E-VAL-001, E-LSM-006 fee, E-LSM-101 HQ only, …) are toasted by the shared MutationCache
  const createMutation = useMutation({
    ...adminLessonControllerCreateMutation(),
    onSuccess: () => {
      toast.success('レッスンを登録しました');
      invalidateLessonQueries(queryClient);
      router.push(navigate('/lessons'));
    },
  });

  const editSave = useLessonEditSave(original);

  const saveEdit = async (values: LessonFormValues) => {
    const result = await editSave.save(values);
    if (!result) return;
    invalidateLessonQueries(queryClient);
    if (result === 'saved') {
      toast.success('レッスンの変更を保存しました');
      router.push(navigate('/lessons'));
    } else {
      // The core fields were saved; a restriction / image call failed (already toasted)
      toast.warning('一部の変更を保存できませんでした', {
        description: '予約制限・画像の変更内容を確認してください',
      });
      router.push(navigate('/lessons/[id]', original!.id));
    }
  };

  const errors = form.formState.errors;
  const hasErrors = Object.keys(errors).length > 0;

  // const pageTitle = isEdit
  //   ? defaultValues?.lessonType === 'personal'
  //     ? 'パーソナルトレーニング編集'
  //     : 'スタジオレッスン編集'
  //   : '新規レッスン作成';

  const submitLabel = isEdit ? '変更を保存する' : '入力内容を確認する';

  const isSaving = createMutation.isPending || editSave.isPending;

  const handleSubmit = () => {
    if (isImageUploading) return;
    form.handleSubmit(
      (values) => {
        setSubmitValues(values);
        setConfirmOpen(true);
      },
      () => {
        // Validation failed - errors are rendered inline by FormMessage
      },
    )();
  };

  const handleConfirm = () => {
    if (!submitValues || isImageUploading) return;
    setConfirmOpen(false);
    if (isEdit && original) {
      void saveEdit(submitValues);
    } else {
      createMutation.mutate({ body: toCreateLessonBody(submitValues) });
    }
  };

  const onInvalid = () => {
    scrollToFirstError();
  };

  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(handleSubmit, onInvalid)}>
        <main className="bg-background min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="mx-auto max-w-240">
            <div className="space-y-6">
              {isEdit && (
                <Alert className="border-warning/50 bg-warning/15">
                  <AlertTriangle className="text-warning size-4" />
                  <AlertDescription className="text-muted-foreground text-xs">
                    料金や制限条件を変更すると、予約済みの会員にも影響する場合があります。
                  </AlertDescription>
                </Alert>
              )}
              <LessonFormBasicInfo isEdit={isEdit} />
              <LessonFormRestrictions knownLabels={restrictionLabels} />
              <LessonFormImages onUploadingChange={setIsImageUploading} />
              <LessonFormDescription />
              <LessonFormNotes />
              <LessonFormStatus />
              <div className="flex items-center justify-end gap-2 border-t p-4">
                <Button size="lg" variant="outline" type="button" onClick={() => router.back()}>
                  キャンセル
                </Button>
                <Button
                  size="lg"
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving || isImageUploading}
                >
                  {submitLabel}
                </Button>
              </div>
              {isImageUploading && (
                <div className="flex justify-end">
                  <p className="text-muted-foreground text-xs">
                    画像のアップロードが完了するまでお待ちください。
                  </p>
                </div>
              )}
              {hasErrors && (
                <div className="flex justify-end">
                  <p className="text-destructive text-xs">
                    入力内容に不備があります。エラー表示の項目をご確認ください。
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        <LessonFormConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          mode={mode}
          values={submitValues ?? {}}
          onConfirm={handleConfirm}
          isSubmitting={form.formState.isSubmitting || isSaving || isImageUploading}
        />
      </form>
    </Form>
  );
}
