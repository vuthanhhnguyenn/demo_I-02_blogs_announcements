'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useParams, useRouter } from 'next/navigation';

import {
  invalidateAreaUsageCaches,
  invalidateGenderCandidateCaches,
} from '@/app/(private)/area-master/_utils/area-cache.util';
import { CampaignGenderConflictDialog } from '@/app/(private)/campaigns/_components/campaign-gender-conflict-dialog';
import { useCampaignGenderConflict } from '@/app/(private)/campaigns/_hooks/use-campaign-gender-conflict';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useSingleSubmit } from '@/hooks/use-single-submit.hook';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Form } from '@/components/ui/form';

import { isRecordNotFoundError } from '@/lib/api-error.util';
import {
  adminOptionControllerDetailOptions,
  adminOptionControllerDetailQueryKey,
  adminOptionControllerHistoryQueryKey,
  adminOptionControllerListQueryKey,
  adminOptionControllerSetActiveMutation,
  adminOptionControllerUpdateMutation,
  adminOptionSetControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { OptionForm } from '../../_components/option-form';
import { OptionImageUploadError, useOptionImageUpload } from '../../_hooks/use-option-image-upload';
import {
  type OptionFormSubmitValues,
  type OptionFormValues,
  optionFormSchema,
  toOptionFormValues,
  toUpdateOptionBody,
} from '../../_schemas/option-form.schema';

interface OptionEditFormProps {
  option: OptionDetailDto;
  defaultValues: OptionFormValues;
}

function OptionEditForm({ option, defaultValues }: Readonly<OptionEditFormProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();
  const optionId = option.id;
  const backToListHref = useBackToListHref(navigate('/options'));
  const withReturnTo = useWithReturnTo();

  const form = useForm<OptionFormValues, unknown, OptionFormSubmitValues>({
    resolver: zodResolver(optionFormSchema) as never,
    mode: 'onChange',
    defaultValues,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const imageChanged = imageFile !== null || imageRemoved;
  const { uploadImage, deleteImages } = useOptionImageUpload();
  const { confirmDiscard } =
    // Not gated on `isSubmitSuccessful`: RHF sets it even when the save is rejected, which
    // would let キャンセル drop the edits unasked. A successful save navigates away instead.
    useUnsavedChanges(form.formState.isDirty || imageChanged);
  const goBack = () =>
    confirmDiscard(() =>
      router.push(withReturnTo(navigate('/options/[id]', optionId), backToListHref)),
    );

  const genderConflict = useCampaignGenderConflict();
  // E-ARE-004: an accepting campaign auto-grants this option and the edited areas would no longer
  // admit its members, so the error names those campaigns in a dialog instead of a toast.
  const updateMutation = useMutation({
    ...adminOptionControllerUpdateMutation(),
    meta: { suppressErrorToast: true },
    onError: genderConflict.handleError,
  });
  // Status has its own endpoint (audit separation) — PATCH `/options/{id}` rejects `isActive`.
  const setActiveMutation = useMutation(adminOptionControllerSetActiveMutation());
  const [isSavingImage, setIsSavingImage] = useState(false);
  const isSubmitting = updateMutation.isPending || setActiveMutation.isPending || isSavingImage;

  // Two clicks in the same tick both run before `isSubmitting` re-renders the button disabled.
  const { tryStart, release } = useSingleSubmit();

  const onSubmit = async (values: OptionFormSubmitValues) => {
    if (!tryStart()) return;
    try {
      await updateMutation.mutateAsync({
        path: { optionId },
        body: toUpdateOptionBody(values, option.category),
      });
      if (values.isActive !== option.isActive) {
        await setActiveMutation.mutateAsync({
          path: { optionId },
          body: { isActive: values.isActive },
        });
      }
      if (imageChanged) {
        setIsSavingImage(true);
        try {
          // Register the replacement before dropping the old images, so a failed upload keeps
          // the current one. The snapshot also covers an image left by an earlier failed retry.
          if (imageFile) await uploadImage(optionId, imageFile);
          await deleteImages(optionId, option.images);
        } finally {
          setIsSavingImage(false);
        }
      }
    } catch (error) {
      // API failures are already reported (the update by its own `onError`, the status by the
      // shared MutationCache); the image upload has no such handler.
      if (error instanceof OptionImageUploadError) {
        toast.error('画像のアップロードに失敗しました。もう一度お試しください');
      }
      release();
      return;
    } finally {
      queryClient.invalidateQueries({ queryKey: adminOptionControllerListQueryKey() });
      queryClient.invalidateQueries({
        queryKey: adminOptionControllerDetailQueryKey({ path: { optionId } }),
      });
      queryClient.invalidateQueries({
        queryKey: adminOptionControllerHistoryQueryKey({ path: { optionId } }),
      });
      // Set discounts embed the option's name and fee (list + every detail).
      queryClient.invalidateQueries({ queryKey: adminOptionSetControllerListQueryKey() });
      queryClient.invalidateQueries({ queryKey: [{ _id: 'adminOptionSetControllerDetail' }] });
      // 利用できるエリア: the areas' usage counts and the gender-filtered sale candidates.
      invalidateAreaUsageCaches(queryClient);
      invalidateGenderCandidateCaches(queryClient);
    }

    toast.success('オプションを更新しました');
    router.push(withReturnTo(navigate('/options/[id]', optionId), backToListHref));
  };

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label="オプション詳細に戻る" onClick={goBack} />}
        title="オプション 編集"
      />
      <div className="mx-auto max-w-240 p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, scrollToFirstError)}>
            <OptionForm
              isEdit
              isSubmitting={isSubmitting}
              optionCode={option.optionCode}
              currentImageUrl={option.primaryImageUrl}
              imageFile={imageFile}
              imageRemoved={imageRemoved}
              onImageFileChange={setImageFile}
              onImageRemovedChange={setImageRemoved}
              onLeave={confirmDiscard}
              onCancel={goBack}
            />
          </form>
        </Form>
      </div>
      <CampaignGenderConflictDialog
        conflict={genderConflict.conflict}
        onClose={genderConflict.close}
      />
    </>
  );
}

export default function OptionEditPage() {
  const params = useParams<{ id: string }>();
  const optionId = params?.id ?? '';

  const {
    data: option,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminOptionControllerDetailOptions({ path: { optionId } }),
    enabled: Boolean(optionId),
  });

  const defaultValues = useMemo(() => (option ? toOptionFormValues(option) : null), [option]);

  // An unknown id (404 E-OPT-001) or a malformed one (400 on `optionId`) is a not-found, not a
  // failure worth retrying.
  const isNotFound = isRecordNotFoundError(error, 'optionId');

  return (
    <DataStateBoundary
      isLoading={isLoading}
      isError={isError && !isNotFound}
      isEmpty={isNotFound || !option}
      onRetry={refetch}
      emptyTitle="オプションが見つかりません"
    >
      {option && defaultValues && <OptionEditForm option={option} defaultValues={defaultValues} />}
    </DataStateBoundary>
  );
}
