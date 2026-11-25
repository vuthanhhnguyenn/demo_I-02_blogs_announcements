'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import {
  invalidateAreaUsageCaches,
  invalidateGenderCandidateCaches,
} from '@/app/(private)/area-master/_utils/area-cache.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useSingleSubmit } from '@/hooks/use-single-submit.hook';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes.hook';

import { BackLink } from '@/components/common/back-link';
import { PageHeader } from '@/components/common/page-header';
import { Form } from '@/components/ui/form';

import {
  adminOptionControllerCreateMutation,
  adminOptionControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { OptionForm } from '../_components/option-form';
import { OptionImageUploadError, useOptionImageUpload } from '../_hooks/use-option-image-upload';
import {
  type OptionFormSubmitValues,
  type OptionFormValues,
  isWritableCategory,
  optionFormSchema,
  toCreateOptionBody,
} from '../_schemas/option-form.schema';

const emptyDefaults: OptionFormValues = {
  brandEnum: undefined as unknown as OptionFormValues['brandEnum'],
  name: '',
  category: undefined as unknown as OptionFormValues['category'],
  accountCode: '',
  description: '',
  feeMonthly: undefined as unknown as number,
  taxRate: undefined as unknown as number,
  isProration: false,
  prorationMethod: null,
  optionType: 'regular',
  subcategory: null,
  usability: 'full',
  isChangeableOnPlanChange: false,
  areaIds: [],
  isActive: false,
};

export default function OptionCreatePage() {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/options'));
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  const form = useForm<OptionFormValues, unknown, OptionFormSubmitValues>({
    resolver: zodResolver(optionFormSchema) as never,
    mode: 'onChange',
    defaultValues: emptyDefaults,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const { uploadImage } = useOptionImageUpload();
  const { confirmDiscard } =
    // Not gated on `isSubmitSuccessful`: RHF sets it even when the POST is rejected, which
    // would let キャンセル drop the input unasked. A successful save navigates away instead.
    useUnsavedChanges(form.formState.isDirty || imageFile !== null);
  const goBack = () => confirmDiscard(() => router.push(backToListHref));

  // Two clicks in the same tick both run before `isPending` re-renders the button disabled.
  const { tryStart, release } = useSingleSubmit();

  const createMutation = useMutation({
    ...adminOptionControllerCreateMutation(),
    onSuccess: async (option) => {
      toast.success('オプションを登録しました');
      queryClient.invalidateQueries({ queryKey: adminOptionControllerListQueryKey() });
      // 利用できるエリア: the areas' usage counts and the gender-filtered sale candidates.
      invalidateAreaUsageCaches(queryClient);
      invalidateGenderCandidateCaches(queryClient);
      // The image endpoint needs the new option's id, so it is registered right after create.
      if (imageFile) {
        setIsSavingImage(true);
        try {
          await uploadImage(option.id, imageFile);
        } catch (error) {
          // An API failure is toasted once by the app-wide MutationCache handler; the image upload
          // has no such handler.
          if (error instanceof OptionImageUploadError) {
            toast.error('画像のアップロードに失敗しました。編集画面から再度お試しください');
          }
        } finally {
          setIsSavingImage(false);
        }
      }
      router.push(backToListHref);
    },
    // The failure toast comes from the app-wide MutationCache handler.
    onError: () => {
      release();
    },
  });

  const onSubmit = (values: OptionFormSubmitValues) => {
    const { category } = values;
    // The select offers tier-1 categories only; this narrows the type for the create body.
    if (!isWritableCategory(category) || !tryStart()) return;
    createMutation.mutate({ body: toCreateOptionBody({ ...values, category }) });
  };

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label="オプション管理に戻る" onClick={goBack} />}
        title="オプション 新規登録"
      />
      <div className="mx-auto max-w-240 p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, scrollToFirstError)}>
            <OptionForm
              isSubmitting={createMutation.isPending || isSavingImage}
              imageFile={imageFile}
              imageRemoved={false}
              onImageFileChange={setImageFile}
              onImageRemovedChange={() => undefined}
              onLeave={confirmDiscard}
              onCancel={goBack}
            />
          </form>
        </Form>
      </div>
    </>
  );
}
