'use client';

import { useState } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';

import { useParams, useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BreadcrumbNav } from '@/components/common/breadcrumb-nav';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminLockerControllerAddImageMutation,
  adminLockerControllerDeleteImageMutation,
  adminLockerControllerGetLockerOptions,
  adminLockerControllerUpdateLockerMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LockerDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { LockerForm } from '../../_components/locker-form';
import { useLockerFormInvalidHandler } from '../../_hooks/use-locker-form-invalid-handler.hook';
import { useLockerLocationDuplicate } from '../../_hooks/use-locker-location-duplicate.hook';
import {
  type LockerFormSubmitValues,
  type LockerFormValues,
  lockerFormSchema,
} from '../../_schemas/locker-form.schema';
import {
  LOCKER_STALE_WRITE_MESSAGE,
  isLockerStaleWriteError,
} from '../../_utils/locker-error.util';
import {
  lockerDetailToFormValues,
  lockerFormValuesToUpdateBody,
} from '../../_utils/locker-form.util';
import { invalidateLockerQueries } from '../../_utils/locker-query-invalidation.util';

/** PATCH fields that regenerate the slot grid (API-100 §6.3 #3) */
const LOCKER_GRID_FIELDS = ['shapeType', 'orderType', 'slotStartNumber'] as const;

function LockerEditForm({ locker, id }: { locker: LockerDetailDto; id: string }) {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/lockers'));
  const withReturnTo = useWithReturnTo();
  const queryClient = useQueryClient();
  const handleInvalid = useLockerFormInvalidHandler();

  const form = useForm<LockerFormValues, unknown, LockerFormSubmitValues>({
    resolver: zodResolver(lockerFormSchema) as never,
    mode: 'onSubmit',
    defaultValues: lockerDetailToFormValues(locker),
  });

  const { isDirty, isSubmitted, errors } = useFormState({ control: form.control });
  const hasErrors = isSubmitted && Object.keys(errors).length > 0;
  const storeId = useWatch({ control: form.control, name: 'storeId' });
  const lockerLocationId = useWatch({ control: form.control, name: 'lockerLocationId' });

  // FR-001 異常系: a location already taken in the same store must not reach the API.
  // The locker's own location is excluded so editing without changing it stays valid.
  const isLocationDuplicate = useLockerLocationDuplicate({
    storeId,
    lockerLocationId,
    excludeLockerId: id,
  });

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);

  const updateMutation = useMutation({
    ...adminLockerControllerUpdateLockerMutation(),
    // Toasted below: a stale write gets its own copy (D9)
    meta: { suppressErrorToast: true },
  });
  // Image changes are reported together in one toast after the PATCH.
  const addImageMutation = useMutation({
    ...adminLockerControllerAddImageMutation(),
    meta: { suppressErrorToast: true },
  });
  const deleteImageMutation = useMutation({
    ...adminLockerControllerDeleteImageMutation(),
    meta: { suppressErrorToast: true },
  });
  const [isSyncingImages, setIsSyncingImages] = useState(false);
  // A photo still uploading to S3 is not in `images` yet — saving now would drop it
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const onSubmit = async (values: LockerFormSubmitValues) => {
    // A photo-only edit changes no cabinet field; the BE refuses an empty PATCH (400 E-VAL-001)
    const body = lockerFormValuesToUpdateBody(values, locker);
    const hasFieldChanges = Object.keys(body).some((key) => key !== 'expectedUpdatedAt');
    if (hasFieldChanges) {
      try {
        await updateMutation.mutateAsync({ path: { lockerId: id }, body });
      } catch (error) {
        // E-LOC-006 is also the reshape rule (a non-available slot blocks a grid change), so it only
        // reads as "someone else saved first" when this PATCH did not touch the grid
        const touchesGrid = LOCKER_GRID_FIELDS.some((field) => field in body);
        if (isLockerStaleWriteError(error) && !touchesGrid) {
          toast.error(LOCKER_STALE_WRITE_MESSAGE);
          // The refetched `updatedAt` remounts the form with the other user's values
          await invalidateLockerQueries(queryClient);
        } else {
          toast.error(resolveApiErrorMessage(error));
        }
        return;
      }
    }

    // `UpdateLockerDto` carries no images: new photos are added, removed ones deleted, by id.
    const keptImageIds = new Set(values.images.flatMap((image) => image.imageId ?? []));
    const added = values.images.filter((image) => !image.imageId);
    const removed = locker.images.filter((image) => !keptImageIds.has(image.id));

    setIsSyncingImages(true);
    const results = await Promise.allSettled([
      ...added.map((image) =>
        addImageMutation.mutateAsync({
          path: { lockerId: id },
          body: { imageS3Key: image.imageS3Key },
        }),
      ),
      ...removed.map((image) =>
        deleteImageMutation.mutateAsync({ path: { lockerId: id, imageId: image.id } }),
      ),
    ]);
    setIsSyncingImages(false);

    await invalidateLockerQueries(queryClient);
    if (results.some((result) => result.status === 'rejected')) {
      toast.error('ロッカー設備の変更を保存しましたが、一部の写真を反映できませんでした');
    } else {
      toast.success('ロッカー設備の変更を保存しました');
    }
    navigateAfterSave(() => router.push(navigate('/lockers/[id]', id)));
  };

  const isSaving = updateMutation.isPending || isSyncingImages;

  const runOnce = useInFlightGuard();
  const submitForm = form.handleSubmit(async (values) => {
    if (!isDirty || isLocationDuplicate) return;
    await onSubmit(values);
  }, handleInvalid);
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
            {
              url: withReturnTo(navigate('/lockers/[id]', id), backToListHref),
              label: 'ロッカー詳細',
            },
            { label: 'ロッカー設備 編集' },
          ]}
          variant="section"
          onNavigate={(url) => confirmDiscard(() => router.push(url))}
        />
      </div>

      <div className="mx-auto max-w-[960px] px-4 pt-4 pb-28">
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <LockerForm
              mode="edit"
              lockerId={id}
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
            onClick={() => confirmDiscard(() => router.push(navigate('/lockers/[id]', id)))}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!isDirty || isSaving || isUploadingPhoto || isLocationDuplicate}
            onClick={handleSubmit}
          >
            {isSaving ? '保存中...' : '変更を保存する'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LockerEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const {
    data: locker,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    ...adminLockerControllerGetLockerOptions({ path: { lockerId: id ?? '' } }),
    enabled: Boolean(id),
  });

  if (isLoading || isError || !locker || !id) {
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!locker}
        onRetry={() => refetch()}
        errorTitle="ロッカー情報の取得に失敗しました"
      />
    );
  }

  return <LockerEditForm key={`${id}-${locker.updatedAt}`} locker={locker} id={id} />;
}
