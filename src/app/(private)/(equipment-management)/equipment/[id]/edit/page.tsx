'use client';

import { useCallback } from 'react';
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
  adminConnectedDeviceControllerDetailOptions,
  adminConnectedDeviceControllerPutUsageControlMutation,
  adminConnectedDeviceControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { ConnectedDeviceDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { DeviceFormFooter } from '../../../_components/device-form-footer';
import { useSubmitGuard } from '../../../_hooks/use-submit-guard.hook';
import { isDeviceConflictError, isDeviceNotFoundError } from '../../../_utils/device-api.util';
import { EquipmentForm } from '../../_components/equipment-form';
import {
  type EquipmentFormSubmitValues,
  type EquipmentFormValues,
  equipmentFormSchema,
} from '../../_schemas/equipment-form.schema';
import {
  invalidateEquipmentRosterCaches,
  invalidateEquipmentStatusCaches,
} from '../../_utils/equipment-cache.util';
import {
  equipmentDetailToFormValues,
  equipmentFormValuesToPatchBody,
  getEquipmentFieldError,
  isUsageControlDirty,
  toUsageControlBody,
} from '../../_utils/equipment-form.util';

type EquipmentDetail = ConnectedDeviceDetailDto;

function EquipmentEditForm({ equipment, id }: { equipment: EquipmentDetail; id: string }) {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/equipment'));
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  const form = useForm<EquipmentFormValues, unknown, EquipmentFormSubmitValues>({
    resolver: zodResolver(equipmentFormSchema) as never,
    mode: 'onSubmit',
    defaultValues: equipmentDetailToFormValues(equipment),
  });

  const { isDirty, dirtyFields } = useFormState({ control: form.control });

  /**
   * Guards every exit path, not just the キャンセル button: the breadcrumb below, the sidebar, the
   * browser's Back and a reload all reach the same discard dialog.
   */
  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);

  const navigateToDetail = useCallback(() => {
    router.push(navigate('/equipment/[id]', id));
  }, [router, id]);

  // BUG-E02-C-07: a saved edit returns to the list it came from (FR-005), not the detail.
  const navigateToList = useCallback(() => {
    router.push(backToListHref);
  }, [router, backToListHref]);

  /**
   * Field-level rejections render inline under their field with no toast, so both mutations opt
   * out of the shared MutationCache toast and this raises the one toast for everything else — the
   * server's `userMessage`, never a fixed 「…失敗しました」 (BUG-E02-C-09).
   */
  const handleWriteError = async (error: unknown) => {
    const fieldError = getEquipmentFieldError(error);
    if (fieldError) {
      form.setError(fieldError.field, { type: 'server', message: fieldError.message });
      scrollToFirstError();
      return;
    }
    toast.error(resolveApiErrorMessage(error));

    if (isDeviceNotFoundError(error)) {
      // Deleted elsewhere: nothing left to edit. Leave without the discard prompt.
      invalidateEquipmentRosterCaches(queryClient);
      navigateAfterSave(navigateToList);
      return;
    }
    if (isDeviceConflictError(error)) {
      // Changed elsewhere: reload the current record into the form (PO-approved).
      invalidateEquipmentStatusCaches(queryClient, [id]);
      const fresh = await queryClient.fetchQuery(
        adminConnectedDeviceControllerDetailOptions({ path: { deviceId: id } }),
      );
      form.reset(equipmentDetailToFormValues(fresh));
    }
  };

  const patchMutation = useMutation({
    ...adminConnectedDeviceControllerUpdateMutation(),
    meta: { suppressErrorToast: true },
  });

  const usageControlMutation = useMutation({
    ...adminConnectedDeviceControllerPutUsageControlMutation(),
    meta: { suppressErrorToast: true },
  });

  const isSaving = patchMutation.isPending || usageControlMutation.isPending;

  // One save per submit: a queued second click must not re-send the PATCH / PUT.
  const { submitOnce } = useSubmitGuard(
    isSaving,
    patchMutation.isError || usageControlMutation.isError,
  );

  const handleSaved = () => {
    // 接続先接点制御装置 may have moved, so the device tab and 紐付き機器サマリー of both the
    // old and the new controller are stale as well.
    invalidateEquipmentStatusCaches(queryClient, [id]);
    toast.success('接続機器の変更を保存しました');
    navigateAfterSave(navigateToList);
  };

  /**
   * D4 — device fields go through PATCH (dirty fields only); the usage-control rule through
   * `PUT …/usage-control`, and only when it was edited. PATCH runs first so a rejected device edit
   * never leaves a half-applied rule.
   */
  const save = async (values: EquipmentFormSubmitValues) => {
    const patchBody = equipmentFormValuesToPatchBody(values, dirtyFields);
    let deviceSaved = false;

    try {
      if (Object.keys(patchBody).length > 0) {
        await patchMutation.mutateAsync({ path: { deviceId: id }, body: patchBody });
        deviceSaved = true;
      }
      if (isUsageControlDirty(dirtyFields, values.equipment_type)) {
        await usageControlMutation.mutateAsync({
          path: { deviceId: id },
          body: toUsageControlBody(values),
        });
      }
      handleSaved();
    } catch (error) {
      if (deviceSaved) {
        await handlePartialSave(error);
        return;
      }
      await handleWriteError(error);
    }
  };

  /**
   * The PATCH went through but the usage-control PUT did not: the device's own fields are already
   * saved. Say so, reload what the server holds into the form (the saved fields turn clean, so the
   * next save no longer re-sends the PATCH) and keep the rule the user typed dirty so only the PUT
   * is retried. The form stays open — leaving would drop the rule that was not saved.
   */
  const handlePartialSave = async (error: unknown) => {
    // A copy: `getValues` hands back the form's own object, which `reset` below rewrites.
    const typedRule = structuredClone(form.getValues('usage_control_rule'));
    const fieldError = getEquipmentFieldError(error);

    invalidateEquipmentStatusCaches(queryClient, [id]);
    toast.warning(
      '接続機器の基本情報は保存しましたが、利用制御ルールは保存されていません。内容を確認して、再度保存してください。',
      { description: resolveApiErrorMessage(error) },
    );

    try {
      const fresh = await queryClient.fetchQuery({
        ...adminConnectedDeviceControllerDetailOptions({ path: { deviceId: id } }),
        staleTime: 0,
      });
      form.reset(equipmentDetailToFormValues(fresh));
      // Field by field: the rule's checkboxes are separate controllers, and setting the parent
      // object leaves them rendering the reloaded value while the form holds the typed one.
      const dirty = { shouldDirty: true };
      form.setValue('usage_control_rule.main_enabled', typedRule.main_enabled, dirty);
      form.setValue('usage_control_rule.main_scope', typedRule.main_scope, dirty);
      form.setValue('usage_control_rule.main_contract_types', typedRule.main_contract_types, dirty);
      form.setValue('usage_control_rule.service_enabled', typedRule.service_enabled, dirty);
      form.setValue('usage_control_rule.service_types', typedRule.service_types, dirty);
    } catch {
      // Refetch failed: keep the form as typed rather than resetting to a stale record.
    }

    if (fieldError) {
      form.setError(fieldError.field, { type: 'server', message: fieldError.message });
      scrollToFirstError();
    }
  };

  const onSubmit = (values: EquipmentFormSubmitValues) => {
    if (!isDirty) return;
    submitOnce(() => void save(values));
  };

  const handleSubmit = form.handleSubmit(onSubmit, scrollToFirstError);

  const handleCancel = () => confirmDiscard(navigateToDetail);

  return (
    <Form {...form}>
      {/* BUG-E02-C-02: back link labelled as in the prototype (PO 2026-10-12). */}
      <PageHeader
        breadcrumb={
          <BackLink label="接続機器管理に戻る" onClick={() => confirmDiscard(navigateToList)} />
        }
        title="接続機器 編集"
      />

      <div className="mx-auto max-w-[960px] px-4 pt-4 pb-8">
        <form onSubmit={handleSubmit}>
          <EquipmentForm mode="edit" equipmentId={id} storeId={equipment.storeId} />
        </form>
      </div>

      <DeviceFormFooter
        submitLabel="更新"
        pendingLabel="保存中..."
        isPending={isSaving}
        submitDisabled={!isDirty}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    </Form>
  );
}

export default function EquipmentEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const backToListHref = useBackToListHref(navigate('/equipment'));

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminConnectedDeviceControllerDetailOptions({ path: { deviceId: id } }),
    enabled: Boolean(id),
  });

  const equipment = data;

  if (isLoading || isError || !equipment || !id) {
    // The back link stays reachable in the loading / error state too (BUG-E02-C-02).
    return (
      <>
        <PageHeader
          breadcrumb={<BackLink label="接続機器管理に戻る" href={backToListHref} />}
          title="接続機器 編集"
        />
        <DataStateBoundary
          isLoading={isLoading}
          isError={isError}
          isEmpty={!equipment}
          onRetry={() => refetch()}
          errorTitle="接続機器の取得に失敗しました"
        />
      </>
    );
  }

  return <EquipmentEditForm key={id} equipment={equipment} id={id} />;
}
