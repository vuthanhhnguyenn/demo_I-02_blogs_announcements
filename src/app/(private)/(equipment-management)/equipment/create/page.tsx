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
import { adminConnectedDeviceControllerCreateMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { DeviceFormFooter } from '../../_components/device-form-footer';
import { useSubmitGuard } from '../../_hooks/use-submit-guard.hook';
import { EquipmentForm } from '../_components/equipment-form';
import {
  type EquipmentFormSubmitValues,
  type EquipmentFormValues,
  equipmentFormSchema,
} from '../_schemas/equipment-form.schema';
import { invalidateEquipmentRosterCaches } from '../_utils/equipment-cache.util';
import {
  emptyEquipmentFormDefaults,
  equipmentFormValuesToCreateBody,
  getEquipmentFieldError,
} from '../_utils/equipment-form.util';

export default function EquipmentCreatePage() {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/equipment'));
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  const form = useForm<EquipmentFormValues, unknown, EquipmentFormSubmitValues>({
    resolver: zodResolver(equipmentFormSchema) as never,
    mode: 'onSubmit',
    defaultValues: emptyEquipmentFormDefaults,
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

  /**
   * Field-level rejections (E-DEV-003 / 004 / 008 / 009 …) render inline under their field with no
   * toast, so this mutation opts out of the shared MutationCache toast and raises the one toast
   * itself for everything else — with the server's `userMessage`, never a fixed 「…失敗しました」
   * (the usage-rule checks of the same POST, e.g. E-VAL-001, surface the same way).
   */
  const handleWriteError = (error: unknown) => {
    const fieldError = getEquipmentFieldError(error);
    if (!fieldError) {
      toast.error(resolveApiErrorMessage(error));
      return;
    }
    form.setError(fieldError.field, { type: 'server', message: fieldError.message });
    scrollToFirstError();
  };

  const createMutation = useMutation({
    ...adminConnectedDeviceControllerCreateMutation(),
    meta: { suppressErrorToast: true },
    onError: handleWriteError,
  });

  const isSaving = createMutation.isPending;

  // Three same-tick clicks on 登録 created three devices: one POST per submit. Only a failed
  // create reopens the guard.
  const { submitOnce } = useSubmitGuard(isSaving, createMutation.isError);

  /** The device and its FR-008 usage-control rule are written by the one POST (Q9). */
  const create = (values: EquipmentFormSubmitValues) => {
    createMutation.mutate(
      { body: equipmentFormValuesToCreateBody(values) },
      {
        onSuccess: () => {
          invalidateEquipmentRosterCaches(queryClient);
          form.reset(form.getValues());
          toast.success('接続機器を登録しました');
          navigateAfterSave(navigateToList);
        },
      },
    );
  };

  const onSubmit = (values: EquipmentFormSubmitValues) => submitOnce(() => create(values));

  const handleSubmit = form.handleSubmit(onSubmit, scrollToFirstError);

  const handleCancel = () => confirmDiscard(navigateToList);

  return (
    <Form {...form}>
      {/* BUG-E02-C-02: back link labelled as in the prototype (PO 2026-10-12). */}
      <PageHeader
        breadcrumb={<BackLink label="接続機器管理に戻る" onClick={handleCancel} />}
        title="接続機器 新規登録"
      />

      <div className="mx-auto max-w-[960px] px-4 pt-4 pb-8">
        <form onSubmit={handleSubmit}>
          <EquipmentForm mode="create" />
        </form>
      </div>

      <DeviceFormFooter
        submitLabel="登録"
        pendingLabel="登録中..."
        isPending={isSaving}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    </Form>
  );
}
