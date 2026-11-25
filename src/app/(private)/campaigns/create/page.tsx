'use client';

import { Suspense, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter, useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { Form } from '@/components/ui/form';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminCampaignControllerCreateMutation,
  adminCampaignControllerDetailOptions,
  adminCampaignControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { CampaignForm } from '../_components/campaign-form';
import { toCampaignCreateBody, toDuplicatedFormValues } from '../_schemas/campaign-form.mapper';
import {
  CAMPAIGN_FORM_DEFAULT_VALUES,
  type CampaignFormValues,
  campaignFormSchema,
} from '../_schemas/campaign-form.schema';
import { getCampaignCodeServerErrorMessage } from '../_utils/campaign-error';
import { getMisfitAutoOptions } from '../_utils/campaign-gender-conflict';

function CampaignCreatePageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();
  const backToListHref = useBackToListHref(navigate('/campaigns'));
  const searchParams = useSearchParams();
  const copyFromId = searchParams.get('copyFrom');

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema) as never,
    mode: 'onChange',
    defaultValues: CAMPAIGN_FORM_DEFAULT_VALUES,
  });

  // G-03 FR-S003 複製: コピー元を読み込み、名称に「（コピー）」を付けて受付停止で初期化する
  const { data: sourceData } = useQuery({
    ...adminCampaignControllerDetailOptions({ path: { campaignId: copyFromId ?? '' } }),
    enabled: Boolean(copyFromId),
  });

  useEffect(() => {
    if (sourceData) {
      form.reset(toDuplicatedFormValues(sourceData));
    }
  }, [sourceData, form]);

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(form.formState.isDirty);

  const createMutation = useMutation({
    ...adminCampaignControllerCreateMutation(),
    // A duplicate code is shown under the field only; every other failure is toasted here.
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      toast.success(copyFromId ? 'キャンペーンを複製しました' : 'キャンペーンを登録しました');
      queryClient.invalidateQueries({ queryKey: adminCampaignControllerListQueryKey() });
      navigateAfterSave(() => router.push(backToListHref));
    },
    onError: (error) => {
      const codeErrorMessage = getCampaignCodeServerErrorMessage(error);
      if (codeErrorMessage) {
        form.setError('campaignCode', { type: 'server', message: codeErrorMessage });
        scrollToFirstError();
        return;
      }
      // E-CMP-023: name the auto-grant options whose areas' gender condition does not admit
      // everyone the grant reaches, under the 自動付与オプション grid where they are picked.
      const misfits = getMisfitAutoOptions(error);
      if (misfits.length > 0) {
        const names = form.getValues('optionNames');
        const labels = misfits.map((m) => m.optionName ?? names[m.optionId] ?? m.optionId);
        form.setError('autoGrantOptionIds', {
          type: 'server',
          message: `${labels.join('、')}は、利用できるエリアの性別条件が付与対象と合いません。付与対象を「条件あり」にして性別を合わせるか、オプションを外してください。`,
        });
        scrollToFirstError();
        return;
      }
      toast.error(resolveApiErrorMessage(error));
    },
  });

  const onSubmit = (values: CampaignFormValues) => {
    createMutation.mutate({ body: toCampaignCreateBody(values) });
  };

  const leaveToList = () => confirmDiscard(() => router.push(backToListHref));

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label="キャンペーン管理に戻る" onClick={leaveToList} />}
        title={
          copyFromId
            ? `キャンペーン 複製（${sourceData?.campaignNumber ?? copyFromId}）`
            : 'キャンペーン 新規登録'
        }
      />
      <div className="px-6 py-4">
        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(onSubmit, scrollToFirstError)}>
            <CampaignForm
              copyFromId={sourceData ? sourceData.campaignNumber : null}
              isSubmitting={createMutation.isPending}
              onCancel={leaveToList}
            />
          </form>
        </Form>
      </div>
    </>
  );
}

export default function CampaignCreatePage() {
  return (
    <Suspense fallback={<Loading />}>
      <CampaignCreatePageContent />
    </Suspense>
  );
}
