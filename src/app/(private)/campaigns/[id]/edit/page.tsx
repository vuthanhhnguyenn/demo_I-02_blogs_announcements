'use client';

import { useMemo, useState } from 'react';
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
import { PageHeader } from '@/components/common/page-header';
import { Form } from '@/components/ui/form';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminCampaignControllerDetailOptions,
  adminCampaignControllerDetailQueryKey,
  adminCampaignControllerHistoryQueryKey,
  adminCampaignControllerListQueryKey,
  adminCampaignControllerReplacePublishedStoresMutation,
  adminCampaignControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { CampaignDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { CampaignForm } from '../../_components/campaign-form';
import { CampaignGenderConflictDialog } from '../../_components/campaign-gender-conflict-dialog';
import { useCampaignGenderConflict } from '../../_hooks/use-campaign-gender-conflict';
import { toCampaignFormValues, toCampaignUpdateBody } from '../../_schemas/campaign-form.mapper';
import {
  type CampaignFormValues,
  campaignEditFormSchema,
} from '../../_schemas/campaign-form.schema';

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

interface CampaignEditFormProps {
  id: string;
  defaultValues: CampaignFormValues;
}

function CampaignEditForm({ id, defaultValues }: Readonly<CampaignEditFormProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();
  const backToListHref = useBackToListHref(navigate('/campaigns'));
  const withReturnTo = useWithReturnTo();

  // 差分の基準は「フォームを開いた時点の値」に固定する（再取得で props が変わっても動かさない）
  // Replaced with the saved values after a partial save, so the next save only resends what failed.
  const [baseline, setBaseline] = useState(defaultValues);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignEditFormSchema) as never,
    mode: 'onChange',
    defaultValues,
  });

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(form.formState.isDirty);

  const genderConflict = useCampaignGenderConflict();
  // Failures (E-CMP-002 / 016 / 019) are toasted with the API's userMessage; E-CMP-024 (turning
  // 受付 back on, or a capacity resume, while an auto-grant no longer fits) opens the conflict dialog.
  const updateMutation = useMutation({
    ...adminCampaignControllerUpdateMutation(),
    meta: { suppressErrorToast: true },
    onError: genderConflict.handleError,
  });
  // `PATCH` rejects `publishScope` / `publishedStoreIds`, so both are saved together through their own endpoint.
  // Its failure is toasted in `onSubmit`, which knows whether the PATCH before it was saved.
  const replaceStoresMutation = useMutation({
    ...adminCampaignControllerReplacePublishedStoresMutation(),
    meta: { suppressErrorToast: true },
  });

  const invalidateCampaignQueries = () => {
    void queryClient.invalidateQueries({ queryKey: adminCampaignControllerListQueryKey() });
    void queryClient.invalidateQueries({
      queryKey: adminCampaignControllerDetailQueryKey({ path: { campaignId: id } }),
    });
    void queryClient.invalidateQueries({
      queryKey: adminCampaignControllerHistoryQueryKey({ path: { campaignId: id } }),
    });
  };

  const onSubmit = async (values: CampaignFormValues) => {
    const body = toCampaignUpdateBody(values, baseline);
    const storesChanged =
      values.publishScope !== baseline.publishScope ||
      (values.publishScope === 'specific_stores' &&
        !sameIds(values.publishStoreIds, baseline.publishStoreIds));
    // 変更が無い項目だけの PATCH（空ボディ）は送らない。公開店舗のみの変更でも同様。
    let updated: CampaignDetailDto | undefined;
    if (Object.keys(body).length > 0) {
      try {
        updated = await updateMutation.mutateAsync({ path: { campaignId: id }, body });
      } catch {
        // Reported by the mutation's own `onError`.
        return;
      }
    }
    if (storesChanged) {
      try {
        await replaceStoresMutation.mutateAsync({
          path: { campaignId: id },
          body: {
            publishScope: values.publishScope,
            storeIds: values.publishScope === 'specific_stores' ? values.publishStoreIds : [],
          },
        });
      } catch (error) {
        // When the PATCH already went through, the form is reset to what the server saved so it
        // no longer looks unsaved, and only the store selection that failed stays dirty for the
        // next save. One toast carries both the partial-save notice and the reason.
        if (!updated) {
          toast.error(resolveApiErrorMessage(error));
        } else {
          const saved = toCampaignFormValues(updated);
          setBaseline(saved);
          form.reset(saved);
          form.setValue('publishScope', values.publishScope, { shouldDirty: true });
          form.setValue('publishStoreIds', values.publishStoreIds, { shouldDirty: true });
          invalidateCampaignQueries();
          toast.warning(
            'キャンペーン情報は保存しましたが、公開範囲・公開店舗は保存されていません。再度保存してください。',
            { description: resolveApiErrorMessage(error) },
          );
        }
        return;
      }
    }
    toast.success('キャンペーンを更新しました');
    invalidateCampaignQueries();
    navigateAfterSave(() => router.push(navigate('/campaigns/[id]', id)));
  };

  const leaveToDetail = () => confirmDiscard(() => router.push(navigate('/campaigns/[id]', id)));

  return (
    <>
      <PageHeader
        breadcrumb={
          <BackLink
            label="キャンペーン詳細に戻る"
            onClick={() =>
              confirmDiscard(() =>
                router.push(withReturnTo(navigate('/campaigns/[id]', id), backToListHref)),
              )
            }
          />
        }
        title="キャンペーン 編集"
      />
      <div className="px-6 py-4">
        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(onSubmit, scrollToFirstError)}>
            <CampaignForm
              isEdit
              isSubmitting={updateMutation.isPending || replaceStoresMutation.isPending}
              onCancel={leaveToDetail}
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

export default function CampaignEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminCampaignControllerDetailOptions({ path: { campaignId: id ?? '' } }),
    enabled: Boolean(id),
  });

  const campaign = data;

  const defaultValues = useMemo<CampaignFormValues | null>(() => {
    if (!campaign) return null;
    return toCampaignFormValues(campaign);
  }, [campaign]);

  return (
    <DataStateBoundary
      isLoading={isLoading}
      isError={isError}
      isEmpty={!campaign}
      onRetry={refetch}
    >
      {defaultValues && id && <CampaignEditForm id={id} defaultValues={defaultValues} />}
    </DataStateBoundary>
  );
}
