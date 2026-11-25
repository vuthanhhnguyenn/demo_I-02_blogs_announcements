'use client';

import { useForm } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes.hook';

import { BackLink } from '@/components/common/back-link';
import { PageHeader } from '@/components/common/page-header';
import { Form } from '@/components/ui/form';

import {
  adminQuestionnaireControllerCreateMutation,
  adminQuestionnaireControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { SurveyForm } from '../_components/survey-form';
import {
  type SurveyFormSubmitValues,
  type SurveyFormValues,
  createEmptySurveyFormValues,
  mapSurveyFormValuesToCreateBody,
  surveyFormSchema,
} from '../_schemas/survey-form.schema';

export default function SurveyCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<SurveyFormValues, unknown, SurveyFormSubmitValues>({
    resolver: zodResolver(surveyFormSchema) as never,
    mode: 'onChange',
    defaultValues: createEmptySurveyFormValues(),
  });

  const backToListHref = useBackToListHref(navigate('/surveys'));
  const { confirmDiscard } = useUnsavedChanges(form.formState.isDirty);
  const goBack = () => confirmDiscard(() => router.push(backToListHref));

  // Two clicks in one tick both pass validation before the button re-renders as disabled.
  const runSubmit = useInFlightGuard();
  const createMutation = useMutation({
    ...adminQuestionnaireControllerCreateMutation(),
    onSuccess: () => {
      toast.success('アンケートを登録しました');
      queryClient.invalidateQueries({ queryKey: adminQuestionnaireControllerListQueryKey() });
      // Saved: drop the dirty state first, or a full-page fallback navigation raises the browser's
      // leave-site dialog over a form that no longer has unsaved changes.
      form.reset(form.getValues());
      router.push(backToListHref);
    },
  });

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label="アンケート管理に戻る" onClick={goBack} />}
        title="アンケート新規登録"
      />
      <div className="mx-auto max-w-[960px] p-4">
        <Form {...form}>
          <SurveyForm
            isSubmitting={createMutation.isPending}
            onCancel={goBack}
            onSubmit={(values) =>
              void runSubmit(() =>
                createMutation
                  .mutateAsync({ body: mapSurveyFormValuesToCreateBody(values) })
                  .catch(() => undefined),
              )
            }
          />
        </Form>
      </div>
    </>
  );
}
