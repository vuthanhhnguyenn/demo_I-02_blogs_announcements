'use client';

import { useState } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Form } from '@/components/ui/form';

import {
  adminStoreControllerCreateMutation,
  adminStoreControllerListImagesQueryKey,
  adminStoreControllerListQueryKey,
  adminStoreControllerReplaceImagesMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { StoreForm } from '../_components/store-form';
import {
  StoreFormFooter,
  StoreFormNoAccess,
  StoreFormShell,
  hasValidationErrors,
} from '../_components/store-form-shell';
import {
  type StoreFormSubmitValues,
  type StoreFormValues,
  storeCreateFormSchema,
} from '../_schemas/store-form.schema';
import { STORE_ERROR_CODE, getStoreErrorCode } from '../_utils/store-api.util';
import {
  buildCreatePayload,
  buildPhotoItems,
  emptyStoreFormValues,
} from '../_utils/store-form.util';

/** D12 — the two refusals this screen can answer on a field instead of in the shared toast */
const DUPLICATE_CLUB_CODE_MESSAGE = 'この店舗コードは既に使用されています';
const UNKNOWN_FC_COMPANY_MESSAGE = '選択した運営企業が見つかりません';
/** FR-070c — spec-proposed copy */
const PHOTOS_NOT_SAVED_MESSAGE =
  '店舗は登録しましたが、写真の保存に失敗しました。編集画面から再度登録してください';

export default function StoreCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();
  const { hasPermission, isLoading: isAuthLoading } = useAuthUser();

  const form = useForm<StoreFormValues, unknown, StoreFormSubmitValues>({
    // The create schema adds FR-044's weekly-hours rule (the table is editable only here) and the
    // 開店日/閉店日 order (Y-02 Bug No.19)
    resolver: zodResolver(storeCreateFormSchema),
    mode: 'onSubmit',
    defaultValues: emptyStoreFormValues(),
  });

  const { isDirty, errors } = useFormState({ control: form.control });
  const photos = useWatch({ control: form.control, name: 'photos' }) ?? [];
  const photosUploading = photos.some((photo) => photo.status === 'uploading');
  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);

  const goToList = () => router.push(navigate('/stores'));
  const leave = () => confirmDiscard(goToList);
  const backToListHref = useBackToListHref(navigate('/stores'));

  // FR-060 / BUG-U2-02 — clicks landing in the same tick before `isPending` re-renders the button
  // disabled each fired a POST. The guard spans the whole save, the photo PUT in `onSuccess`
  // included, and `isLeaving` keeps the button inert while the list route loads.
  const runSave = useInFlightGuard();
  const [isLeaving, setIsLeaving] = useState(false);

  /**
   * FR-059b — the photo list can only be written against an existing store, so it is a second
   * request after the POST. Its failure is reported with this screen's own wording (FR-070c), so
   * the shared MutationCache toast is suppressed for it.
   */
  const replaceImagesMutation = useMutation({
    ...adminStoreControllerReplaceImagesMutation(),
    meta: { suppressErrorToast: true },
  });

  /**
   * The store row and its weekly set are one request (decision D11 / FR-046) — `CreateStoreDto`
   * carries `businessHours` and `closedAt` since the 2026-10-02 regen.
   */
  const createMutation = useMutation({
    ...adminStoreControllerCreateMutation(),
    onSuccess: async (created) => {
      const photoBody = buildPhotoItems(form.getValues('photos'));
      let photosSaved = true;
      if (photoBody.items.length > 0) {
        try {
          await replaceImagesMutation.mutateAsync({ path: { id: created.id }, body: photoBody });
          await queryClient.invalidateQueries({
            queryKey: adminStoreControllerListImagesQueryKey({ path: { id: created.id } }),
          });
        } catch {
          // FR-070c — the store is kept (no rollback); the operator re-adds the photos from the
          // edit screen
          photosSaved = false;
        }
      }

      // FR-104: clearing the dirty state before navigating keeps the discard dialog away
      form.reset(form.getValues());
      setIsLeaving(true);
      await queryClient.invalidateQueries({ queryKey: adminStoreControllerListQueryKey() });
      if (photosSaved) {
        toast.success('店舗を登録しました');
      } else {
        toast.error(PHOTOS_NOT_SAVED_MESSAGE);
      }
      navigateAfterSave(goToList);
    },
    // D12: matched on `ErrorResponseDto.code`, never on the Japanese message. Everything else is
    // left to the shared MutationCache `onError`, which already toasts the server's `userMessage`
    // (`src/providers/react-query.provider.tsx`) — toasting again here would double it.
    onError: (error) => {
      const code = getStoreErrorCode(error);
      // 409 — the club code is a unique key (FR-070)
      if (code === STORE_ERROR_CODE.duplicateClubCode) {
        form.setError('club_code', { type: 'server', message: DUPLICATE_CLUB_CODE_MESSAGE });
        scrollToFirstError();
        return;
      }
      // 404 — the chosen FC company no longer exists (deleted between load and save)
      if (code === STORE_ERROR_CODE.unknownFcCompany) {
        form.setError('fc_company_id', { type: 'server', message: UNKNOWN_FC_COMPANY_MESSAGE });
        scrollToFirstError();
      }
    },
  });

  const submit = form.handleSubmit((values) => {
    // FR-059c — the button is disabled meanwhile; this also covers an Enter-key submit
    if (photosUploading || isLeaving) return;
    void runSave(() =>
      createMutation
        .mutateAsync({ body: buildCreatePayload(values) })
        // A refusal is already answered by `onError` and the shared MutationCache toast
        .catch(() => undefined),
    );
  }, scrollToFirstError);

  // Wait for the auth context before deciding access, so the permission wall never flashes
  // over a user who does hold the role (`useCurrentUser` resolves after the first render).
  if (isAuthLoading) {
    return (
      <StoreFormShell mode="create">
        <DataStateBoundary isLoading isEmpty={false} />
      </StoreFormShell>
    );
  }

  // Y-02 permission matrix L196 (System / Headquarter) is expressed as `stores.create`, the same
  // permission `PAGE_PERMISSIONS` gates this route with — one source of truth, so a 職位 rule added
  // to it later cannot let the page render while the sidebar and the list's 新規登録 button refuse.
  if (!hasPermission(Permission.StoresCreate)) {
    return <StoreFormNoAccess mode="create" />;
  }

  return (
    <>
      <StoreFormShell
        mode="create"
        onBack={() => confirmDiscard(() => router.push(backToListHref))}
      >
        <Form {...form}>
          <form noValidate onSubmit={submit}>
            <StoreForm mode="create" restricted={false} />
          </form>
        </Form>
        <StoreFormFooter
          mode="create"
          hasErrors={hasValidationErrors(errors)}
          restricted={false}
          submitting={createMutation.isPending || replaceImagesMutation.isPending || isLeaving}
          photosUploading={photosUploading}
          onCancel={leave}
          onSubmit={submit}
        />
      </StoreFormShell>
    </>
  );
}
