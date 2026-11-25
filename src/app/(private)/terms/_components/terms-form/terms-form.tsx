'use client';

import { useCallback, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { TermsActiveVersionConfirmDialog } from '@/app/(private)/terms/_components/terms-form/sections/terms-active-version-confirm-dialog';
import { TermsActiveVersionWarning } from '@/app/(private)/terms/_components/terms-form/sections/terms-active-version-warning';
import { TermsApplicationSettingsSection } from '@/app/(private)/terms/_components/terms-form/sections/terms-application-settings-section';
import { TermsBasicInfoSection } from '@/app/(private)/terms/_components/terms-form/sections/terms-basic-info-section';
import {
  type RelatedLineage,
  TermsContentSection,
} from '@/app/(private)/terms/_components/terms-form/sections/terms-content-section';
import { TermsFormActions } from '@/app/(private)/terms/_components/terms-form/sections/terms-form-actions';
import { TERMS_BRANDS, type TermsStatus } from '@/app/(private)/terms/_constants/constants';
import {
  type TermsFormMode,
  TermsFormSchema,
  type TermsFormValues,
  emptyTermsFormValues,
} from '@/app/(private)/terms/_schemas/terms-form.schema';
import { invalidateTermsQueries } from '@/app/(private)/terms/_utils/terms-cache.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useMediaUploadOutcome } from '@/hooks/use-media-upload-outcome.hook';
import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { PageHeader } from '@/components/common/page-header';
import { Form } from '@/components/ui/form';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminTermsControllerCreateMutation,
  adminTermsControllerCreateVersionMutation,
  adminTermsControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { UpdateTermsDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { extractPdfBody } from '@/lib/utils/pdf-text.util';

const MAX_PDF_SIZE_MB = 10;
const PDF_ACCEPTED_TYPES = ['application/pdf'] as const;
const PDF_INVALID_TYPE_MESSAGE = 'PDF形式のファイルのみアップロードできます';
const PDF_TOO_LARGE_MESSAGE = `ファイルサイズが${MAX_PDF_SIZE_MB}MBを超えています。${MAX_PDF_SIZE_MB}MB以下のファイルを選択してください`;
const PDF_UPLOAD_FAILED_MESSAGE = 'アップロードに失敗しました';
const PDF_NO_TEXT_MESSAGE =
  'PDFからテキストを抽出できませんでした。テキストを含むPDFを選択してください';
const PDF_TEXT_TOO_LONG_MESSAGE =
  'PDFから抽出したテキストが上限を超えているため登録できません。別のPDFを選択してください';

/**
 * Whether the API refused the extracted PDF text as too long: 400 E-VAL-001 naming `bodyText`
 * (`too_long`, over the API-076 character cap) or the whole JSON body (`too_large`).
 */
function isPdfTextTooLongError(error: unknown): boolean {
  if (getApiErrorStatus(error) !== 400) return false;
  const details = (error as { details?: unknown }).details;
  if (!Array.isArray(details)) return false;
  return details.some((detail: unknown) => {
    if (typeof detail !== 'object' || detail === null) return false;
    const { field, code } = detail as { field?: unknown; code?: unknown };
    return (
      (field === 'bodyText' && code === 'too_long') || (field === 'body' && code === 'too_large')
    );
  });
}

/** Fields whose absence triggers 「未入力の項目があります」 (franchise-company-form pattern). */
const REQUIRED_FIELDS = [
  'brandEnum',
  'title',
  'termsType',
  'version',
  'effectiveFrom',
  'pdfS3Key',
] as const;

interface TermsFormProps {
  mode: TermsFormMode;
  /** Edit mode: the id of the document being updated. */
  termsId?: string;
  /** New-version mode: the source document's id (back-link target). */
  sourceId?: string;
  /** Edit mode: gates the active-version warning banner. */
  currentStatus?: TermsStatus;
  defaultValues?: Partial<TermsFormValues>;
  /** The document's lineage, listed under 関連規約. */
  relatedLineage?: RelatedLineage | null;
}

export function TermsForm({
  mode,
  termsId,
  sourceId,
  currentStatus,
  defaultValues,
  relatedLineage,
}: Readonly<TermsFormProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const backToListHref = useBackToListHref(navigate('/terms'));
  const withReturnTo = useWithReturnTo();

  const isBrandTypeLocked = mode !== 'create';
  const isCopiedFieldLocked = mode === 'new-version';
  const isEditMode = mode === 'edit';

  const pageTitle =
    mode === 'edit' ? '規約編集' : mode === 'new-version' ? '新規バージョン作成' : '規約新規登録';

  const backHref =
    mode === 'edit' && termsId
      ? navigate('/terms/[id]', termsId)
      : mode === 'new-version' && sourceId
        ? navigate('/terms/[id]', sourceId)
        : navigate('/terms');
  const breadcrumbHref =
    mode === 'edit' && termsId
      ? withReturnTo(navigate('/terms/[id]', termsId), backToListHref)
      : mode === 'new-version' && sourceId
        ? withReturnTo(navigate('/terms/[id]', sourceId), backToListHref)
        : backToListHref;

  const form = useForm<TermsFormValues>({
    resolver: zodResolver(TermsFormSchema),
    mode: 'onChange',
    defaultValues: { ...emptyTermsFormValues, ...defaultValues },
  });

  const { isDirty, dirtyFields, errors, isSubmitting } = form.formState;
  // Only an empty required field counts as 未入力 — a date-order or length error is not one.
  const values = form.getValues();
  const isMissing = (field: (typeof REQUIRED_FIELDS)[number]) => {
    const value = values[field];
    if (Array.isArray(value)) return value.length === 0;
    return typeof value === 'string' ? value.trim() === '' : value == null;
  };
  const hasMissingRequiredFields =
    form.formState.submitCount > 0 &&
    REQUIRED_FIELDS.some((field) => errors[field] && isMissing(field));

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);

  const { uploadFile, isUploading: isPresigning } = useMediaUploadOutcome({
    tag: 'terms',
    maxSizeMB: MAX_PDF_SIZE_MB,
    acceptedTypes: PDF_ACCEPTED_TYPES,
  });
  const [isExtracting, setIsExtracting] = useState(false);
  // The chosen PDF had no structure tags, so its 規約本文 blocks were inferred from the layout.
  const [isBodyInferred, setIsBodyInferred] = useState(false);
  const isUploading = isPresigning || isExtracting;
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [replacingPdf, setReplacingPdf] = useState(false);

  const watchedPdfFileName = useWatch({
    control: form.control,
    name: 'pdfFileName',
  });
  const watchedPdfS3Key = useWatch({ control: form.control, name: 'pdfS3Key' });
  const hasExistingPdf = isEditMode && !!defaultValues?.pdfS3Key;
  const showExistingFileChip = hasExistingPdf && !replacingPdf;
  // The prior file and its extracted text stay in the form (and in the 規約本文 preview) until a
  // valid replacement is chosen (US4-3); only a newly chosen file counts as 選択済み.
  const attachedPdfName = watchedPdfFileName;
  const selectedPdfName =
    replacingPdf && watchedPdfS3Key === defaultValues?.pdfS3Key ? '' : watchedPdfFileName;

  const createMutation = useMutation(adminTermsControllerCreateMutation());
  const createVersionMutation = useMutation(adminTermsControllerCreateVersionMutation());
  const updateMutation = useMutation(adminTermsControllerUpdateMutation());

  const handleReplaceClick = useCallback(() => {
    setReplacingPdf(true);
  }, []);

  const handleCancelReplace = useCallback(() => {
    setReplacingPdf(false);
    form.setValue('pdfS3Key', defaultValues?.pdfS3Key ?? '', {
      shouldDirty: false,
    });
    form.setValue('pdfFileName', defaultValues?.pdfFileName ?? '', {
      shouldDirty: false,
    });
    form.setValue('pdfFileSize', defaultValues?.pdfFileSize ?? 0, {
      shouldDirty: false,
    });
    form.setValue('bodyText', defaultValues?.bodyText ?? '', { shouldDirty: false });
    setIsBodyInferred(false);
    if (errors.pdfS3Key) form.clearErrors('pdfS3Key');
  }, [defaultValues, errors.pdfS3Key, form]);

  const handlePdfSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      const outcome = await uploadFile(file);
      if (!outcome.ok) {
        const message =
          outcome.reason === 'type'
            ? PDF_INVALID_TYPE_MESSAGE
            : outcome.reason === 'size'
              ? PDF_TOO_LARGE_MESSAGE
              : PDF_UPLOAD_FAILED_MESSAGE;
        if (outcome.reason === 'network' || outcome.reason === 'rejected') toast.error(message);
        form.setError('pdfS3Key', { type: 'manual', message });
        return;
      }

      setIsExtracting(true);
      try {
        const { body: bodyText, structured } = await extractPdfBody(file);
        // The API requires a non-empty bodyText; a scanned PDF has no text layer.
        if (!bodyText.trim()) {
          form.setError('pdfS3Key', { type: 'manual', message: PDF_NO_TEXT_MESSAGE });
          return;
        }
        form.setValue('bodyText', bodyText, { shouldDirty: true });
        setIsBodyInferred(!structured);
      } catch {
        toast.error(PDF_UPLOAD_FAILED_MESSAGE);
        form.setError('pdfS3Key', { type: 'manual', message: PDF_UPLOAD_FAILED_MESSAGE });
        return;
      } finally {
        setIsExtracting(false);
      }

      form.clearErrors('pdfS3Key');
      form.setValue('pdfS3Key', outcome.s3Key, { shouldDirty: true, shouldValidate: true });
      form.setValue('pdfFileName', file.name, { shouldDirty: true });
      form.setValue('pdfFileSize', file.size, { shouldDirty: true });
    },
    [form, uploadFile],
  );

  const [pendingValues, setPendingValues] = useState<TermsFormValues | null>(null);

  const scrollToFirstInvalidField = () => {
    setTimeout(() => {
      const element = document.querySelector("[aria-invalid='true']");
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const submitValues = async (values: TermsFormValues) => {
    try {
      if (mode === 'edit' && termsId) {
        const body: UpdateTermsDto = {};
        if (dirtyFields.title) body.title = values.title;
        if (dirtyFields.version) body.version = values.version;
        if (dirtyFields.effectiveFrom) body.effectiveFrom = values.effectiveFrom;
        if (dirtyFields.effectiveTo) body.effectiveTo = values.effectiveTo || null;
        if (dirtyFields.remarks) body.remarks = values.remarks?.trim() || null;
        if (dirtyFields.displayOrder) body.displayOrder = values.displayOrder ?? null;
        if (dirtyFields.requiresConsent) body.requiresConsent = values.requiresConsent;
        // A new PDF must bring its re-extracted text in the same request (API-076 §6.2)
        if (dirtyFields.pdfS3Key) {
          body.pdfS3Key = values.pdfS3Key;
          body.bodyText = values.bodyText;
        }

        await updateMutation.mutateAsync({ path: { id: termsId }, body });
        // Clearing the dirty state before navigating keeps the unload prompt away
        form.reset(form.getValues());
        toast.success('規約の変更を保存しました');
        invalidateTermsQueries(queryClient);
        navigateAfterSave(() => router.push(navigate('/terms/[id]', termsId)));
        return;
      }

      const sharedPayload = {
        title: values.title,
        version: values.version,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo || null,
        remarks: values.remarks?.trim() || null,
        displayOrder: values.displayOrder ?? null,
        requiresConsent: values.requiresConsent,
        pdfS3Key: values.pdfS3Key,
        bodyText: values.bodyText,
      };

      if (mode === 'new-version' && sourceId) {
        const created = await createVersionMutation.mutateAsync({
          path: { id: sourceId },
          body: sharedPayload,
        });
        form.reset(form.getValues());
        invalidateTermsQueries(queryClient);
        toast.success('規約を登録しました');
        navigateAfterSave(() => router.push(navigate('/terms/[id]', created.id)));
        return;
      }

      // Every brand ticked = one shared document (brandEnum null) rather than one row per brand.
      const brandEnum =
        values.brandEnum.length === TERMS_BRANDS.length ? null : values.brandEnum[0];
      await createMutation.mutateAsync({
        body: { ...sharedPayload, termsType: values.termsType, brandEnum },
      });

      form.reset(form.getValues());
      invalidateTermsQueries(queryClient);
      toast.success('規約を登録しました');
      navigateAfterSave(() => router.push(navigate('/terms')));
    } catch (error) {
      // The API error toast comes from the shared MutationCache; an over-long PDF text is also
      // pinned to the PDF field so the operator knows which input to change.
      if (isPdfTextTooLongError(error)) {
        form.setError('pdfS3Key', { type: 'server', message: PDF_TEXT_TOO_LONG_MESSAGE });
        scrollToFirstInvalidField();
      }
    }
  };

  const handleSubmit = form.handleSubmit(
    async (values) => {
      // An applied (公開中) version affects members who already agreed: confirm before saving.
      if (isEditMode && currentStatus === 'published') {
        setPendingValues(values);
        return;
      }
      await submitValues(values);
    },
    () => scrollToFirstInvalidField(),
  );

  const handleConfirmActiveEdit = () => {
    const values = pendingValues;
    setPendingValues(null);
    if (values) void submitValues(values);
  };

  const handleBack = () => confirmDiscard(() => router.push(backHref));

  return (
    <Form {...form}>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col">
        <PageHeader
          breadcrumb={
            <BackLink
              label="規約文書管理に戻る"
              onClick={() => confirmDiscard(() => router.push(breadcrumbHref))}
            />
          }
          title={pageTitle}
        />

        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {isEditMode && currentStatus === 'published' && <TermsActiveVersionWarning />}

          <div className="mx-auto flex max-w-240 flex-col gap-6">
            <TermsBasicInfoSection
              isBrandTypeLocked={isBrandTypeLocked}
              isCopiedFieldLocked={isCopiedFieldLocked}
              inheritedTermsId={sourceId}
            />

            <TermsApplicationSettingsSection />

            <TermsContentSection
              pdfInputRef={pdfInputRef}
              isUploading={isUploading}
              hasExistingPdf={hasExistingPdf}
              showExistingFileChip={showExistingFileChip}
              existingPdfFileName={defaultValues?.pdfFileName}
              attachedPdfName={attachedPdfName}
              selectedPdfName={selectedPdfName}
              onReplaceClick={handleReplaceClick}
              onCancelReplace={handleCancelReplace}
              onFileSelect={handlePdfSelect}
              isBodyInferred={isBodyInferred}
              relatedLineage={relatedLineage}
            />

            <TermsFormActions
              hasMissingRequiredFields={hasMissingRequiredFields}
              isSubmitting={isSubmitting || updateMutation.isPending}
              isUploading={isUploading}
              isEditMode={isEditMode}
              isDirty={isDirty}
              onCancel={handleBack}
            />
          </div>
        </main>
      </form>
      <TermsActiveVersionConfirmDialog
        open={pendingValues !== null}
        onOpenChange={(open) => {
          if (!open) setPendingValues(null);
        }}
        onConfirm={handleConfirmActiveEdit}
      />
    </Form>
  );
}
