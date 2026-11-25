'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { useParams, useRouter } from 'next/navigation';

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
  adminOptionSetControllerDetailOptions,
  adminOptionSetControllerDetailQueryKey,
  adminOptionSetControllerListQueryKey,
  adminOptionSetControllerSetActiveMutation,
  adminOptionSetControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionSetDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { OptionDiscountForm } from '../../_components/option-discount-form';
import { type TargetOptionCandidate, toTargetOptionCandidates } from '../../_constants/constants';
import { useTargetOptionCandidates } from '../../_hooks/use-target-option-candidates';
import {
  type OptionDiscountFormSubmitValues,
  type OptionDiscountFormValues,
  optionDiscountFormSchema,
  toOptionDiscountFormValues,
  toUpdateOptionSetBody,
} from '../../_schemas/option-discount-form.schema';

interface OptionDiscountEditFormProps {
  detail: OptionSetDetailDto;
  defaultValues: OptionDiscountFormValues;
  options: TargetOptionCandidate[];
}

function OptionDiscountEditForm({
  detail,
  defaultValues,
  options,
}: Readonly<OptionDiscountEditFormProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();
  const setId = detail.id;
  const backToListHref = useBackToListHref(navigate('/option-discount'));
  const withReturnTo = useWithReturnTo();

  const form = useForm<OptionDiscountFormValues, unknown, OptionDiscountFormSubmitValues>({
    resolver: zodResolver(optionDiscountFormSchema) as never,
    mode: 'onChange',
    defaultValues,
  });
  const { confirmDiscard } =
    // Not gated on `isSubmitSuccessful`: RHF sets it even when the save is rejected, which
    // would let キャンセル drop the edits unasked. A successful save navigates away instead.
    useUnsavedChanges(form.formState.isDirty);
  const goBack = () =>
    confirmDiscard(() =>
      router.push(withReturnTo(navigate('/option-discount/[id]', setId), backToListHref)),
    );

  const updateMutation = useMutation({
    ...adminOptionSetControllerUpdateMutation(),
    networkMode: 'always',
  });
  // Status has its own endpoint — PATCH `/option-sets/{setId}` takes no `isActive` (qa-193/qa-195).
  const setActiveMutation = useMutation({
    ...adminOptionSetControllerSetActiveMutation(),
    networkMode: 'always',
  });
  const isSubmitting = updateMutation.isPending || setActiveMutation.isPending;

  // Two clicks in the same tick both run before `isSubmitting` re-renders the button disabled.
  const { tryStart, release } = useSingleSubmit();

  const onSubmit = async (values: OptionDiscountFormSubmitValues) => {
    if (!tryStart()) return;
    try {
      try {
        await updateMutation.mutateAsync({
          path: { setId },
          body: toUpdateOptionSetBody(
            values,
            detail.items.map((item) => item.optionId),
          ),
        });
      } catch {
        // The failure toast comes from the app-wide MutationCache handler.
        release();
        return;
      }
      if (values.isActive !== detail.isActive) {
        try {
          await setActiveMutation.mutateAsync({
            path: { setId },
            body: { isActive: values.isActive },
          });
        } catch {
          // The content is already saved, so staying on the form would suggest nothing was. The
          // reason is toasted by the MutationCache handler; this says what did and did not apply,
          // and the detail screen shows the unchanged status with its own toggle.
          toast.warning('セット割の内容は保存しましたが、ステータスは変更されていません');
          router.push(withReturnTo(navigate('/option-discount/[id]', setId), backToListHref));
          return;
        }
      }
    } finally {
      queryClient.invalidateQueries({ queryKey: adminOptionSetControllerListQueryKey() });
      queryClient.invalidateQueries({
        queryKey: adminOptionSetControllerDetailQueryKey({ path: { setId } }),
      });
    }

    toast.success('セット割引を更新しました');
    router.push(withReturnTo(navigate('/option-discount/[id]', setId), backToListHref));
  };

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label="セット割詳細に戻る" onClick={goBack} />}
        title="セット割 編集"
      />
      <div className="mx-auto max-w-240 p-4">
        <Form {...form}>
          <form>
            <OptionDiscountForm
              isEdit
              isSubmitting={isSubmitting}
              optionMasters={options}
              onCancel={goBack}
              onSubmit={onSubmit}
              onError={scrollToFirstError}
            />
          </form>
        </Form>
      </div>
    </>
  );
}

export default function OptionDiscountEditPage() {
  const params = useParams<{ id: string }>();
  const setId = params?.id ?? '';

  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminOptionSetControllerDetailOptions({ path: { setId } }),
    enabled: Boolean(setId),
  });

  const {
    items: optionItems,
    isLoading: isOptionsLoading,
    isError: isOptionsError,
    isReady: isOptionsReady,
    refetch: refetchOptions,
  } = useTargetOptionCandidates();

  const options = useMemo(
    () => toTargetOptionCandidates(optionItems, detail?.items),
    [optionItems, detail],
  );

  const defaultValues = useMemo(
    () => (detail ? toOptionDiscountFormValues(detail) : null),
    [detail],
  );

  // An unknown id (404 E-SET-001) or a malformed one (400 on `setId`) is a not-found, not a
  // failure worth retrying.
  const isNotFound = isRecordNotFoundError(error, 'setId');

  const handleRetry = () => {
    void refetch();
    void refetchOptions();
  };

  return (
    <DataStateBoundary
      isLoading={isLoading || isOptionsLoading}
      isError={(isError && !isNotFound) || isOptionsError}
      isEmpty={isNotFound || !detail}
      onRetry={handleRetry}
      emptyTitle="セット割が見つかりません"
    >
      {detail && defaultValues && isOptionsReady && (
        <OptionDiscountEditForm detail={detail} defaultValues={defaultValues} options={options} />
      )}
    </DataStateBoundary>
  );
}
