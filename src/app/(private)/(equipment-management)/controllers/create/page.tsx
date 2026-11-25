'use client';

import { useCallback } from 'react';
import { useForm, useFormState } from 'react-hook-form';

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

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import { adminRelayControllerControllerCreateMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { DeviceFormFooter } from '../../_components/device-form-footer';
import { useSubmitGuard } from '../../_hooks/use-submit-guard.hook';
import { ControllerForm } from '../_components/controller-form';
import {
  type ControllerFormSubmitValues,
  type ControllerFormValues,
  controllerFormSchema,
} from '../_schemas/controller-form.schema';
import { invalidateControllerRosterCaches } from '../_utils/controller-cache.util';
import {
  controllerFormValuesToCreateBody,
  emptyControllerFormDefaults,
  getControllerFieldError,
} from '../_utils/controller-form.util';

export default function ControllerCreatePage() {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/controllers'));
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  const form = useForm<ControllerFormValues, unknown, ControllerFormSubmitValues>({
    resolver: zodResolver(controllerFormSchema) as never,
    mode: 'onSubmit',
    defaultValues: emptyControllerFormDefaults,
  });

  const { isDirty } = useFormState({ control: form.control });

  /**
   * Guards every exit path, not just the キャンセル button: the breadcrumb below, the sidebar, the
   * browser's Back and a reload all reach the same discard dialog.
   */
  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);

  const navigateToList = useCallback(() => {
    router.push(backToListHref);
  }, [router, backToListHref]);

  const createMutation = useMutation({
    ...adminRelayControllerControllerCreateMutation(),
    // A field-level rejection renders inline only (no duplicate toast); every other failure gets one
    // toast carrying the server's userMessage (D11 / D12).
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      form.reset(form.getValues());
      toast.success('接点制御装置を登録しました');
      invalidateControllerRosterCaches(queryClient);
      navigateAfterSave(navigateToList);
    },
    onError: (error) => {
      const fieldError = getControllerFieldError(error);
      if (fieldError) {
        form.setError(fieldError.field, { type: 'server', message: fieldError.message });
        scrollToFirstError();
        return;
      }
      toast.error(resolveApiErrorMessage(error));
    },
  });

  // A double click must not register the controller twice.
  const { submitOnce } = useSubmitGuard(createMutation.isPending, createMutation.isError);

  const onSubmit = (values: ControllerFormSubmitValues) => {
    submitOnce(() => createMutation.mutate({ body: controllerFormValuesToCreateBody(values) }));
  };

  const handleSubmit = form.handleSubmit(onSubmit, scrollToFirstError);

  const handleCancel = () => confirmDiscard(navigateToList);

  return (
    <Form {...form}>
      {/* BUG-E02-F-03 — the prototype's back link (copy per PO 2026-10-12), guarded like every exit. */}
      <PageHeader
        breadcrumb={<BackLink label="店舗機器管理に戻る" onClick={handleCancel} />}
        title="接点制御装置 新規登録"
      />

      <div className="mx-auto max-w-[960px] px-4 pt-4 pb-8">
        <form noValidate onSubmit={handleSubmit}>
          <ControllerForm mode="create" />
        </form>
      </div>

      {/* BUG-E02-F-01 / F-02 — shared footer: spans the content column, names the error kind. */}
      <DeviceFormFooter
        submitLabel="登録"
        pendingLabel="登録中..."
        isPending={createMutation.isPending}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    </Form>
  );
}
