'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter } from 'next/navigation';

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
  adminOptionSetControllerCreateMutation,
  adminOptionSetControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { OptionDiscountForm } from '../_components/option-discount-form';
import { toTargetOptionCandidates } from '../_constants/constants';
import { useTargetOptionCandidates } from '../_hooks/use-target-option-candidates';
import {
  type OptionDiscountFormSubmitValues,
  type OptionDiscountFormValues,
  emptyDefaults,
  optionDiscountFormSchema,
  toCreateOptionSetBody,
} from '../_schemas/option-discount-form.schema';

export default function OptionDiscountCreatePage() {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/option-discount'));
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  const {
    items: optionItems,
    isLoading: isOptionsLoading,
    isError: isOptionsError,
    refetch: refetchOptions,
  } = useTargetOptionCandidates();

  const optionMasters = useMemo(() => toTargetOptionCandidates(optionItems), [optionItems]);

  const form = useForm<OptionDiscountFormValues, unknown, OptionDiscountFormSubmitValues>({
    resolver: zodResolver(optionDiscountFormSchema) as never,
    mode: 'onChange',
    defaultValues: emptyDefaults,
  });
  const { confirmDiscard } =
    // Not gated on `isSubmitSuccessful`: RHF sets it even when the POST is rejected, which
    // would let キャンセル drop the input unasked. A successful save navigates away instead.
    useUnsavedChanges(form.formState.isDirty);
  const goBack = () => confirmDiscard(() => router.push(backToListHref));

  // Two clicks in the same tick both run before `isPending` re-renders the button disabled.
  const { tryStart, release } = useSingleSubmit();

  const createMutation = useMutation({
    ...adminOptionSetControllerCreateMutation(),
    // Offline: fail at once so the operator sees an error — a paused mutation would silently
    // submit by itself once the connection returns.
    networkMode: 'always',
    onSuccess: () => {
      toast.success('セット割引を登録しました');
      queryClient.invalidateQueries({ queryKey: adminOptionSetControllerListQueryKey() });
      router.push(backToListHref);
    },
    // The failure toast comes from the app-wide MutationCache handler.
    onError: () => {
      release();
    },
  });

  const onSubmit = (values: OptionDiscountFormSubmitValues) => {
    if (!tryStart()) return;
    createMutation.mutate({ body: toCreateOptionSetBody(values) });
  };

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label="セット割設定に戻る" onClick={goBack} />}
        title="セット割 新規登録"
      />
      <div className="mx-auto max-w-240 p-4">
        <Form {...form}>
          <form>
            <OptionDiscountForm
              optionMasters={optionMasters}
              isOptionsLoading={isOptionsLoading}
              isOptionsError={isOptionsError}
              onRetryOptions={() => {
                void refetchOptions();
              }}
              isSubmitting={createMutation.isPending}
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
