'use client';

import { Suspense, useCallback, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { useParams, useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Form } from '@/components/ui/form';

import {
  adminFcCompanyControllerDetailOptions,
  adminFcCompanyControllerDetailQueryKey,
  adminFcCompanyControllerHistoryQueryKey,
  adminFcCompanyControllerListQueryKey,
  adminFcCompanyControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { FcCompanyDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import { FranchiseCompanyForm } from '../../_components/franchise-company-form';
import { getActiveBadgeClass, getActiveLabel } from '../../_constants/constants';
import {
  FRANCHISE_COMPANY_FORM_EMPTY_VALUES,
  type FranchiseCompanyFormSubmitValues,
  type FranchiseCompanyFormValues,
  franchiseCompanyFormSchema,
} from '../../_schemas/franchise-company-form.schema';
import {
  isFcCompanyNotFoundError,
  isFcCompanyPermissionError,
  toUpdateFcCompanyBody,
} from '../../_utils/fc-company-api.util';
import { FcPermissionDenied } from '../_components/fc-permission-denied';

function toFormDefaults(company: FcCompanyDetailDto): FranchiseCompanyFormValues {
  return {
    legalName: company.legalName,
    displayName: company.displayName,
    managementType: company.managementType,
    // null only for companies registered before 認証方式 existed — the required select makes the user fill it
    authProvider: company.authProvider ?? FRANCHISE_COMPANY_FORM_EMPTY_VALUES.authProvider,
    corporateNumber: company.corporateNumber ?? '',
    representativeName: company.representativeName ?? '',
    headOfficeAddress: company.headOfficeAddress ?? '',
    phone: company.phone ?? '',
    contactPersonName: company.contactPersonName ?? '',
    contactPersonEmail: company.contactPersonEmail ?? '',
    contactPersonPhone: company.contactPersonPhone ?? '',
    fcContractStartDate: company.fcContractStartDate ?? '',
    fcContractRenewalDate: company.fcContractRenewalDate ?? '',
    royaltyRate: company.royaltyRate ?? undefined,
    note: company.note ?? '',
  };
}

function FranchiseCompanyEditPageContent() {
  const params = useParams();
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/franchise-companies'));
  const withReturnTo = useWithReturnTo();
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();
  const isSubmittingRef = useRef(false);

  const companyId = params.id as string;

  const {
    data: company,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminFcCompanyControllerDetailOptions({ path: { id: companyId } }),
  });

  const form = useForm<FranchiseCompanyFormValues, unknown, FranchiseCompanyFormSubmitValues>({
    resolver: zodResolver(franchiseCompanyFormSchema) as never,
    mode: 'onChange',
    defaultValues: FRANCHISE_COMPANY_FORM_EMPTY_VALUES,
  });

  useEffect(() => {
    if (company) {
      form.reset(toFormDefaults(company));
    }
  }, [company, form]);

  const formIsDirty = form.formState.isDirty;
  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(formIsDirty);

  const navigateToDetail = useCallback(() => {
    router.push(navigate('/franchise-companies/[id]', companyId));
  }, [router, companyId]);

  const handleCancel = useCallback(() => {
    confirmDiscard(navigateToDetail);
  }, [confirmDiscard, navigateToDetail]);

  const finishSave = useCallback(() => {
    toast.success('FC企業の変更を保存しました');
    navigateAfterSave(() => router.push(navigate('/franchise-companies')));
  }, [navigateAfterSave, router]);

  const updateMutation = useMutation({
    ...adminFcCompanyControllerUpdateMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminFcCompanyControllerListQueryKey() });
      void queryClient.invalidateQueries({
        queryKey: adminFcCompanyControllerDetailQueryKey({ path: { id: companyId } }),
      });
      void queryClient.invalidateQueries({
        queryKey: adminFcCompanyControllerHistoryQueryKey({ path: { id: companyId } }),
      });
      finishSave();
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const onSubmit = (values: FranchiseCompanyFormSubmitValues) => {
    // Ref guard (not just `updateMutation.isPending`): two clicks dispatched in the
    // same tick both read the pre-mutate render state, so a state-only guard can
    // still let a second PATCH through.
    if (isSubmittingRef.current) return;
    const body = toUpdateFcCompanyBody(values, form.formState.dirtyFields);
    // Nothing changed: API-076 rejects an empty PATCH (400 "at least one field required"), yet
    // the stored record already equals the form — the save is complete, so finish it as one
    // (same pattern as the store edit screen) instead of surfacing a generic error.
    if (Object.keys(body).length === 0) {
      finishSave();
      return;
    }
    isSubmittingRef.current = true;
    updateMutation.mutate({ path: { id: companyId }, body });
  };

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !company) {
    const isNotFound = isError && isFcCompanyNotFoundError(error);
    return (
      <>
        <PageHeader
          breadcrumb={<BackLink label="FC企業管理に戻る" href={navigate('/franchise-companies')} />}
          title="FC企業編集"
        />
        {isError && isFcCompanyPermissionError(error) ? (
          <FcPermissionDenied />
        ) : (
          <DataStateBoundary
            isLoading={false}
            isError={isError && !isNotFound}
            isEmpty={isNotFound || !company}
            onRetry={() => void refetch()}
            errorTitle="FC企業の取得に失敗しました"
            emptyTitle="FC企業が見つかりません"
          />
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb={
          <BackLink
            label="FC企業詳細に戻る"
            onClick={() =>
              confirmDiscard(() =>
                router.push(
                  withReturnTo(navigate('/franchise-companies/[id]', companyId), backToListHref),
                ),
              )
            }
          />
        }
        title="FC企業編集"
        badge={
          <Badge
            variant="outline"
            className={cn('gap-1 text-xs font-medium', getActiveBadgeClass(company.isActive))}
          >
            <span className="inline-block size-1.5 rounded-full bg-current" />
            {getActiveLabel(company.isActive)}
          </Badge>
        }
      />
      <div className="mx-auto w-full max-w-240 p-4">
        <Form {...form}>
          {/* react-hook-form's handleSubmit never invokes onSubmit synchronously
              during render — it only returns a closure invoked later on the submit
              event — so isSubmittingRef is never actually read during render. */}
          {/* eslint-disable-next-line react-hooks/refs */}
          <form onSubmit={form.handleSubmit(onSubmit, scrollToFirstError)}>
            <FranchiseCompanyForm
              mode="edit"
              isSubmitting={updateMutation.isPending}
              onCancel={handleCancel}
              onSubmit={onSubmit}
              onError={scrollToFirstError}
              submitPermission={Permission.FCCompaniesEdit}
            />
          </form>
        </Form>
      </div>
    </>
  );
}

export default function FranchiseCompanyEditPage() {
  return (
    <Suspense fallback={<Loading />}>
      <FranchiseCompanyEditPageContent />
    </Suspense>
  );
}
