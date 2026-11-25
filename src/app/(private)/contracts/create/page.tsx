'use client';

import { Suspense, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter, useSearchParams } from 'next/navigation';

import {
  invalidateAreaUsageCaches,
  invalidateGenderCandidateCaches,
} from '@/app/(private)/area-master/_utils/area-cache.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form } from '@/components/ui/form';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminPlanControllerCopyMutation,
  adminPlanControllerCreateMutation,
  adminPlanControllerDetailOptions,
  adminPlanControllerDetailQueryKey,
  adminPlanControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { PlanImageDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { ContractForm } from '../_components/contract-form';
import { THUMBNAIL_SYNC_ERROR, usePlanThumbnailSync } from '../_hooks/use-plan-thumbnail-sync';
import {
  type ContractFormSubmitValues,
  type ContractFormValues,
  contractFormSchema,
} from '../_schemas/contract-form.schema';
import { getContractChildCreateState, getContractCopyState } from '../_utils/contract-action-state';
import {
  emptyContractFormValues,
  planDetailToChildFormValues,
  planDetailToCopyFormValues,
  toCopyPlanOverrides,
  toCreatePlanBody,
} from '../_utils/contract-form.util';

interface ContractCreateFormProps {
  title: string;
  /** Source plan id when the form was opened through the 複製 action. */
  copyFromId?: string;
  /** 主契約ID of the source master, shown as コピー元ID while duplicating. */
  copyFromLabel?: string;
  /** 企業名 inherited from the source master while duplicating. */
  corporateName?: string | null;
  /** Pictures of the 複製 source — previews the サムネイル the copy starts with. */
  images?: PlanImageDto[];
  /**
   * G-01 FR-M007 子主契約の作成 — the copy becomes a derivative of the source (`asDerived: true`)
   * instead of inheriting the source's own 親主契約.
   */
  isChildCreate?: boolean;
  /** 主契約名 of the source master, which becomes the 親主契約 in child-create mode. */
  sourceName?: string;
  /** 親主契約 of the source — a sibling 複製 changes that parent's 子主契約 list. */
  sourceParentPlanId?: string | null;
  defaultValues: ContractFormValues;
}

function ContractCreateForm({
  title,
  copyFromId,
  copyFromLabel,
  corporateName,
  images,
  isChildCreate = false,
  sourceName,
  sourceParentPlanId,
  defaultValues,
}: Readonly<ContractCreateFormProps>) {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/contracts'));
  const queryClient = useQueryClient();
  const { syncThumbnail, isSyncing } = usePlanThumbnailSync();

  const form = useForm<ContractFormValues, unknown, ContractFormSubmitValues>({
    resolver: zodResolver(contractFormSchema) as never,
    mode: 'onChange',
    defaultValues,
  });

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(
    Object.keys(form.formState.dirtyFields).length > 0,
  );
  const handleCancel = () => confirmDiscard(() => router.push(backToListHref));

  const isSubmittingRef = useRef(false);
  const createMutation = useMutation(adminPlanControllerCreateMutation());
  const copyMutation = useMutation(adminPlanControllerCopyMutation());

  // Both awaits below are `useMutation` calls, so a failure is already toasted with the
  // backend's own message by the shared MutationCache — the catches only steer the flow.
  const handleSubmit = async (values: ContractFormSubmitValues) => {
    // Clicks fired in the same tick all see `isPending === false`, so the button state alone
    // cannot stop a double submit — hold the lock until the save fails or the screen is left.
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    let plan;
    try {
      // 複製 goes through API-087 §8 rather than a plain create: that endpoint is the only one
      // that records コピー元ID (`copiedFromPlanId`). `name` is a top-level field there, and
      // `overrides` carries the rest of the edit-body fields on top of the source snapshot.
      // `asDerived` picks the 親主契約: the source itself for 子主契約作成, else the source's parent.
      plan = copyFromId
        ? await copyMutation.mutateAsync({
            path: { planId: copyFromId },
            body: {
              name: values.name,
              asDerived: isChildCreate,
              overrides: toCopyPlanOverrides(values, defaultValues),
            },
          })
        : await createMutation.mutateAsync({ body: toCreatePlanBody(values) });
    } catch {
      isSubmittingRef.current = false;
      return;
    }

    // API-087 stores plan pictures in a sub-resource, so the サムネイル can only be attached once
    // the plan has an id. A failure here leaves a saved plan without its picture — the picture
    // error is toasted on its own rather than failing the whole registration. 複製 already carries
    // the source's pictures over, so the sync diffs against what the new row came back with —
    // attaching the kept picture again would leave the copy with two.
    try {
      await syncThumbnail(plan.planId, values.thumbnailS3Key ?? null, plan.images);
    } catch (error) {
      // The backend's own reason goes in the description; the title says the plan is kept.
      toast.error(THUMBNAIL_SYNC_ERROR, { description: resolveApiErrorMessage(error) });
    }

    toast.success(
      isChildCreate
        ? '子主契約を作成しました'
        : copyFromLabel
          ? '主契約を複製しました'
          : '主契約を登録しました',
    );
    queryClient.invalidateQueries({ queryKey: adminPlanControllerListQueryKey() });
    // 利用できるエリア: the areas' usage counts and the gender-filtered sale candidates.
    invalidateAreaUsageCaches(queryClient);
    invalidateGenderCandidateCaches(queryClient);
    // The new plan joins a parent's 子主契約 list: the source for 子主契約作成, the source's own
    // parent for a sibling 複製. That detail's count also drives its 削除 guard.
    const affectedParentId = isChildCreate ? copyFromId : sourceParentPlanId;
    if (affectedParentId) {
      queryClient.invalidateQueries({
        queryKey: adminPlanControllerDetailQueryKey({ path: { planId: affectedParentId } }),
      });
    }
    navigateAfterSave(() => router.push(navigate('/contracts')));
  };

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label="主契約管理に戻る" onClick={handleCancel} />}
        title={title}
      />
      <div className="mx-auto max-w-240 p-4">
        <Form {...form}>
          <ContractForm
            copyFromLabel={copyFromLabel}
            corporateName={corporateName}
            images={images}
            isCopy={!!copyFromId}
            isChildCreate={isChildCreate}
            sourceName={sourceName}
            isSubmitting={createMutation.isPending || copyMutation.isPending || isSyncing}
            onLeave={confirmDiscard}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
          />
        </Form>
      </div>
    </>
  );
}

function ContractCreatePageContent() {
  const searchParams = useSearchParams();
  const copyFromId = searchParams.get('copyFrom') ?? undefined;
  // G-01 FR-M007: the detail screen's 子主契約を作成 opens this route with `asChild=1`.
  const isChildCreate = !!copyFromId && searchParams.get('asChild') === '1';

  const {
    data: source,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    ...adminPlanControllerDetailOptions({ path: { planId: copyFromId ?? '' } }),
    enabled: Boolean(copyFromId),
  });

  const title = isChildCreate
    ? `主契約 子主契約作成（${source?.planCode ?? ''}）`
    : copyFromId
      ? `主契約 複製（${source?.planCode ?? ''}）`
      : '主契約 新規登録';

  if (!copyFromId) {
    return <ContractCreateForm title={title} defaultValues={emptyContractFormValues} />;
  }

  // A blocked source (特殊契約, or a derived child for 子主契約作成) is refused here too, so the
  // disabled 複製 / 子主契約を作成 buttons cannot be bypassed by typing `?copyFrom=` into the URL.
  const childCreateState =
    source && isChildCreate ? getContractChildCreateState(source) : undefined;
  const { canCopy, copyBlockedMessage } = childCreateState
    ? {
        canCopy: childCreateState.canCreateChild,
        copyBlockedMessage: childCreateState.childCreateBlockedMessage,
      }
    : source
      ? getContractCopyState(source)
      : { canCopy: true, copyBlockedMessage: undefined };
  if (source && !canCopy) {
    return (
      <>
        <PageHeader
          breadcrumb={<BackToListLink label="主契約管理に戻る" listPath={navigate('/contracts')} />}
          title={title}
        />
        <div className="mx-auto max-w-240 p-4">
          <Alert className="border-warning/50 bg-warning/10">
            <AlertDescription className="text-muted-foreground text-sm">
              {copyBlockedMessage}
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  if (source) {
    return (
      <ContractCreateForm
        key={`${source.planId}-${isChildCreate ? 'child' : 'copy'}`}
        title={title}
        copyFromId={source.planId}
        copyFromLabel={source.planCode}
        corporateName={source.corporateName}
        images={source.images}
        isChildCreate={isChildCreate}
        sourceName={source.name}
        sourceParentPlanId={source.parentPlanId}
        defaultValues={
          isChildCreate ? planDetailToChildFormValues(source) : planDetailToCopyFormValues(source)
        }
      />
    );
  }

  // Loading / error of the 複製 source — nothing is typed yet, so the back link needs no guard.
  return (
    <>
      <PageHeader
        breadcrumb={<BackToListLink label="主契約管理に戻る" listPath={navigate('/contracts')} />}
        title={title}
      />
      <div className="mx-auto max-w-240 p-4">
        <DataStateBoundary
          isLoading={isLoading}
          isError={isError}
          isEmpty={!isLoading && !isError}
          onRetry={refetch}
        />
      </div>
    </>
  );
}

export default function ContractCreatePage() {
  return (
    <Suspense fallback={<Loading />}>
      <ContractCreatePageContent />
    </Suspense>
  );
}
