'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminRoutineMasterControllerCreateMutation,
  adminRoutineMasterControllerDetailQueryKey,
  adminRoutineMasterControllerListQueryKey,
  adminRoutineMasterControllerPublishMutation,
  adminRoutineMasterControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { AdminRoutineDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { ROUTINE_NAME_MAX_LENGTH_MESSAGE } from '../../_constants/routine.constants';
import { useSingleFlight } from '../../_hooks/use-single-flight.hook';
import {
  type RoutineFormValues,
  createEmptyRoutineFormValues,
  mapRoutineDetailToFormValues,
  routineFormSchema,
} from '../../_schemas/routine-form.schema';
import { buildRoutineSaveBody } from '../../_utils/routine-body.util';
import { RoutineFormBasicInfoSection } from './routine-form-basic-info-section';
import { RoutineFormExerciseCompositionSection } from './routine-form-exercise-composition-section';
import { RoutineFormStatusSection } from './routine-form-status-section';
import { RoutineFormThumbnailSection } from './routine-form-thumbnail-section';

type RoutineFormProps = {
  mode: 'create' | 'edit';
  defaultDetail?: AdminRoutineDetailDto;
};

export function RoutineForm({ mode, defaultDetail }: RoutineFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();
  const backToListHref = useBackToListHref(navigate('/routines'));
  const singleFlight = useSingleFlight();
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);

  const isEdit = mode === 'edit';
  const routineId = defaultDetail?.id;
  const initialPublished = defaultDetail?.publishStatus === 'published';
  const pageTitle = isEdit ? 'ルーティン 編集' : 'ルーティン 新規登録';

  const form = useForm<RoutineFormValues>({
    resolver: zodResolver(routineFormSchema),
    defaultValues: defaultDetail
      ? mapRoutineDetailToFormValues(defaultDetail)
      : createEmptyRoutineFormValues(),
  });

  // Read during render: react-hook-form only tracks `isDirty` once it is subscribed through the
  // formState Proxy, so reading it only inside the cancel handler always saw `false`.
  const { isDirty } = form.formState;
  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);

  // The partial-save warning below replaces the shared MutationCache error toast.
  const publishMutation = useMutation({
    ...adminRoutineMasterControllerPublishMutation(),
    meta: { suppressErrorToast: true },
  });

  const leaveAfterSave = (id: string) => {
    queryClient.invalidateQueries({ queryKey: adminRoutineMasterControllerListQueryKey() });
    queryClient.invalidateQueries({
      queryKey: adminRoutineMasterControllerDetailQueryKey({ path: { id } }),
    });
    navigateAfterSave(() => router.push(navigate('/routines')));
  };

  const finish = (id: string) => {
    toast.success(isEdit ? 'ルーティンの変更を保存しました' : 'ルーティンを登録しました');
    leaveAfterSave(id);
  };

  // TODO(round2) B4: the save body has no publishStatus, so the 公開 switch is applied by a
  // second call. If that call fails the routine is already saved, so say exactly that (instead of
  // a success toast next to an error toast) and still leave the form so a retry can't create a copy.
  const applyPublishThenFinish = (id: string, exerciseCount: number) => {
    const desiredPublished = form.getValues('isPublished') && exerciseCount > 0;
    if (desiredPublished === initialPublished) {
      finish(id);
      return;
    }
    publishMutation.mutate(
      {
        path: { id },
        body: { publishStatus: desiredPublished ? 'published' : 'unpublished' },
      },
      {
        onSuccess: () => finish(id),
        onError: (error) => {
          toast.warning(
            isEdit
              ? 'ルーティンの変更は保存しましたが、公開ステータスは変更されていません'
              : 'ルーティンは登録しましたが、公開ステータスは変更されていません',
            { description: resolveApiErrorMessage(error) },
          );
          leaveAfterSave(id);
        },
      },
    );
  };

  const createMutation = useMutation({
    ...adminRoutineMasterControllerCreateMutation(),
    onSuccess: (result) => {
      applyPublishThenFinish(result.id, result.exerciseCount);
    },
  });

  const updateMutation = useMutation({
    ...adminRoutineMasterControllerUpdateMutation(),
    onSuccess: (result) => {
      applyPublishThenFinish(result.id, result.exerciseCount);
    },
  });

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || publishMutation.isPending;

  // Two submits in one tick would both POST (one 201, one 500). On success the form navigates
  // away, so the lock is only released when the save fails.
  // A save while a thumbnail is still uploading would drop it from the body, so it is held until
  // the key is in the form (the disabled button alone does not stop an Enter submit)
  const handleSubmit = form.handleSubmit((values) => {
    if (isThumbnailUploading) return;
    singleFlight((release) => {
      const body = buildRoutineSaveBody(values);
      if (isEdit && routineId) {
        updateMutation.mutate({ path: { id: routineId }, body }, { onError: release });
      } else {
        createMutation.mutate({ body }, { onError: release });
      }
    });
  }, scrollToFirstError);

  const handleCancel = () => confirmDiscard(() => router.push(navigate('/routines')));

  return (
    <Form {...form}>
      <PageHeader
        breadcrumb={
          <BackLink
            label="ルーティン管理に戻る"
            onClick={() => confirmDiscard(() => router.push(backToListHref))}
          />
        }
        title={pageTitle}
      />

      <form
        noValidate
        onSubmit={handleSubmit}
        className="bg-background min-h-0 flex-1 overflow-y-auto px-6 py-4"
      >
        <div className="mx-auto max-w-[960px] space-y-6">
          <RoutineFormBasicInfoSection />
          <RoutineFormThumbnailSection
            storedPreviews={Object.fromEntries(
              (defaultDetail?.thumbnailS3Keys ?? []).map((key, index) => [
                key,
                defaultDetail?.thumbnailUrls[index] ?? '',
              ]),
            )}
            onUploadingChange={setIsThumbnailUploading}
          />
          <RoutineFormExerciseCompositionSection />
          <RoutineFormStatusSection />

          <div className="flex items-center justify-end gap-2 border-t p-4">
            {form.formState.isSubmitted &&
              ((form.formState.errors.name &&
                form.formState.errors.name.message !== ROUTINE_NAME_MAX_LENGTH_MESSAGE) ||
                form.formState.errors.categoryId) && (
                <p className="text-destructive mr-auto text-xs">未入力の項目があります</p>
              )}
            <Button type="button" size="lg" variant="outline" onClick={handleCancel}>
              キャンセル
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting || isThumbnailUploading}>
              {isSubmitting ? '保存中...' : isEdit ? '更新' : '登録'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
