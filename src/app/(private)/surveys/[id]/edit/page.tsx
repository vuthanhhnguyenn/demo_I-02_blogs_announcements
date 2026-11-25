'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useParams, useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Form } from '@/components/ui/form';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import { AdminQuestionnaireManagementApi090 } from '@/lib/api-real';
import {
  adminQuestionnaireControllerDetailOptions,
  adminQuestionnaireControllerDetailQueryKey,
  adminQuestionnaireControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { SurveyForm } from '../../_components/survey-form';
import {
  type SurveyFormSubmitValues,
  type SurveyFormValues,
  mapSurveyDetailToFormValues,
  mapSurveyFormValuesToSaveBody,
  surveyFormSchema,
} from '../../_schemas/survey-form.schema';

type SurveyStatus = SurveyFormValues['status'];

function SurveyEditForm({
  id,
  version,
  defaultValues,
  backToListHref,
  retryStatus,
  onStatusSaveFailed,
  onStatusSaved,
}: Readonly<{
  id: string;
  version: number;
  defaultValues: SurveyFormValues;
  backToListHref: string;
  /** A 有効/無効 change a previous save could not apply; put back on the switch as unsaved. */
  retryStatus: SurveyStatus | null;
  onStatusSaveFailed: (status: SurveyStatus) => void;
  onStatusSaved: () => void;
}>) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<SurveyFormValues, unknown, SurveyFormSubmitValues>({
    resolver: zodResolver(surveyFormSchema) as never,
    mode: 'onChange',
    defaultValues,
  });
  const { confirmDiscard } = useUnsavedChanges(form.formState.isDirty);
  const runSubmit = useInFlightGuard();
  const { dirtyFields } = form.formState;

  // The content was saved but the switch was not: the form reloads with the saved content, so the
  // switch is the only thing left to save.
  useEffect(() => {
    if (retryStatus && retryStatus !== defaultValues.status) {
      form.setValue('status', retryStatus, { shouldDirty: true });
    }
  }, [form, retryStatus, defaultValues.status]);

  // The full-form save (PUT) carries no `status`, so a flipped 有効/無効 switch is a second call.
  // The two writes are reported separately: a failed switch must not look like nothing was saved.
  const updateMutation = useMutation({
    mutationFn: async (values: SurveyFormSubmitValues) => {
      const statusChanged = values.status !== defaultValues.status;
      const contentChanged = Object.keys(dirtyFields).some((field) => field !== 'status');

      // Only the switch moved: no content PUT (it would just add a duplicate history entry).
      if (contentChanged || !statusChanged) {
        await AdminQuestionnaireManagementApi090.adminQuestionnaireControllerSave({
          path: { id },
          body: mapSurveyFormValuesToSaveBody(values, version),
          throwOnError: true,
        });
      }
      if (!statusChanged) return { statusError: null };

      try {
        await AdminQuestionnaireManagementApi090.adminQuestionnaireControllerSetStatus({
          path: { id },
          body: { status: values.status },
          throwOnError: true,
        });
        return { statusError: null };
      } catch (error) {
        return { statusError: error };
      }
    },
    onSuccess: ({ statusError }, values) => {
      if (statusError) {
        // The content is saved (the refetch below reloads the form with it); only the switch is not.
        // Returned instead of thrown so the global toast does not stack on top of this one.
        toast.error('内容は保存しましたが、有効/無効の変更に失敗しました', {
          description: resolveApiErrorMessage(statusError),
        });
        onStatusSaveFailed(values.status);
        return;
      }
      onStatusSaved();
      toast.success('アンケートの変更を保存しました');
      // Saved: drop the dirty state first, or a full-page fallback navigation raises the browser's
      // leave-site dialog over a form that no longer has unsaved changes.
      form.reset(form.getValues());
      router.push(backToListHref);
    },
    // Someone saved first (E-QST-016): the global toast shows the backend's message, and the
    // refetch below reloads the form (see `key` on SurveyEditForm) so the next save carries the new version.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminQuestionnaireControllerListQueryKey() });
      queryClient.invalidateQueries({
        queryKey: adminQuestionnaireControllerDetailQueryKey({ path: { id } }),
      });
    },
  });

  const goBack = () => confirmDiscard(() => router.push(backToListHref));

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label="アンケート管理に戻る" onClick={goBack} />}
        title="アンケート編集"
      />
      <div className="mx-auto max-w-[960px] p-4">
        <Form {...form}>
          <SurveyForm
            isEdit
            isSubmitting={updateMutation.isPending}
            onCancel={goBack}
            onSubmit={(values) =>
              void runSubmit(() => updateMutation.mutateAsync(values).catch(() => undefined))
            }
          />
        </Form>
      </div>
    </>
  );
}

export default function SurveyEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const backToListHref = useBackToListHref(navigate('/surveys'));
  // Outlives the form: the form is remounted (new `key`) when a save changes the survey's version,
  // or when its status changes (the status PATCH leaves the version as is).
  const [retryStatus, setRetryStatus] = useState<SurveyStatus | null>(null);

  const {
    data: survey,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminQuestionnaireControllerDetailOptions({ path: { id: id ?? '' } }),
    enabled: Boolean(id),
  });

  const defaultValues = useMemo<SurveyFormValues | null>(() => {
    if (!survey) return null;
    return mapSurveyDetailToFormValues(survey);
  }, [survey]);

  // 404 E-QST-001 = unknown id, 400 = malformed (non-UUID) id: both are "not found", not a network
  // failure (same as lessons/[id]); only other errors keep the retry state.
  const errorStatus = getApiErrorStatus(error);
  const isNotFound = isError && (errorStatus === 404 || errorStatus === 400);

  return (
    <>
      {isNotFound && (
        <PageHeader
          breadcrumb={<BackLink label="アンケート管理に戻る" href={backToListHref} />}
          title="アンケート編集"
        />
      )}
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || !survey}
        onRetry={refetch}
        emptyTitle="指定されたアンケートが見つかりません。"
        emptyDescription="指定されたアンケートは存在しないか、削除された可能性があります。"
      >
        {defaultValues && id && (
          <SurveyEditForm
            key={`${survey?.version}-${survey?.status}`}
            id={id}
            version={survey?.version ?? 1}
            defaultValues={defaultValues}
            backToListHref={backToListHref}
            retryStatus={retryStatus}
            onStatusSaveFailed={setRetryStatus}
            onStatusSaved={() => setRetryStatus(null)}
          />
        )}
      </DataStateBoundary>
    </>
  );
}
