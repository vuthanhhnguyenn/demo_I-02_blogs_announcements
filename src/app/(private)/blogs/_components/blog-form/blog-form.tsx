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

import { useAuthUser } from '@/contexts/auth-user.context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
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
  getCrmArticleCategoriesOptions,
  getCrmNoticesByIdQueryKey,
  getCrmNoticesQueryKey,
  patchCrmNoticesByIdMutation,
  postCrmNoticesMutation,
} from '@/lib/api/@tanstack/react-query.gen';
import { ArticleCategoryType } from '@/lib/api/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  BLOG_CATEGORY_LIST_QUERY,
  BLOG_PUBLISH_METHOD_OPTIONS,
  BLOG_SAVE_LABELS,
  BLOG_SAVE_SUCCESS_TOASTS,
  BLOG_WIDE_SCOPE_ROLES,
} from '../../_constants/blog.constants';
import { useBlogTargetStores } from '../../_hooks/use-blog-target-stores.hook';
import {
  blogDetailToFormValues,
  blogFormToCreateBody,
  blogFormToUpdateBody,
  publishMethodFromStatus,
  toLoadedPublish,
} from '../../_schemas/blog-form.mapper';
import {
  type BlogFormValues,
  createBlogFormSchema,
  hasBodyText,
} from '../../_schemas/blog-form.schema';
import type { BlogDetail, BlogOperator, BlogPublishMethodOption } from '../../_types/blog.type';
import { type BlogPreviewArticle, BlogPreviewDialog } from '../blog-preview-dialog';
import { BlogBodyEditor } from './sections/blog-body-editor';
import { BlogCategorySection } from './sections/blog-category-section';
import { BlogContentSection } from './sections/blog-content-section';
import { BlogFormActions } from './sections/blog-form-actions';
import { BlogPublishSection } from './sections/blog-publish-section';
import { BlogTargetSection } from './sections/blog-target-section';

/** Preview URL slug of an article that has no id yet (prototype L591). */
const NEW_ARTICLE_PREVIEW_ID = 'new-article';
/** 本文 images: same PNG / JPG ≤ 5MB rule as the thumbnail. */
const BODY_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;
const BODY_IMAGE_MAX_SIZE_MB = 5;

const { now, scheduled, draft, keepUnpublished } = BLOG_PUBLISH_METHOD_OPTIONS;
const CREATE_PUBLISH_OPTIONS: readonly BlogPublishMethodOption[] = [now, scheduled, draft];
/** Research F6: a 非公開 article gets 非公開のまま保存 first (and preselected). */
const UNPUBLISHED_PUBLISH_OPTIONS: readonly BlogPublishMethodOption[] = [
  keepUnpublished,
  now,
  scheduled,
  draft,
];

interface BlogFormProps {
  mode: 'create' | 'edit';
  /** Page title — 「ブログ新規登録」 / 「ブログ編集」 (FR-001). */
  title: string;
  defaultValues: BlogFormValues;
  /** Edit mode: the article as loaded (its `updatedAt` is the optimistic-lock token). */
  detail?: BlogDetail;
  /** Edit mode: refetches the article for the 409 「最新の内容を読み込む」 action. */
  onReloadDetail?: () => Promise<BlogDetail | null>;
}

/**
 * Shared create / edit form (research F4, pattern of banners/_components/banner-form). Renders
 * the page header too, because its back link has to go through the form's discard guard.
 */
export function BlogForm({
  mode,
  title,
  defaultValues,
  detail,
  onReloadDetail,
}: Readonly<BlogFormProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const withReturnTo = useWithReturnTo();
  const backToListHref = useBackToListHref(navigate('/blogs'));
  const scrollToFirstError = useScrollToFirstError();
  const runOnce = useInFlightGuard();
  const { user, hasRole } = useAuthUser();
  const canUseWideScope = hasRole(BLOG_WIDE_SCOPE_ROLES);
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
        createBlogFormSchema({
          loaded: mode === 'edit' && baseDetail ? toLoadedPublish(baseDetail) : undefined,
        }),
      ),
    [mode, baseDetail],
  );
  const form = useForm<BlogFormValues>({ resolver, defaultValues });
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
  const publishMethod = values.publishMethod ?? defaultValues.publishMethod;

  const { data: categoriesRes } = useQuery(
    getCrmArticleCategoriesOptions({ query: BLOG_CATEGORY_LIST_QUERY }),
  );

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
  const save = async (submitted: BlogFormValues) => {
    if (isSaved) return;
    if (mode === 'create') {
      try {
        await createMutation.mutateAsync({ body: blogFormToCreateBody(submitted, operator) });
      } catch {
        return;
      }
      toast.success(BLOG_SAVE_SUCCESS_TOASTS[submitted.publishMethod]);
      void queryClient.invalidateQueries({ queryKey: getCrmNoticesQueryKey() });
      navigateAfterSave(() => router.push(navigate('/blogs')));
      return;
    }

    if (!baseDetail) return;
    try {
      await updateMutation.mutateAsync({
        path: { id: baseDetail.id },
        body: blogFormToUpdateBody(submitted, baseDetail, operator),
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
      BLOG_SAVE_SUCCESS_TOASTS[isMethodUnchanged ? 'keepUnpublished' : submitted.publishMethod],
    );
    // Research F7 (as stores/[id]/edit): this screen is leaving, so the detail is only marked
    // stale and refetches when it mounts; the inactive list refetches normally on mount.
    void queryClient.invalidateQueries({
      queryKey: getCrmNoticesByIdQueryKey({ path: { id: baseDetail.id } }),
      refetchType: 'none',
    });
    void queryClient.invalidateQueries({ queryKey: getCrmNoticesQueryKey() });
    // FR-016: the article's detail, keeping the list's return-to for its back link.
    const destination = withReturnTo(navigate('/blogs/[id]', baseDetail.id), backToListHref);
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
        form.reset(blogDetailToFormValues(fresh));
        setHasConflict(false);
      });
    });
  };

  const leaveToList = () => confirmDiscard(() => router.push(backToListHref));
  const goToCategories = (href: string) => confirmDiscard(() => router.push(withReturnTo(href)));

  const previewArticle: BlogPreviewArticle | null = isPreviewOpen
    ? {
        id: baseDetail?.id ?? NEW_ARTICLE_PREVIEW_ID,
        title: values.title?.trim() || '記事タイトル',
        categoryName:
          categoriesRes?.items.find((category) => category.id === values.categoryId)?.name ?? null,
        publishStartAt: getPreviewPublishStartAt(publishMethod, values.publishAt, baseDetail),
        // An emptied editor still holds `<p></p>`; the dialog then shows its placeholder.
        body: values.body && hasBodyText(values.body) ? values.body : '',
        thumbnailUrl: values.thumbnailUrl ?? null,
      }
    : null;

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label="ブログ管理に戻る" onClick={leaveToList} />}
        title={title}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto flex max-w-[960px] flex-col gap-6">
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

          <BlogContentSection
            control={control}
            onUploadingChange={setIsThumbnailUploading}
            bodyEditor={
              <BodyEditorField
                control={control}
                resetField={form.resetField}
                onImageUpload={uploadBodyImage}
              />
            }
          />

          <BlogCategorySection
            control={control}
            resetField={form.resetField}
            onManageCategories={() =>
              goToCategories(navigate('/article-categories', { type: ArticleCategoryType.BLOG }))
            }
            onAddCategory={() => goToCategories(navigate('/article-categories/create'))}
          />

          <BlogTargetSection
            control={control}
            canUseWideScope={canUseWideScope}
            storeOptions={stores}
            isStoresLoading={isStoresLoading}
            isLocked={isTargetLocked}
          />

          <BlogPublishSection
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

          <BlogFormActions
            hasSubmitErrors={hasSubmitErrors}
            isPending={isPending || isBodyImageUploading || isThumbnailUploading}
            isSaveDisabled={hasNoTargetableStore}
            saveLabel={BLOG_SAVE_LABELS[publishMethod]}
            onCancel={leaveToList}
            onPreview={() => setIsPreviewOpen(true)}
            onSubmit={() => void handleSubmit()}
          />
        </div>
      </div>

      <BlogPreviewDialog
        article={previewArticle}
        onOpenChange={(open) => {
          if (!open) setIsPreviewOpen(false);
        }}
        dateFormat="detail"
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
  control: Control<BlogFormValues>;
  resetField: UseFormResetField<BlogFormValues>;
  onImageUpload: (file: File) => Promise<string | null>;
}) {
  const { field, fieldState } = useController({ control, name: 'body' });
  return (
    <BlogBodyEditor
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
  method: BlogFormValues['publishMethod'],
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
