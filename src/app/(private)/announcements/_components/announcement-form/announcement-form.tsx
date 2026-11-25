'use client';

// Client component: react-hook-form state, mutations, router navigation and the leave guard.
import { useEffect, useMemo, useState } from 'react';
import {
  type Control,
  type UseFormResetField,
  useController,
  useForm,
  useWatch,
} from 'react-hook-form';

import { useRouter } from 'next/navigation';

import {
  ANNOUNCEMENT_FORM_BACK_LABEL,
  ANNOUNCEMENT_FORM_EDIT_NOTICE,
  ANNOUNCEMENT_PREVIEW_BODY_PLACEHOLDER,
  ANNOUNCEMENT_PREVIEW_TITLE_PLACEHOLDER,
  ANNOUNCEMENT_PUBLISH_METHOD_OPTIONS,
  ANNOUNCEMENT_SAVE_LABELS,
  ANNOUNCEMENT_SAVE_SUCCESS_TOASTS,
  ANNOUNCEMENT_WIDE_SCOPE_ROLES,
} from '@/app/(private)/announcements/_constants/announcement-form.constants';
import {
  announcementDetailToFormValues,
  announcementFormToCreateBody,
  announcementFormToUpdateBody,
  publishMethodFromStatus,
  toLoadedPublish,
} from '@/app/(private)/announcements/_schemas/announcement-form.mapper';
import {
  type AnnouncementFormValues,
  createAnnouncementFormSchema,
  hasBodyText,
} from '@/app/(private)/announcements/_schemas/announcement-form.schema';
import { useBlogTargetStores } from '@/app/(private)/blogs/_hooks/use-blog-target-stores.hook';
import type {
  BlogDetail,
  BlogOperator,
  BlogPublishMethodOption,
} from '@/app/(private)/blogs/_types/blog.type';
import { useAuthUser } from '@/contexts/auth-user.context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useImageUpload } from '@/hooks/use-image-upload.hook';
import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  getCrmNoticesByIdQueryKey,
  getCrmNoticesQueryKey,
  patchCrmNoticesByIdMutation,
  postCrmNoticesMutation,
} from '@/lib/api/@tanstack/react-query.gen';
import { ArticleCategoryType } from '@/lib/api/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { AnnouncementPreviewDialog } from '../announcement-preview-dialog';
import { AnnouncementBodyEditor } from './sections/announcement-body-editor';
import { AnnouncementCategoryField } from './sections/announcement-category-field';
import { AnnouncementContentSection } from './sections/announcement-content-section';
import { AnnouncementFormActions } from './sections/announcement-form-actions';
import { AnnouncementPublishSection } from './sections/announcement-publish-section';
import { AnnouncementReachCard } from './sections/announcement-reach-card';
import { AnnouncementTargetSection } from './sections/announcement-target-section';

/** Preview URL slug of an announcement that has no id yet (prototype L585: …/news/new). */
const NEW_ARTICLE_PREVIEW_ID = 'new';
/** 本文 images: same PNG / JPG ≤ 5MB rule as the thumbnail. */
const BODY_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;
const BODY_IMAGE_MAX_SIZE_MB = 5;

const { now, scheduled, draft, keepUnpublished } = ANNOUNCEMENT_PUBLISH_METHOD_OPTIONS;
const CREATE_PUBLISH_OPTIONS: readonly BlogPublishMethodOption[] = [now, scheduled, draft];
/** Research F6: a 非公開 article gets 非公開のまま保存 first (and preselected). */
const UNPUBLISHED_PUBLISH_OPTIONS: readonly BlogPublishMethodOption[] = [
  keepUnpublished,
  now,
  scheduled,
  draft,
];

interface AnnouncementFormProps {
  mode: 'create' | 'edit';
  /** Page title — 「お知らせ新規登録」 / 「お知らせ編集」 (FR-001). */
  title: string;
  defaultValues: AnnouncementFormValues;
  /** Edit mode: the article as loaded (its `updatedAt` is the optimistic-lock token). */
  detail?: BlogDetail;
  /** Edit mode: refetches the article for the 409 「最新の内容を読み込む」 action. */
  onReloadDetail?: () => Promise<BlogDetail | null>;
}

/**
 * お知らせ create / edit form (specs/announcement-form). Copied from the blog form (research R1,
 * approach 3 — the blog form is not changed) and adapted to prototype announcement-form.tsx@47d60ac.
 * Renders the page header too, because its back link has to go through the form's discard guard.
 */
export function AnnouncementForm({
  mode,
  title,
  defaultValues,
  detail,
  onReloadDetail,
}: Readonly<AnnouncementFormProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const withReturnTo = useWithReturnTo();
  const backToListHref = useBackToListHref(navigate('/announcements'));
  const scrollToFirstError = useScrollToFirstError();
  const runOnce = useInFlightGuard();
  const { user, hasRole } = useAuthUser();
  const canUseWideScope = hasRole(ANNOUNCEMENT_WIDE_SCOPE_ROLES);
  const { stores, isLoading: isStoresLoading } = useBlogTargetStores();

  // The article the form was (re)loaded from — kept apart from the page query so a background
  // refetch never swaps the optimistic-lock token under unsaved edits.
  const [baseDetail, setBaseDetail] = useState(detail);
  const [hasConflict, setHasConflict] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);

  // Edit: the loaded publish setting drives the "unchanged schedule / kept start" rules (M5, L1).
  const resolver = useMemo(
    () =>
      zodResolver(
        createAnnouncementFormSchema({
          loaded: mode === 'edit' && baseDetail ? toLoadedPublish(baseDetail) : undefined,
        }),
      ),
    [mode, baseDetail],
  );
  const form = useForm<AnnouncementFormValues>({ resolver, defaultValues });
  const { control, formState } = form;
  const hasSubmitErrors = formState.submitCount > 0 && Object.keys(formState.errors).length > 0;
  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(formState.isDirty);

  // After a failed submit, errors follow the live values everywhere — cross-field rules (scope ↔
  // targets, channels, dates) live on other fields than the one being edited.
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ submitCount }) => {
          if ((submitCount ?? 0) > 0) void form.trigger();
        },
      }),
    [form],
  );

  const values = useWatch({ control });
  // Typed watches for the 対象（推計） card (the deep-partial `values` loses store fields' types).
  const [watchedScope, watchedBrands, watchedStores] = useWatch({
    control,
    name: ['scope', 'brands', 'stores'],
  });
  const publishMethod = values.publishMethod ?? defaultValues.publishMethod;

  const { uploadFile: uploadBodyImage, isUploading: isBodyImageUploading } = useImageUpload({
    acceptedTypes: BODY_IMAGE_TYPES,
    maxSizeMB: BODY_IMAGE_MAX_SIZE_MB,
    errorMessage: '画像のアップロードに失敗しました',
  });

  const publishOptions = useMemo(() => {
    if (mode === 'create' || !baseDetail) return CREATE_PUBLISH_OPTIONS;
    return baseDetail.publishStatus === 'unpublished'
      ? UNPUBLISHED_PUBLISH_OPTIONS
      : CREATE_PUBLISH_OPTIONS;
  }, [mode, baseDetail]);

  // Spec Edge Cases: a Staff user without a store can target nothing — saving is disabled.
  const hasNoTargetableStore = !canUseWideScope && !isStoresLoading && stores.length === 0;
  // A Staff user editing an article whose scope is Manager-only cannot change its target (M4).
  const isTargetLocked =
    mode === 'edit' && !!baseDetail && baseDetail.brandScope !== 'store' && !canUseWideScope;

  const operator: BlogOperator | undefined = user
    ? { staffId: user.staffId, name: user.name }
    : undefined;

  const createMutation = useMutation(postCrmNoticesMutation());
  const updateMutation = useMutation(patchCrmNoticesByIdMutation());
  // A successful save stays "pending" while the screen navigates away (one save per click).
  const isSaved = createMutation.isSuccess || updateMutation.isSuccess;
  const isPending = createMutation.isPending || updateMutation.isPending || isSaved;

  // Failures are toasted once by the app-wide MutationCache handler (no local onError).
  const save = async (submitted: AnnouncementFormValues) => {
    if (isSaved) return;
    if (mode === 'create') {
      try {
        await createMutation.mutateAsync({
          body: announcementFormToCreateBody(submitted, operator),
        });
      } catch {
        return;
      }
      toast.success(ANNOUNCEMENT_SAVE_SUCCESS_TOASTS[submitted.publishMethod]);
      void queryClient.invalidateQueries({ queryKey: getCrmNoticesQueryKey() });
      navigateAfterSave(() => router.push(navigate('/announcements')));
      return;
    }

    if (!baseDetail) return;
    try {
      await updateMutation.mutateAsync({
        path: { id: baseDetail.id },
        body: announcementFormToUpdateBody(submitted, baseDetail, operator),
      });
    } catch (error) {
      // FR-019: someone else saved meanwhile — keep the input and offer a reload.
      if (getApiErrorStatus(error) === 409) setHasConflict(true);
      return;
    }
    // L10: an unchanged publish method (or 非公開のまま保存) is a plain save.
    const isMethodUnchanged =
      submitted.publishMethod === publishMethodFromStatus(baseDetail.publishStatus);
    toast.success(
      ANNOUNCEMENT_SAVE_SUCCESS_TOASTS[
        isMethodUnchanged ? 'keepUnpublished' : submitted.publishMethod
      ],
    );
    // Research F7 (as stores/[id]/edit): this screen is leaving, so the detail is only marked
    // stale and refetches when it mounts; the inactive list refetches normally on mount.
    void queryClient.invalidateQueries({
      queryKey: getCrmNoticesByIdQueryKey({ path: { id: baseDetail.id } }),
      refetchType: 'none',
    });
    void queryClient.invalidateQueries({ queryKey: getCrmNoticesQueryKey() });
    // FR-016: the article's detail, keeping the list's return-to for its back link.
    const destination = withReturnTo(
      navigate('/announcements/[id]', baseDetail.id),
      backToListHref,
    );
    navigateAfterSave(() => router.push(destination));
  };

  const handleSubmit = form.handleSubmit(
    (submitted) => runOnce(() => save(submitted)),
    scrollToFirstError,
  );

  const reloadLatest = () => {
    if (!onReloadDetail) return;
    confirmDiscard(() => {
      void onReloadDetail().then((fresh) => {
        if (!fresh) return;
        setBaseDetail(fresh);
        form.reset(announcementDetailToFormValues(fresh));
        setHasConflict(false);
      });
    });
  };

  const leaveToList = () => confirmDiscard(() => router.push(backToListHref));
  const goToCategories = (href: string) => confirmDiscard(() => router.push(withReturnTo(href)));

  // Edit-mode notice only for announcements published at least once (Clarification Q3).
  const showEditNotice =
    mode === 'edit' &&
    (baseDetail?.publishStatus === 'published' || baseDetail?.publishStatus === 'unpublished');

  const previewRow = isPreviewOpen
    ? {
        id: baseDetail?.id ?? NEW_ARTICLE_PREVIEW_ID,
        title: values.title?.trim() ?? '',
        publishStartAt: getPreviewPublishStartAt(publishMethod, values.publishAt, baseDetail),
      }
    : null;
  // An emptied editor still holds `<p></p>`; the dialog then shows its placeholder.
  const previewBody = values.body && hasBodyText(values.body) ? values.body : '';

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label={ANNOUNCEMENT_FORM_BACK_LABEL} onClick={leaveToList} />}
        title={title}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto flex max-w-[960px] flex-col gap-6">
          {showEditNotice && (
            <Alert className="border-warning/50 bg-warning/15">
              <AlertTriangle className="text-warning size-4" />
              <AlertDescription className="text-muted-foreground text-xs">
                {ANNOUNCEMENT_FORM_EDIT_NOTICE}
              </AlertDescription>
            </Alert>
          )}

          {hasConflict && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>他のユーザーが記事を更新しました</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-2">
                <p>最新の内容を読み込んでから、もう一度編集してください。</p>
                <Button type="button" variant="outline" size="sm" onClick={reloadLatest}>
                  最新の内容を読み込む
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <AnnouncementContentSection
            control={control}
            onUploadingChange={setIsThumbnailUploading}
            onManageCategories={() =>
              goToCategories(navigate('/article-categories', { type: ArticleCategoryType.NOTICE }))
            }
            categoryField={
              <AnnouncementCategoryField
                control={control}
                resetField={form.resetField}
                onAddCategory={() => goToCategories(navigate('/article-categories/create'))}
              />
            }
            bodyEditor={
              <BodyEditorField
                control={control}
                resetField={form.resetField}
                onImageUpload={uploadBodyImage}
              />
            }
          />

          <AnnouncementTargetSection
            control={control}
            canUseWideScope={canUseWideScope}
            storeOptions={stores}
            isStoresLoading={isStoresLoading}
            isLocked={isTargetLocked}
            reachCard={
              <AnnouncementReachCard
                scope={watchedScope}
                brands={watchedBrands}
                stores={watchedStores}
              />
            }
          />

          <AnnouncementPublishSection
            options={publishOptions}
            publishMethod={publishMethod}
            onPublishMethodChange={(method) =>
              form.setValue('publishMethod', method, { shouldDirty: true })
            }
            publishAt={values.publishAt ?? undefined}
            onPublishAtChange={(date) =>
              form.setValue('publishAt', date ?? null, { shouldDirty: true })
            }
            publishEndDate={values.publishEndDate ?? undefined}
            onPublishEndDateChange={(date) =>
              form.setValue('publishEndDate', date ?? null, { shouldDirty: true })
            }
            errors={{
              publishAt: formState.errors.publishAt?.message,
              publishEndDate: formState.errors.publishEndDate?.message,
            }}
          />

          <AnnouncementFormActions
            hasSubmitErrors={hasSubmitErrors}
            isPending={isPending || isBodyImageUploading || isThumbnailUploading}
            isSaveDisabled={hasNoTargetableStore}
            saveLabel={ANNOUNCEMENT_SAVE_LABELS[publishMethod]}
            onCancel={leaveToList}
            onPreview={() => setIsPreviewOpen(true)}
            onSubmit={() => void handleSubmit()}
          />
        </div>
      </div>

      <AnnouncementPreviewDialog
        row={previewRow}
        body={previewBody}
        dateFormat="detail"
        titlePlaceholder={ANNOUNCEMENT_PREVIEW_TITLE_PLACEHOLDER}
        bodyPlaceholder={ANNOUNCEMENT_PREVIEW_BODY_PLACEHOLDER}
        onOpenChange={(open) => {
          if (!open) setIsPreviewOpen(false);
        }}
      />
    </>
  );
}

/** 本文 editor bound to `body`. */
function BodyEditorField({
  control,
  resetField,
  onImageUpload,
}: {
  control: Control<AnnouncementFormValues>;
  resetField: UseFormResetField<AnnouncementFormValues>;
  onImageUpload: (file: File) => Promise<string | null>;
}) {
  const { field, fieldState } = useController({ control, name: 'body' });
  return (
    <AnnouncementBodyEditor
      value={field.value}
      onChange={(next, source) => {
        // Quill rewrites a loaded / empty value into its own HTML (`api` source); take that as
        // the baseline instead of an edit, so opening the form never marks it dirty.
        if (source !== 'user' && !fieldState.isDirty) {
          resetField('body', { defaultValue: next });
          return;
        }
        field.onChange(next);
      }}
      onBlur={field.onBlur}
      hasError={!!fieldState.error}
      onImageUpload={onImageUpload}
    />
  );
}

/** Publish date shown in the preview for the chosen method (now = the save time). */
function getPreviewPublishStartAt(
  method: AnnouncementFormValues['publishMethod'],
  publishAt: Date | null | undefined,
  detail: BlogDetail | undefined,
): string | null {
  switch (method) {
    case 'now':
      return detail?.publishStatus === 'published'
        ? detail.publishStartAt
        : new Date().toISOString();
    case 'scheduled':
      return publishAt ? publishAt.toISOString() : null;
    case 'draft':
      return null;
    case 'keepUnpublished':
      return detail?.publishStartAt ?? null;
  }
}
