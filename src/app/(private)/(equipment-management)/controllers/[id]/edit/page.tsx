'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useForm, useFormState } from 'react-hook-form';

import { useParams, useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Form } from '@/components/ui/form';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminRelayControllerControllerDetailOptions,
  adminRelayControllerControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { RelayControllerDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { DeviceFormFooter } from '../../../_components/device-form-footer';
import { useSubmitGuard } from '../../../_hooks/use-submit-guard.hook';
import { isDeviceConflictError, isDeviceNotFoundError } from '../../../_utils/device-api.util';
import { ControllerForm } from '../../_components/controller-form';
import {
  type ControllerFormSubmitValues,
  type ControllerFormValues,
  controllerFormSchema,
} from '../../_schemas/controller-form.schema';
import {
  invalidateControllerCaches,
  invalidateControllerRosterCaches,
} from '../../_utils/controller-cache.util';
import {
  controllerDetailToFormValues,
  controllerFormValuesToPatchBody,
  getControllerFieldError,
} from '../../_utils/controller-form.util';

type ControllerDetail = RelayControllerDetailDto;

function ControllerEditForm({ controller, id }: { controller: ControllerDetail; id: string }) {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/controllers'));
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();
  // The detail carries the store's name / code, so the locked 店舗コード field needs no lookup.
  const initialStore = controller.storeName
    ? {
        id: controller.storeId,
        label: controller.storeCode
          ? `${controller.storeName} (${controller.storeCode})`
          : controller.storeName,
      }
    : undefined;

  const form = useForm<ControllerFormValues, unknown, ControllerFormSubmitValues>({
    resolver: zodResolver(controllerFormSchema) as never,
    mode: 'onSubmit',
    defaultValues: controllerDetailToFormValues(controller),
  });

  const { isDirty, dirtyFields } = useFormState({ control: form.control });

  /**
   * BUG-E02-F-07 — after a stale-edit refusal (409 E-DEV-014) the form reloads the latest record:
   * `defaultValues` are read once, so the refetched controller is pushed in with `reset` when it
   * arrives (PO-approved: the user re-applies the change on top of the current values).
   */
  const reloadOnRefetchRef = useRef(false);
  useEffect(() => {
    if (!reloadOnRefetchRef.current) return;
    reloadOnRefetchRef.current = false;
    form.reset(controllerDetailToFormValues(controller));
  }, [controller, form]);

  /**
   * Guards every exit path, not just the キャンセル button: the breadcrumb below, the sidebar, the
   * browser's Back and a reload all reach the same discard dialog.
   */
  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);

  // BUG-E02-F-06 — the edit flow ends on the list (FR-007-C), keeping its search / paging.
  const navigateToList = useCallback(() => {
    router.push(backToListHref);
  }, [router, backToListHref]);

  const patchMutation = useMutation({
    ...adminRelayControllerControllerUpdateMutation(),
    // A field-level rejection renders inline only (no duplicate toast); every other failure gets one
    // toast carrying the server's userMessage (D11 / D12).
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      invalidateControllerCaches(queryClient, id);
      toast.success('接点制御装置の変更を保存しました');
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
      if (isDeviceNotFoundError(error)) {
        // BUG-E02-F-08 — deleted elsewhere: nothing left to edit, go back to the list.
        invalidateControllerRosterCaches(queryClient);
        navigateAfterSave(navigateToList);
        return;
      }
      if (isDeviceConflictError(error)) {
        // D13 / BUG-E02-F-07 — someone saved in between: refetch, then reload the form with it.
        reloadOnRefetchRef.current = true;
        invalidateControllerCaches(queryClient, id);
      }
    },
  });

  // A double click must send one PATCH: the second one is refused as stale (E-DEV-014).
  const { submitOnce } = useSubmitGuard(patchMutation.isPending, patchMutation.isError);

  const onSubmit = (values: ControllerFormSubmitValues) => {
    if (!isDirty) return;
    submitOnce(() =>
      patchMutation.mutate({
        path: { relayControllerId: id },
        body: controllerFormValuesToPatchBody(values, dirtyFields, controller.updatedAt),
      }),
    );
  };

  const handleSubmit = form.handleSubmit(onSubmit, scrollToFirstError);

  const handleCancel = () => confirmDiscard(navigateToList);

  return (
    <Form {...form}>
      {/* BUG-E02-F-03 — the prototype's back link (copy per PO 2026-10-12), guarded like every exit. */}
      <PageHeader
        breadcrumb={<BackLink label="店舗機器管理に戻る" onClick={handleCancel} />}
        title="接点制御装置 編集"
      />

      <div className="mx-auto max-w-[960px] px-4 pt-4 pb-8">
        <form noValidate onSubmit={handleSubmit}>
          <ControllerForm mode="edit" initialStore={initialStore} />
        </form>
      </div>

      {/* BUG-E02-F-01 / F-02 — shared footer: spans the content column, names the error kind. */}
      <DeviceFormFooter
        submitLabel="更新"
        pendingLabel="保存中..."
        isPending={patchMutation.isPending}
        submitDisabled={!isDirty}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    </Form>
  );
}

export default function ControllerEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminRelayControllerControllerDetailOptions({ path: { relayControllerId: id } }),
    enabled: Boolean(id),
  });

  const controller = data;

  if (isLoading || isError || !controller || !id) {
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!controller}
        onRetry={() => refetch()}
        errorTitle="接点制御装置の取得に失敗しました"
      />
    );
  }

  return <ControllerEditForm key={id} controller={controller} id={id} />;
}
