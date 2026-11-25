'use client';

import { useMemo, useRef } from 'react';
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

import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form } from '@/components/ui/form';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminPlanControllerDetailOptions,
  adminPlanControllerDetailQueryKey,
  adminPlanControllerHistoryQueryKey,
  adminPlanControllerListQueryKey,
  adminPlanControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { PlanDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { ContractForm } from '../../_components/contract-form';
import { THUMBNAIL_SYNC_ERROR, usePlanThumbnailSync } from '../../_hooks/use-plan-thumbnail-sync';
import {
  type ContractFormSubmitValues,
  type ContractFormValues,
  contractFormSchema,
} from '../../_schemas/contract-form.schema';
import { planDetailToFormValues, toUpdatePlanBody } from '../../_utils/contract-form.util';

interface ContractEditFormProps {
  plan: PlanDetailDto;
  defaultValues: ContractFormValues;
}

function ContractEditForm({ plan, defaultValues }: Readonly<ContractEditFormProps>) {
  const router = useRouter();
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
  // 編集 is entered from the detail screen, so leaving it returns there (the prototype's goBack).
  const handleCancel = () =>
    confirmDiscard(() => router.push(navigate('/contracts/[id]', plan.planId)));

  // Clicks fired in the same tick all see `isPending === false`, so hold a lock until the save
  // fails or the screen is left.
  const isSubmittingRef = useRef(false);
  const genderConflict = useCampaignGenderConflict();
  // E-ARE-004: an accepting campaign auto-grants an option the edited 性別制限 / areas would no
  // longer admit, so the error names those campaigns in a dialog instead of a toast.
  const updateMutation = useMutation({
    ...adminPlanControllerUpdateMutation(),
    meta: { suppressErrorToast: true },
    onError: genderConflict.handleError,
  });

  // A failed update is already reported by its own `onError`, so that catch only steers the flow;
  // a failed thumbnail sync is toasted below.
  const handleSubmit = async (values: ContractFormSubmitValues) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      await updateMutation.mutateAsync({
        path: { planId: plan.planId },
        body: toUpdatePlanBody(values, plan),
      });
    } catch {
      isSubmittingRef.current = false;
      return;
    }

    // The サムネイル lives in the `plans/{planId}/images` sub-resource, not the plan body. The
    // plan itself is already saved, so a picture failure does not undo the update.
    try {
      await syncThumbnail(plan.planId, values.thumbnailS3Key ?? null, plan.images);
    } catch (error) {
      // The backend's own reason goes in the description; the title says the plan is kept.
      toast.error(THUMBNAIL_SYNC_ERROR, { description: resolveApiErrorMessage(error) });
    }

    toast.success('主契約を更新しました');
    queryClient.invalidateQueries({ queryKey: adminPlanControllerListQueryKey() });
    queryClient.invalidateQueries({
      queryKey: adminPlanControllerDetailQueryKey({ path: { planId: plan.planId } }),
    });
    // 変更履歴 gets a new snapshot on every save.
    queryClient.invalidateQueries({
      queryKey: adminPlanControllerHistoryQueryKey({ path: { planId: plan.planId } }),
    });
    // 利用できるエリア: the areas' usage counts and the gender-filtered sale candidates.
    invalidateAreaUsageCaches(queryClient);
    invalidateGenderCandidateCaches(queryClient);
    // The plan is shown on its relatives' detail (親主契約 name here, 子主契約 rows there).
    const relativeIds = [plan.parentPlanId, ...plan.derivedChildren.map((child) => child.planId)];
    relativeIds.forEach((planId) => {
      if (!planId) return;
      queryClient.invalidateQueries({
        queryKey: adminPlanControllerDetailQueryKey({ path: { planId } }),
      });
    });
    navigateAfterSave(() => router.push(navigate('/contracts/[id]', plan.planId)));
  };

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label="主契約詳細に戻る" onClick={handleCancel} />}
        title="主契約 編集"
      />
      <div className="mx-auto max-w-240 p-4">
        <Form {...form}>
          <ContractForm
            isEdit
            planId={plan.planId}
            planCode={plan.planCode}
            corporateName={plan.corporateName}
            images={plan.images}
            isSubmitting={updateMutation.isPending || isSyncing}
            onLeave={confirmDiscard}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
          />
        </Form>
      </div>
      <CampaignGenderConflictDialog
        conflict={genderConflict.conflict}
        onClose={genderConflict.close}
      />
    </>
  );
}

export default function ContractEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const {
    data: plan,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    ...adminPlanControllerDetailOptions({ path: { planId: id ?? '' } }),
    enabled: Boolean(id),
  });

  // G-01 FR-M004: a master with live contracts is frozen — API-087 answers 409 E-PLN-001 for
  // anything beyond toggling 有効/無効, so the form is not offered at all.
  const canEdit = (plan?.contractCount ?? 0) <= 0;

  const defaultValues = useMemo<ContractFormValues | null>(
    () => (plan ? planDetailToFormValues(plan) : null),
    [plan],
  );

  return (
    <DataStateBoundary isLoading={isLoading} isError={isError} isEmpty={false} onRetry={refetch}>
      {plan && defaultValues && canEdit ? (
        <ContractEditForm key={plan.planId} plan={plan} defaultValues={defaultValues} />
      ) : (
        <>
          <PageHeader
            breadcrumb={
              <BackLink
                label="主契約詳細に戻る"
                href={id ? navigate('/contracts/[id]', id) : navigate('/contracts')}
              />
            }
            title="主契約 編集"
          />
          <div className="mx-auto max-w-240 p-4">
            {plan && (
              <Alert className="border-warning/50 bg-warning/10">
                <AlertDescription className="text-muted-foreground text-sm">
                  契約者が存在するため編集できません。新規マスタを登録してください
                </AlertDescription>
              </Alert>
            )}
          </div>
        </>
      )}
    </DataStateBoundary>
  );
}
