'use client';

import { useState } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BreadcrumbNav } from '@/components/common/breadcrumb-nav';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

import {
  adminLockerControllerCreateLockerMutation,
  adminLockerControllerUpdateSlotMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { LockerForm } from '../_components/locker-form';
import { useLockerFormInvalidHandler } from '../_hooks/use-locker-form-invalid-handler.hook';
import { useLockerLocationDuplicate } from '../_hooks/use-locker-location-duplicate.hook';
import {
  type LockerFormSubmitValues,
  type LockerFormValues,
  lockerFormSchema,
} from '../_schemas/locker-form.schema';
import {
  emptyLockerFormDefaults,
  lockerFormValuesToCreateBody,
  slotLockOverridesToPatches,
} from '../_utils/locker-form.util';
import { invalidateLockerQueries } from '../_utils/locker-query-invalidation.util';

export default function LockerCreatePage() {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/lockers'));
  const queryClient = useQueryClient();
  const handleInvalid = useLockerFormInvalidHandler();

  const form = useForm<LockerFormValues, unknown, LockerFormSubmitValues>({
    resolver: zodResolver(lockerFormSchema) as never,
    mode: 'onSubmit',
    defaultValues: emptyLockerFormDefaults,
  });

  const { isDirty, isSubmitted, errors } = useFormState({ control: form.control });
  const hasErrors = isSubmitted && Object.keys(errors).length > 0;
  const storeId = useWatch({ control: form.control, name: 'storeId' });
  const lockerLocationId = useWatch({ control: form.control, name: 'lockerLocationId' });

  // FR-001 異常系: a location already taken in the same store must not reach the API (409 E-LOC-005).
  const isLocationDuplicate = useLockerLocationDuplicate({ storeId, lockerLocationId });

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);

  const createMutation = useMutation(adminLockerControllerCreateLockerMutation());
  // D14: the per-slot overrides are reported together in one toast, not one per failed slot.
  const updateSlotMutation = useMutation({
    ...adminLockerControllerUpdateSlotMutation(),
    meta: { suppressErrorToast: true },
  });
  const [isApplyingOverrides, setIsApplyingOverrides] = useState(false);
  // A photo still uploading to S3 is not in `images` yet — registering now would drop it
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const onSubmit = async (values: LockerFormSubmitValues) => {
    if (isLocationDuplicate) return;

    let created;
    try {
      created = await createMutation.mutateAsync({ body: lockerFormValuesToCreateBody(values) });
    } catch {
      // The shared MutationCache toast shows the API's userMessage (e.g. 409 E-LOC-005).
      return;
    }

    const patches = slotLockOverridesToPatches(values, created.slots);
    setIsApplyingOverrides(true);
    const results = await Promise.allSettled(
      patches.map(({ slotId, body }) => updateSlotMutation.mutateAsync({ path: { slotId }, body })),
    );
    setIsApplyingOverrides(false);

    const failedSlotCodes = patches
      .filter((_, index) => results[index].status === 'rejected')
      .map(({ slotCode }) => slotCode);

    await invalidateLockerQueries(queryClient);
    if (failedSlotCodes.length > 0) {
      toast.error(
        `ロッカー設備を登録しましたが、スロット個別設定を反映できませんでした（${failedSlotCodes.join('、')}）。詳細画面のスロット管理から設定してください`,
      );
    } else {
      toast.success('ロッカー設備を登録しました');
    }
    navigateAfterSave(() => router.push(navigate('/lockers/[id]', created.id)));
  };

  const isSaving = createMutation.isPending || isApplyingOverrides;

  // Same-tick clicks would each pass `disabled={isSaving}` and POST a cabinet (BUG-E01-03)
  const runOnce = useInFlightGuard();
  const submitForm = form.handleSubmit(onSubmit, handleInvalid);
  const handleSubmit = (event?: React.BaseSyntheticEvent) => {
    // Enter in a field submits too, not only the disabled button
    if (isUploadingPhoto) {
      event?.preventDefault();
      return;
    }
    return runOnce(() => submitForm(event));
  };

  return (
    <div>
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <BreadcrumbNav
          items={[
            { url: backToListHref, label: 'ロッカー管理' },
            { label: 'ロッカー設備 新規登録' },
          ]}
          variant="section"
          onNavigate={(url) => confirmDiscard(() => router.push(url))}
        />
      </div>

      <div className="mx-auto max-w-[960px] px-4 pt-4 pb-28">
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <LockerForm
              mode="create"
              onOpenStoreMap={(href) => confirmDiscard(() => router.push(href))}
              onUploadingChange={setIsUploadingPhoto}
            />
          </form>
        </Form>
      </div>

      <div className="bg-background/95 fixed right-0 bottom-0 left-0 border-t px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[960px] items-center justify-end gap-2">
          {hasErrors ? (
            <p className="text-destructive mr-auto text-xs">未入力の項目があります</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => confirmDiscard(() => router.push(navigate('/lockers')))}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={isSaving || isUploadingPhoto || isLocationDuplicate}
            onClick={handleSubmit}
          >
            {isSaving ? '登録中...' : '登録する'}
          </Button>
        </div>
      </div>
    </div>
  );
}
