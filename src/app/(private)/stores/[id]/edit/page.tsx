'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type UseFormReturn, useForm, useFormState, useWatch } from 'react-hook-form';

import { useParams, useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form } from '@/components/ui/form';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminStoreControllerDetailOptions,
  adminStoreControllerDetailQueryKey,
  adminStoreControllerGetBusinessHoursOptions,
  adminStoreControllerGetBusinessHoursQueryKey,
  adminStoreControllerListImagesOptions,
  adminStoreControllerListImagesQueryKey,
  adminStoreControllerListQueryKey,
  adminStoreControllerReplaceImagesMutation,
  adminStoreControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { AdminStoreControllerListImagesResponse } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission, UserRole } from '@/types/permission.type';

import { STORE_CODE_CHANGE_WARNING, StoreForm } from '../../_components/store-form';
import {
  StoreFormFooter,
  StoreFormNoAccess,
  StoreFormShell,
  hasValidationErrors,
} from '../../_components/store-form-shell';
import { STORE_STATUS_LABELS } from '../../_constants/constants';
import {
  type StoreFormSubmitValues,
  type StoreFormValues,
  type StorePhotoDraft,
  storeFormSchema,
  storeFormWithHoursRuleSchema,
  withOpeningClosingOrderRule,
} from '../../_schemas/store-form.schema';
import {
  STORE_ERROR_CODE,
  getStoreErrorCode,
  isStoreForbiddenError,
} from '../../_utils/store-api.util';
import {
  buildPhotoItems,
  buildUpdatePayload,
  photosChanged,
  toPhotoDrafts,
  toStoreFormValues,
} from '../../_utils/store-form.util';

/**
 * Y-02 permission matrix L197: edit basic info (all fields).
 *
 * Only the *field-level* split lives here. Whether the screen opens at all is `stores.edit`,
 * the permission `PAGE_PERMISSIONS` gates `/stores/:id/edit` with, so the route guard, the list's
 * 編集 action and this page all read the same answer — 職位 flags included.
 */
const FULL_EDIT_ROLES = [UserRole.System, UserRole.Headquarter] as const;

/** D12 — the refusals this screen answers on a field instead of only in the shared toast */
const DUPLICATE_CLUB_CODE_MESSAGE = 'この店舗コードは既に使用されています';
/**
 * 422 `E-STR-006` on this PATCH can only be the brand: the form never sends `status` (FR-071), and
 * the backend's own copy for the code talks about a status change (BUG-U2-06). The store left
 * 準備中 after this form was loaded, so its new status is not known here and is not named.
 */
const BRAND_TRANSITION_MESSAGE =
  'この店舗は開業準備中ではなくなったため、ブランドを変更できません（開業準備中のみ変更可）';

/**
 * FR-070a — an edit save can be two writes, issued one after the other and stopping at the first
 * failure (integration plan §5): the store row first, then the photo list. A failed row write is
 * reported once by the PATCH's own `onError`, and the photo list is then not written at all. A
 * failed photo write after a saved row is reported here; the row stops being dirty and the photos
 * stay dirty for a retry. The photo write's shared toast is suppressed, so this is its only report.
 */
const PHOTOS_NOT_SAVED_MESSAGE = '写真の保存に失敗しました。もう一度保存してください';
const ROW_SAVED_PHOTOS_NOT_SAVED_MESSAGE =
  '店舗情報は保存しましたが、写真の保存に失敗しました。もう一度保存してください';
/**
 * BUG-U2-04 — the photo write is a full-set replace, so it must never run from a list that was not
 * seeded from the stored photos: it would delete every photo the form never showed.
 */
const PHOTOS_NOT_LOADED_MESSAGE =
  '店舗写真を読み込めていないため保存できません。写真を再読み込みしてからもう一度保存してください';

/** The detail screen's gallery 編集 deep-links here with this hash (`/stores/{id}/edit#photos`) */
const PHOTOS_ANCHOR = 'photos';

export default function StoreEditPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const scrollToFirstError = useScrollToFirstError();
  const { hasRole, hasPermission, isLoading: isAuthLoading } = useAuthUser();

  const canEdit = hasPermission(Permission.StoresEdit);
  // L198 gives Staff the limited field set; the role tier is what separates the two modes, while
  // `canEdit` above decides admission.
  const isFullEditor = hasRole(FULL_EDIT_ROLES);
  // FR-083/FR-084: Staff see the whole form but may only touch name, address and phone — the
  // client's whitelist of 2026-08-24 leaves 店舗名（カナ）out
  const restricted = canEdit && !isFullEditor;

  const storeQuery = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id } }),
    enabled: Boolean(id) && !isAuthLoading && canEdit,
  });
  /** The weekly table's stored rows — also the source of the staff windows the save carries over */
  const hoursQuery = useQuery({
    ...adminStoreControllerGetBusinessHoursOptions({ path: { id } }),
    enabled: Boolean(id) && !isAuthLoading && canEdit,
  });

  /**
   * FR-056 — the photo list is read on its own and never holds the form back: a slow or failed
   * read shows inside the 店舗写真 card only.
   */
  const imagesQuery = useQuery({
    ...adminStoreControllerListImagesOptions({ path: { id } }),
    enabled: Boolean(id) && !isAuthLoading && canEdit,
  });

  const store = storeQuery.data;
  const businessHours = hoursQuery.data?.items;
  const loadedPhotos = useMemo(() => toPhotoDrafts(imagesQuery.data?.items), [imagesQuery.data]);

  const defaultValues = useMemo<StoreFormValues | undefined>(
    () => (store ? toStoreFormValues(store, businessHours) : undefined),
    [store, businessHours],
  );

  /**
   * FR-044's weekly-hours rule applies only once the operator has touched the table or 祝日の扱い
   * (see `storeFormWithHoursRuleSchema`): an untouched table is not sent, so it must not block the
   * save. Dirtiness is settled before RHF validates, on change and on submit alike.
   */
  // Annotated: the resolver reads `form` itself, which TypeScript cannot infer through
  const form: UseFormReturn<StoreFormValues, unknown, StoreFormSubmitValues> = useForm<
    StoreFormValues,
    unknown,
    StoreFormSubmitValues
  >({
    resolver: (values, context, options) => {
      const hoursTouched =
        form.getFieldState('default_hours').isDirty || form.getFieldState('holiday_mode').isDirty;
      const schema = hoursTouched ? storeFormWithHoursRuleSchema : storeFormSchema;
      // Y-02 Bug No.19 — only a changed date is checked (see `withOpeningClosingOrderRule`)
      const datesTouched =
        form.getFieldState('grand_open_date').isDirty || form.getFieldState('closing_date').isDirty;
      return zodResolver(datesTouched ? withOpeningClosingOrderRule(schema) : schema)(
        values,
        context,
        options,
      );
    },
    mode: 'onSubmit',
    defaultValues,
  });

  /**
   * BUG-U2-04 — which photo-list read (`dataUpdatedAt`) the form's `photos` field was seeded from;
   * `null` while the field still holds the empty placeholder. Until it is set the 店舗写真 card
   * stays in its loading/error state and a save may not write the photo list.
   */
  const [photosSeededAt, setPhotosSeededAt] = useState<number | null>(null);
  const photosReady = photosSeededAt !== null;
  /**
   * BUG-U2-15 — the same marker, readable in the commit that set it. When the business hours and
   * the photo list land in one render, the reset below seeds both and the photo effect runs right
   * after it; the state above still reads `null` there, so the photo effect re-seeded — from
   * `form.formState.defaultValues`, which is the previous render's snapshot (the store without its
   * hours). The weekly table came up blank, and a save then replaced the stored week with it.
   */
  const photosSeededAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!defaultValues) return;
    // Read from the cache rather than a dependency, so the photo list arriving re-seeds only its
    // own field (below) instead of resetting what the operator has typed meanwhile
    const cachedImages = queryClient.getQueryState<AdminStoreControllerListImagesResponse>(
      adminStoreControllerListImagesQueryKey({ path: { id } }),
    );
    form.reset({ ...defaultValues, photos: toPhotoDrafts(cachedImages?.data?.items) });
    const seededAt = cachedImages?.data ? cachedImages.dataUpdatedAt : null;
    photosSeededAtRef.current = seededAt;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- records what the reset above seeded
    setPhotosSeededAt(seededAt);
  }, [defaultValues, form, queryClient, id]);

  const {
    isDirty,
    dirtyFields,
    errors,
    defaultValues: formDefaults,
  } = useFormState({ control: form.control });
  // Set once the reset above has carried the loaded store into the form
  const isFormSeeded = formDefaults?.club_code !== undefined;

  /**
   * BUG-U2-04 — the photo list landing after the store (a cold load where the images GET is the
   * slower read, or 再読み込み after it failed) seeds the `photos` field then. `resetField` cannot
   * do it: `photos` is never a registered input (the card drives it through `setValue`), and RHF's
   * `resetField` silently ignores unregistered names — the form kept its empty list and the next
   * save replaced the store's photos with only the new ones.
   *
   * `keepDirtyValues` re-bases the defaults and replaces only fields the operator has not touched,
   * so whatever was typed into the rest of the form meanwhile survives. A photo list the operator
   * has already edited is never overwritten.
   */
  const seedPhotos = useCallback(
    (photos: StorePhotoDraft[]) => {
      form.reset(
        { ...(form.formState.defaultValues as StoreFormValues), photos },
        {
          keepDirtyValues: true,
          keepDirty: true,
          keepErrors: true,
          keepTouched: true,
          keepIsSubmitted: true,
          keepSubmitCount: true,
        },
      );
    },
    [form],
  );

  useEffect(() => {
    if (!isFormSeeded || !imagesQuery.isSuccess) return;
    if (photosSeededAtRef.current === imagesQuery.dataUpdatedAt) return;
    if (form.getFieldState('photos').isDirty) return;
    seedPhotos(loadedPhotos);
    photosSeededAtRef.current = imagesQuery.dataUpdatedAt;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- records what `seedPhotos` seeded
    setPhotosSeededAt(imagesQuery.dataUpdatedAt);
  }, [
    isFormSeeded,
    imagesQuery.isSuccess,
    imagesQuery.dataUpdatedAt,
    loadedPhotos,
    seedPhotos,
    form,
  ]);
  // The code the form was last reset to — the loaded one, or the one a partial save just stored
  // (the detail query is not refetched while this screen is open, see `save`)
  const loadedClubCode = formDefaults?.club_code ?? store?.clubCode ?? '';
  // `useWatch` is undefined until the form's first reset — a direct load of this URL renders
  // before the store query has filled the form
  const currentPhotos = useWatch({ control: form.control, name: 'photos' }) ?? [];
  const photosUploading = currentPhotos.some((photo) => photo.status === 'uploading');

  // FR-061b — the confirm dialog names the old and new codes
  const [pendingCodeChange, setPendingCodeChange] = useState<{
    values: StoreFormSubmitValues;
    from: string;
    to: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Set on a full save: the button stays inert while the list route loads
  const [isLeaving, setIsLeaving] = useState(false);
  // FR-060 / BUG-U2-02 — clicks landing in the same tick, before `isSaving` has re-rendered the
  // button disabled, each fired a PATCH. The guard spans the whole save pipeline.
  const runSave = useInFlightGuard();

  // The detail gallery's 編集 lands on the 店舗写真 card once the form has rendered — i.e. once
  // both reads the loading boundary below waits for have succeeded
  const hasForm = Boolean(store) && hoursQuery.isSuccess && !storeQuery.isError;
  useEffect(() => {
    if (!hasForm || window.location.hash !== `#${PHOTOS_ANCHOR}`) return;
    document.getElementById(PHOTOS_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hasForm]);

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);

  const goToList = () => router.push(navigate('/stores'));
  const leave = () => confirmDiscard(goToList);
  const backToListHref = useBackToListHref(navigate('/stores'));

  const patchMutation = useMutation({
    ...adminStoreControllerUpdateMutation(),
    // The shared MutationCache toast is suppressed so the one toast per failure can carry this
    // screen's wording for `E-STR-006` (BUG-U2-06); every other refusal — the `E-AUTH-103` a
    // `staff` caller currently gets (B10) included — is toasted with the server's own wording,
    // exactly as the MutationCache would (`src/providers/react-query.provider.tsx`).
    meta: { suppressErrorToast: true },
    // D12: matched on `ErrorResponseDto.code`
    onError: (error) => {
      const code = getStoreErrorCode(error);
      // 409 — the club code is a unique key (FR-070)
      if (code === STORE_ERROR_CODE.duplicateClubCode) {
        form.setError('club_code', { type: 'server', message: DUPLICATE_CLUB_CODE_MESSAGE });
        scrollToFirstError();
      }
      // 422 — brand transition refused (D2). The form already disables the brand selects outside
      // `preparing`, so this is the belt to that braces: a store whose status changed elsewhere
      // since this form was loaded.
      if (code === STORE_ERROR_CODE.transitionRefused) {
        form.setError('brand_group', { type: 'server', message: BRAND_TRANSITION_MESSAGE });
        scrollToFirstError();
        toast.error(BRAND_TRANSITION_MESSAGE);
        return;
      }
      toast.error(resolveApiErrorMessage(error));
    },
  });

  /** FR-059a / FR-059f — the only photo write: the full-set replace, never the per-photo calls */
  const replaceImagesMutation = useMutation({
    ...adminStoreControllerReplaceImagesMutation(),
    meta: { suppressErrorToast: true },
  });

  /**
   * Up to two writes, issued one after the other: `PATCH` for the store row when one of its fields
   * is dirty, then `PUT …/images` when the photo list changed (FR-059a). Each is skipped when it
   * has nothing to say, and the pipeline stops at the first failure (integration plan §5,
   * BUG-U2-13) — a refused store row never lets the photo list through.
   *
   * The weekly hours ride the PATCH as `businessHours` (B13), in the same transaction as the row.
   */
  const save = async (values: StoreFormSubmitValues) => {
    const loaded = (formDefaults?.photos ?? []) as StorePhotoDraft[];
    const sendPhotos = photosChanged(loaded, values.photos);
    const sendRow = Object.keys(dirtyFields).some((field) => field !== 'photos');
    if (!sendPhotos && !sendRow) return;

    // BUG-U2-04 — the belt to the seeding effect's braces: never replace the stored set from a list
    // that was not loaded from it. Nothing is written, so no half of the save lands.
    if (sendPhotos && !photosReady) {
      toast.error(PHOTOS_NOT_LOADED_MESSAGE);
      return;
    }

    setIsSaving(true);
    try {
      if (sendRow) {
        try {
          await patchMutation.mutateAsync({
            path: { id },
            body: buildUpdatePayload(values, {
              restricted,
              dirtyFields,
              storedHours: businessHours,
            }),
          });
        } catch {
          // Reported once by the PATCH's `onError`; the photo list is not written (BUG-U2-13)
          return;
        }
        // The store is marked stale but not refetched here: on full success this screen is on its
        // way to the list, so the response would land in a page nobody sees. `refetchType: none`
        // rather than simply invalidating after the navigation, because `router.push` keeps the
        // current route mounted — and its queries active — until the next one is ready. The
        // detail screen fetches it fresh the next time it is opened; the list, inactive here,
        // refetches as it mounts because the same staleness marking beats its `staleTime`.
        void queryClient.invalidateQueries({
          queryKey: adminStoreControllerDetailQueryKey({ path: { id } }),
          refetchType: 'none',
        });
        void queryClient.invalidateQueries({ queryKey: adminStoreControllerListQueryKey() });
        // Read by the 営業設定 tab; not refetched here for the same reason as the detail above
        void queryClient.invalidateQueries({
          queryKey: adminStoreControllerGetBusinessHoursQueryKey({ path: { id } }),
          refetchType: 'none',
        });
      }

      if (sendPhotos) {
        try {
          await replaceImagesMutation.mutateAsync({
            path: { id },
            body: buildPhotoItems(values.photos),
          });
        } catch {
          // FR-070a — the row that landed stops being dirty; the photos keep their loaded default
          // and so stay dirty for the retry
          if (sendRow) {
            const current = form.getValues();
            form.reset({ ...current, photos: loaded });
            form.setValue('photos', current.photos, { shouldDirty: true });
          }
          toast.error(sendRow ? ROW_SAVED_PHOTOS_NOT_SAVED_MESSAGE : PHOTOS_NOT_SAVED_MESSAGE);
          return;
        }
        // FR-059d / FR-059e — ids are new on every PUT, so the list is re-read rather than kept
        void queryClient.invalidateQueries({
          queryKey: adminStoreControllerListImagesQueryKey({ path: { id } }),
        });
      }

      // FR-104: drop the dirty state before navigating so no discard dialog appears
      form.reset(form.getValues());
      setIsLeaving(true);
      toast.success('店舗の変更を保存しました');
      navigateAfterSave(goToList);
    } finally {
      setIsSaving(false);
    }
  };

  const submit = form.handleSubmit((values) => {
    // FR-059c — the button is disabled meanwhile; this also covers an Enter-key submit
    if (!isDirty || photosUploading || isLeaving) return;
    // FR-061b — a changed store code is confirmed first (trimmed comparison, as FR-061c)
    if (values.club_code.trim() !== loadedClubCode) {
      setPendingCodeChange({ values, from: loadedClubCode, to: values.club_code.trim() });
      return;
    }
    void runSave(() => save(values));
  }, scrollToFirstError);

  const confirmCodeChange = () => {
    if (!pendingCodeChange) return;
    const { values } = pendingCodeChange;
    setPendingCodeChange(null);
    void runSave(() => save(values));
  };

  // The role is only known once the auth context has resolved; deciding before that would
  // flash the permission wall at a user who is allowed in.
  if (isAuthLoading) {
    return (
      <StoreFormShell mode="edit">
        <DataStateBoundary isLoading isEmpty={false} />
      </StoreFormShell>
    );
  }

  // The app's route guard already turns Manager / Trainer / Observer away; this is the
  // screen-level statement of the same Y-02 rule.
  if (!canEdit) {
    return <StoreFormNoAccess mode="edit" />;
  }

  // A Staff deep-linking a store outside their scope passes the route guard but is refused by
  // the API. That is a permission answer, not a failed read, so it gets the wall rather than
  // the retry state (spec 028 Edge Cases, FR-081). Keyed off `E-AUTH-100` / `E-AUTH-103` (D12).
  // The photo read is left out: its failure stays inside the 店舗写真 card (FR-056)
  const isForbidden = [storeQuery.error, hoursQuery.error].some((error) =>
    isStoreForbiddenError(error),
  );
  if (isForbidden) {
    return <StoreFormNoAccess mode="edit" />;
  }

  // `useForm` reads `defaultValues` only on its first render, and the store usually lands later,
  // so until the reset effect above has run the form is still empty. Keep the loading state up
  // until the form's own defaults carry the loaded store, rather than mounting `StoreForm` on
  // undefined fields (a direct load / reload crashed on `club_code.trim()`).
  const isLoading = storeQuery.isLoading || hoursQuery.isLoading || (!!store && !isFormSeeded);
  const isError = storeQuery.isError || hoursQuery.isError;

  if (isLoading || isError || !store) {
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!store}
        onRetry={() => {
          void storeQuery.refetch();
          void hoursQuery.refetch();
        }}
        errorTitle="店舗情報の取得に失敗しました"
      />
    );
  }

  return (
    <>
      <StoreFormShell mode="edit" onBack={() => confirmDiscard(() => router.push(backToListHref))}>
        <Form {...form}>
          <form noValidate onSubmit={submit}>
            <StoreForm
              mode="edit"
              restricted={restricted}
              // D2 — `brandEnum` is editable only while the store is `preparing` (else E-STR-006)
              brandLocked={store.status !== 'preparing'}
              brandLockedStatusLabel={STORE_STATUS_LABELS[store.status]}
              loadedClubCode={loadedClubCode}
              // BUG-U2-04 — the card holds its loading/error state until the field has actually
              // been seeded from the read, so nothing can be added to an unloaded list
              photos={{
                isLoading: imagesQuery.isLoading || (imagesQuery.isSuccess && !photosReady),
                isError: imagesQuery.isError && !photosReady,
                onRetry: () => void imagesQuery.refetch(),
              }}
            />
          </form>
        </Form>
        <StoreFormFooter
          mode="edit"
          hasErrors={hasValidationErrors(errors)}
          restricted={restricted}
          submitting={isSaving || isLeaving}
          submitDisabled={!isDirty}
          photosUploading={photosUploading}
          onCancel={leave}
          onSubmit={submit}
        />
      </StoreFormShell>

      {/* FR-061b — prototype `store-form.tsx` L576-L590. Cancel keeps the typed code and the dirty state. */}
      <AlertDialog
        open={pendingCodeChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCodeChange(null);
        }}
      >
        {/* LV-10 / BUG-U2-10 — two unbroken 50-char codes must wrap inside the panel rather than
            widen its grid track and push the footer buttons out of it */}
        <AlertDialogContent className="grid-cols-[minmax(0,1fr)]">
          <AlertDialogHeader className="min-w-0">
            <AlertDialogTitle className="min-w-0 [overflow-wrap:anywhere]">
              店舗コードを {pendingCodeChange?.from} から {pendingCodeChange?.to} に変更しますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="min-w-0 [overflow-wrap:anywhere]">
              {STORE_CODE_CHANGE_WARNING}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCodeChange}>変更して保存する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
