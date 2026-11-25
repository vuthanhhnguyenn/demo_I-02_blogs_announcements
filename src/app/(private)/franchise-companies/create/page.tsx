'use client';

import { useCallback, useRef } from 'react';
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
import { Form } from '@/components/ui/form';

import {
  adminFcCompanyControllerCreateMutation,
  adminFcCompanyControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { FranchiseCompanyForm } from '../_components/franchise-company-form';
import {
  FRANCHISE_COMPANY_FORM_EMPTY_VALUES,
  type FranchiseCompanyFormSubmitValues,
  type FranchiseCompanyFormValues,
  franchiseCompanyFormSchema,
} from '../_schemas/franchise-company-form.schema';
import { toCreateFcCompanyBody } from '../_utils/fc-company-api.util';

export default function FranchiseCompanyCreatePage() {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/franchise-companies'));
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();
  const isSubmittingRef = useRef(false);

  const form = useForm<FranchiseCompanyFormValues, unknown, FranchiseCompanyFormSubmitValues>({
    resolver: zodResolver(franchiseCompanyFormSchema) as never,
    mode: 'onChange',
    defaultValues: FRANCHISE_COMPANY_FORM_EMPTY_VALUES,
  });

  const formIsDirty = form.formState.isDirty;
  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(formIsDirty);

  const navigateToList = useCallback(() => {
    router.push(navigate('/franchise-companies'));
  }, [router]);

  const handleCancel = useCallback(() => {
    confirmDiscard(navigateToList);
  }, [confirmDiscard, navigateToList]);

  const createMutation = useMutation({
    ...adminFcCompanyControllerCreateMutation(),
    onSuccess: () => {
      toast.success('FC企業を登録しました');
      void queryClient.invalidateQueries({ queryKey: adminFcCompanyControllerListQueryKey() });
      navigateAfterSave(navigateToList);
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const onSubmit = (values: FranchiseCompanyFormSubmitValues) => {
    // Ref guard (not just `createMutation.isPending`): two clicks dispatched in the
    // same tick both read the pre-mutate render state, so a state-only guard can
    // still let a second POST through.
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    createMutation.mutate({ body: toCreateFcCompanyBody(values) });
  };

  // react-hook-form's handleSubmit never invokes onSubmit synchronously during
  // render — it only returns a closure invoked later on the submit event — so
  // isSubmittingRef is never actually read during render.
  // eslint-disable-next-line react-hooks/refs
  const handleFormSubmit = form.handleSubmit(onSubmit, scrollToFirstError);

  return (
    <>
      <PageHeader
        breadcrumb={
          <BackLink
            label="FC企業管理に戻る"
            onClick={() => confirmDiscard(() => router.push(backToListHref))}
          />
        }
        title="FC企業新規登録"
      />
      <div className="mx-auto w-full max-w-240 p-4">
        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="w-full">
            <FranchiseCompanyForm
              mode="create"
              isSubmitting={createMutation.isPending}
              onCancel={handleCancel}
              onSubmit={onSubmit}
              onError={scrollToFirstError}
            />
          </form>
        </Form>
      </div>
    </>
  );
}
