'use client';

import { type BaseSyntheticEvent, useEffect, useMemo, useRef, useState } from 'react';
import { type FieldErrors, useForm, useWatch } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useDebounce } from '@/hooks/use-debounce.hook';
import { useMediaUpload } from '@/hooks/use-media-upload.hook';
import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { PageHeader } from '@/components/common/page-header';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminExerciseMasterControllerCreateMutation,
  adminExerciseMasterControllerDetailQueryKey,
  adminExerciseMasterControllerListQueryKey,
  adminExerciseMasterControllerPublishMutation,
  adminExerciseMasterControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { ExerciseDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import {
  EXERCISE_ERROR_CODE,
  EXERCISE_IMAGE_MAX_COUNT,
  EXERCISE_STATUS_BADGE_CLASSES,
  EXERCISE_STATUS_DOT_CLASSES,
  EXERCISE_STATUS_LABELS,
} from '../_constants/constants';
import {
  type EquipmentRow,
  resolveSelectedEquipment,
  useEquipmentCandidates,
  useRelatedExerciseCandidates,
  useSelectedRelatedExercises,
} from '../_hooks/use-exercise-form-candidates';
import {
  useBodyweightToolId,
  useExerciseMasterOptions,
  useToolTypeLabel,
} from '../_hooks/use-exercise-master-options';
import {
  ExerciseTranslationContext,
  useExerciseTranslation,
} from '../_hooks/use-exercise-translation';
import {
  type ExerciseDetail,
  type ExerciseFormInput,
  ExerciseFormSchema,
  type ExerciseFormValues,
  createExerciseFormDefaults,
  mapExerciseDetailToFormValues,
} from '../_schemas/exercise-form.schema';
import { toCreateExerciseBody, toUpdateExerciseBody } from '../_utils/exercise-body.util';
import { getExerciseErrorCode } from '../_utils/exercise-error.util';
import { resolveExerciseMasterLabel } from '../_utils/exercise-master-label.util';
import { getExercisePublishStatus, toPublishBody } from '../_utils/exercise-status.util';
import { ExerciseFormBasicTab } from './exercise-form-basic-tab';
import { ExerciseFormRelatedTab, type RelatedExerciseOption } from './exercise-form-related-tab';
import { ExerciseFormStepsTab } from './exercise-form-steps-tab';

const IMAGE_MAX_SIZE_MB = 5;
const IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png'] as const;
const SEARCH_DEBOUNCE_MS = 300;
const BODYWEIGHT_EQUIPMENT_MESSAGE = '器具種別が「なし（自重）」の場合は機材を紐づけできません';
const RELATED_RULE_MESSAGE = '関連エクササイズは自分自身を除き最大3件まで設定できます。';

const FORM_TABS = ['basic', 'steps', 'related'] as const;
type ExerciseFormTab = (typeof FORM_TABS)[number];

function isExerciseFormTab(value: unknown): value is ExerciseFormTab {
  return FORM_TABS.some((tab) => tab === value);
}

/** Field → tab, in on-screen order: the first invalid field decides the tab to open (C-14). */
const FIELD_TABS: readonly [keyof ExerciseFormInput, ExerciseFormTab][] = [
  ['exerciseCode', 'basic'],
  ['nameJa', 'basic'],
  ['nameEn', 'basic'],
  ['categoryId', 'basic'],
  ['primaryMuscleId', 'basic'],
  ['secondaryMuscleIds', 'basic'],
  ['toolId', 'basic'],
  ['exerciseTypeId', 'basic'],
  ['handUsage', 'basic'],
  ['level', 'basic'],
  ['restSeconds', 'basic'],
  ['videoUrl', 'basic'],
  ['images', 'basic'],
  ['publishStatus', 'basic'],
  ['explanationSteps', 'steps'],
  ['linkedEquipmentIds', 'related'],
  ['relatedExerciseIds', 'related'],
  ['enabledTagIds', 'related'],
];

/** Whether a required (FR-003) field is still empty — picks the footer summary's wording. */
function hasMissingRequiredField(values: ExerciseFormInput) {
  return (
    !values.nameJa?.trim() ||
    !values.categoryId ||
    !values.primaryMuscleId ||
    !values.toolId ||
    !values.exerciseTypeId ||
    !values.handUsage ||
    !values.level
  );
}

/** FR-013 violation from the API: E-EXM-005, or a 400 whose details name `relatedExerciseIds`. */
function isRelatedExerciseRuleError(error: unknown) {
  if (getExerciseErrorCode(error) === EXERCISE_ERROR_CODE.relatedRule) return true;
  if (getApiErrorStatus(error) !== 400) return false;
  const details = (error as { details?: unknown }).details;
  return (
    Array.isArray(details) &&
    details.some((detail) => {
      const field = (detail as { field?: unknown } | null)?.field;
      return typeof field === 'string' && field.startsWith('relatedExerciseIds');
    })
  );
}

interface ExerciseFormProps {
  mode: 'create' | 'edit';
  defaultDetail?: ExerciseDetail;
}

export function ExerciseForm({ mode, defaultDetail }: ExerciseFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const backToListHref = useBackToListHref(navigate('/exercises'));
  const [activeTab, setActiveTab] = useState<ExerciseFormTab>('basic');
  /** Footer summary after a failed submit (C-03): a required field is empty, or another error. */
  const [submitErrorKind, setSubmitErrorKind] = useState<'missing' | 'invalid' | null>(null);
  // C-23: one save at a time — the ref closes the gap before the disabled state renders.
  const submitLockRef = useRef(false);
  const [hasSaved, setHasSaved] = useState(false);
  /** Set by 「このまま保存する」 in the 種別不一致 confirm, consumed by the next submit. */
  const skipMismatchCheckRef = useRef(false);
  const [mismatchConfirmOpen, setMismatchConfirmOpen] = useState(false);
  const defaultValues = useMemo(
    () =>
      defaultDetail ? mapExerciseDetailToFormValues(defaultDetail) : createExerciseFormDefaults(),
    [defaultDetail],
  );

  const form = useForm<ExerciseFormInput, unknown, ExerciseFormValues>({
    resolver: zodResolver(ExerciseFormSchema),
    defaultValues,
  });
  const publishStatus = useWatch({ control: form.control, name: 'publishStatus' });
  const toolId = useWatch({ control: form.control, name: 'toolId' });
  const linkedEquipmentIds = useWatch({
    control: form.control,
    name: 'linkedEquipmentIds',
    defaultValue: defaultValues.linkedEquipmentIds,
  });
  const relatedExerciseIds = useWatch({
    control: form.control,
    name: 'relatedExerciseIds',
    defaultValue: defaultValues.relatedExerciseIds,
  });
  const explanationSteps = useWatch({
    control: form.control,
    name: 'explanationSteps',
    defaultValue: defaultValues.explanationSteps,
  });

  const { categoryOptions, primaryMuscleOptions } = useExerciseMasterOptions();
  const bodyweightToolId = useBodyweightToolId();
  const isBodyweightToolSelected = Boolean(bodyweightToolId && toolId === bodyweightToolId);

  // Related-exercise candidates: server-side keyword search, paged on scroll (D11).
  const [relatedExerciseSearch, setRelatedExerciseSearch] = useState('');
  const debouncedRelatedSearch = useDebounce(relatedExerciseSearch.trim(), SEARCH_DEBOUNCE_MS);
  const relatedCandidates = useRelatedExerciseCandidates(debouncedRelatedSearch);
  const relatedExerciseOptions = useMemo<RelatedExerciseOption[]>(
    () =>
      relatedCandidates.items
        .filter((item) => item.id !== defaultDetail?.id)
        .map((item) => ({
          id: item.id,
          name: item.name,
          exerciseCode: item.exerciseCode,
          categoryLabel: resolveExerciseMasterLabel(
            categoryOptions,
            item.categoryName,
            item.category,
          ),
        })),
    [categoryOptions, defaultDetail?.id, relatedCandidates.items],
  );
  // Selected rows can fall outside the current search page, so they are read by id (≤3).
  const selectedRelatedIds = useMemo(() => relatedExerciseIds ?? [], [relatedExerciseIds]);
  const selectedRelatedExercises = useSelectedRelatedExercises(selectedRelatedIds);

  // The equipment list API makes `storeId` conditionally required (non-HQ roles get 400 if it is omitted).
  // Do not call it until the store scope is settled.
  const { currentStoreId, canSelectAllStores, isLoading: isStoreLoading } = useCurrentStore();
  const isAllStoresScope = canSelectAllStores && currentStoreId === ALL_STORES;
  const isStoreScopeReady = !isStoreLoading && (isAllStoresScope || currentStoreId !== ALL_STORES);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const debouncedEquipmentSearch = useDebounce(equipmentSearch.trim(), SEARCH_DEBOUNCE_MS);
  const equipmentCandidates = useEquipmentCandidates({
    keyword: debouncedEquipmentSearch,
    toolId: toolId || undefined,
    storeId: isAllStoresScope ? undefined : currentStoreId,
    enabled: !isBodyweightToolSelected && isStoreScopeReady,
  });
  const selectedLinkedEquipmentIds = useMemo(() => linkedEquipmentIds ?? [], [linkedEquipmentIds]);
  // Candidate rows ticked in this session, so a picked 機材 keeps its name after the search moves on.
  const [pickedEquipment, setPickedEquipment] = useState<ReadonlyMap<string, EquipmentRow>>(
    () => new Map(),
  );
  const selectedEquipment = useMemo(
    () =>
      resolveSelectedEquipment(
        selectedLinkedEquipmentIds,
        defaultDetail?.equipments ?? [],
        pickedEquipment,
      ),
    [defaultDetail?.equipments, pickedEquipment, selectedLinkedEquipmentIds],
  );
  const [pendingToolId, setPendingToolId] = useState<string | null>(null);
  const [equipmentClearOpen, setEquipmentClearOpen] = useState(false);
  const toolLabel = useToolTypeLabel(toolId);
  // E-03 L237: linked equipment whose own 器具種別 differs from the exercise's (kept, flagged).
  const mismatchedEquipment = selectedEquipment.filter(
    (item) =>
      Boolean(toolId) &&
      !isBodyweightToolSelected &&
      item.toolId !== null &&
      item.toolId !== toolId,
  );

  const { uploadFile, isUploading } = useMediaUpload({
    tag: 'exercise-image',
    maxSizeMB: IMAGE_MAX_SIZE_MB,
    acceptedTypes: IMAGE_ACCEPTED_TYPES,
  });

  async function handleImageFiles(files: File[]) {
    const currentImages = form.getValues('images');
    const remainingSlots = EXERCISE_IMAGE_MAX_COUNT - currentImages.length;
    if (files.length > remainingSlots) {
      toast.error(`画像は最大${EXERCISE_IMAGE_MAX_COUNT}枚まで登録できます`, {
        description:
          remainingSlots > 0
            ? `${files.length - remainingSlots}枚は追加されませんでした。`
            : '追加する場合は既存の画像を削除してください。',
      });
    }
    if (remainingSlots <= 0) return;

    const uploaded: { s3Key: string; previewUrl: string }[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      const s3Key = await uploadFile(file);
      if (s3Key) uploaded.push({ s3Key, previewUrl: URL.createObjectURL(file) });
    }
    const nextImages = [
      ...currentImages,
      ...uploaded.map((image, index) => ({
        ...image,
        isPrimary: currentImages.length === 0 && index === 0,
      })),
    ];
    form.setValue('images', nextImages, { shouldDirty: true, shouldValidate: true });
  }

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  useEffect(() => {
    if (isBodyweightToolSelected && selectedLinkedEquipmentIds.length > 0) {
      form.setError('linkedEquipmentIds', {
        type: 'manual',
        message: BODYWEIGHT_EQUIPMENT_MESSAGE,
      });
      return;
    }

    form.clearErrors('linkedEquipmentIds');
  }, [form, isBodyweightToolSelected, selectedLinkedEquipmentIds]);

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(form.formState.isDirty);
  const translation = useExerciseTranslation(form);

  // Save failures are handled below (a related-exercise rule error goes to its field instead of a
  // toast, C-27); a publish failure is toasted by the shared MutationCache (D10).
  const createMutation = useMutation({
    ...adminExerciseMasterControllerCreateMutation(),
    meta: { suppressErrorToast: true },
  });
  const updateMutation = useMutation({
    ...adminExerciseMasterControllerUpdateMutation(),
    meta: { suppressErrorToast: true },
  });
  const publishMutation = useMutation(adminExerciseMasterControllerPublishMutation());
  const isSaving =
    form.formState.isSubmitting ||
    hasSaved ||
    translation.isTranslating ||
    createMutation.isPending ||
    updateMutation.isPending ||
    publishMutation.isPending;

  const hasIncompleteSteps =
    publishStatus === 'public' && explanationSteps.some((step) => step.textJa.trim().length === 0);

  const handleToolChange = (value: string | null) => {
    if (!value) return;
    const currentToolId = form.getValues('toolId');
    if (value === bodyweightToolId && selectedLinkedEquipmentIds.length > 0) {
      setPendingToolId(value);
      setEquipmentClearOpen(true);
      return;
    }
    // Other tool types keep the linked equipment; a mismatch is flagged (種別不一致) and confirmed
    // before saving (E-03 L237), never dropped silently (C-25).
    form.setValue('toolId', value, { shouldDirty: true, shouldValidate: true });
    if (value !== currentToolId) setEquipmentSearch('');
  };

  /** Opens the tab holding the first invalid field and brings that field into view (C-14). */
  function revealFirstError(errors: FieldErrors<ExerciseFormInput>) {
    const firstTab = FIELD_TABS.find(([field]) => errors[field])?.[1];
    if (firstTab) setActiveTab(firstTab);
    // Wait for the tab panel to render before looking for the field.
    window.setTimeout(() => {
      const root = formRef.current;
      if (!root) return;
      const target =
        root.querySelector<HTMLElement>('[aria-invalid="true"]') ??
        root.querySelector<HTMLElement>('[data-slot="form-message"]');
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus({ preventScroll: true });
    }, 50);
  }

  const onInvalid = (errors: FieldErrors<ExerciseFormInput>) => {
    setSubmitErrorKind(hasMissingRequiredField(form.getValues()) ? 'missing' : 'invalid');
    revealFirstError(errors);
  };

  const onValid = async (submitted: ExerciseFormValues) => {
    setSubmitErrorKind(null);
    const skipMismatchCheck = skipMismatchCheckRef.current;
    skipMismatchCheckRef.current = false;

    // E-EXM-004 (bodyweight + equipment) is deferred on the BE, so the FE keeps the guard.
    if (
      bodyweightToolId &&
      submitted.toolId === bodyweightToolId &&
      submitted.linkedEquipmentIds.length > 0
    ) {
      form.setError('linkedEquipmentIds', {
        type: 'manual',
        message: BODYWEIGHT_EQUIPMENT_MESSAGE,
      });
      setSubmitErrorKind('invalid');
      revealFirstError({ linkedEquipmentIds: { type: 'manual' } });
      return;
    }

    // E-03 L237: equipment of another 器具種別 is saved only after the operator confirms it.
    if (!skipMismatchCheck && mismatchedEquipment.length > 0) {
      setMismatchConfirmOpen(true);
      return;
    }

    // A related exercise that no longer exists is dropped from the save (C-29).
    const missingRelatedIds = new Set(
      selectedRelatedExercises.filter((item) => item.isMissing).map((item) => item.id),
    );
    const cleaned: ExerciseFormValues = {
      ...submitted,
      relatedExerciseIds: submitted.relatedExerciseIds.filter((id) => !missingRelatedIds.has(id)),
    };

    // FR-014 phase 1 (PO 2026-10-20, D25): the EN texts are typed by hand and saved as entered.
    // TODO(round3) R304 — translate JP-filled / EN-empty fields first; a failure saves JP only.
    // const { values, hasFailure: translationFailed } = await translation.translateMissing(cleaned);
    const values = cleaned;

    let saved: ExerciseDetailDto;
    try {
      saved =
        isEdit && defaultDetail
          ? await updateMutation.mutateAsync({
              path: { id: defaultDetail.id },
              body: toUpdateExerciseBody(values),
            })
          : await createMutation.mutateAsync({ body: toCreateExerciseBody(values) });
    } catch (error) {
      if (isRelatedExerciseRuleError(error)) {
        form.setError('relatedExerciseIds', { type: 'server', message: RELATED_RULE_MESSAGE });
        setSubmitErrorKind('invalid');
        revealFirstError({ relatedExerciseIds: { type: 'server' } });
      } else {
        toast.error(resolveApiErrorMessage(error));
      }
      return;
    }

    // POST/PATCH carry no status: the 公開 switch is applied with a publish call (D9). A failed
    // publish is toasted by the shared handler; the exercise itself is saved.
    if (values.publishStatus !== getExercisePublishStatus(saved)) {
      try {
        saved = await publishMutation.mutateAsync({
          path: { id: saved.id },
          body: toPublishBody(values.publishStatus),
        });
      } catch {
        // already toasted
      }
    }

    // TODO(round3) R304
    // if (translationFailed) {
    //   toast.warning('英語の自動翻訳に失敗しました', {
    //     description: '日本語の内容で保存されています。編集画面の「再翻訳」から再実行できます。',
    //   });
    // }
    toast.success(isEdit ? 'エクササイズの変更を保存しました' : 'エクササイズを登録しました');
    // Keep the buttons disabled until the page changes (C-23).
    setHasSaved(true);
    queryClient.setQueryData(
      adminExerciseMasterControllerDetailQueryKey({ path: { id: saved.id } }),
      saved,
    );
    void queryClient.invalidateQueries({ queryKey: adminExerciseMasterControllerListQueryKey() });
    navigateAfterSave(() =>
      router.push(isEdit ? navigate('/exercises/[id]', saved.id) : backToListHref),
    );
  };

  async function handleFormSubmit(event?: BaseSyntheticEvent) {
    event?.preventDefault();
    if (submitLockRef.current || hasSaved) return;
    submitLockRef.current = true;
    try {
      await form.handleSubmit(onValid, onInvalid)(event);
    } finally {
      submitLockRef.current = false;
    }
  }

  const leaveTo = (href: string) => confirmDiscard(() => router.push(href));
  const savedStatus = defaultDetail ? getExercisePublishStatus(defaultDetail) : null;
  const hasFormErrors = Object.keys(form.formState.errors).length > 0;

  return (
    <ExerciseTranslationContext.Provider value={translation}>
      <PageHeader
        breadcrumb={
          <BackLink label="エクササイズ管理に戻る" onClick={() => leaveTo(backToListHref)} />
        }
        title={isEdit ? 'エクササイズ 編集' : 'エクササイズ 新規登録'}
        badge={
          savedStatus ? (
            <Badge
              variant="outline"
              className={cn(
                'gap-1 text-xs font-medium',
                EXERCISE_STATUS_BADGE_CLASSES[savedStatus],
              )}
            >
              <span
                className={cn('size-1.5 rounded-full', EXERCISE_STATUS_DOT_CLASSES[savedStatus])}
              />
              {EXERCISE_STATUS_LABELS[savedStatus]}
            </Badge>
          ) : undefined
        }
      />
      <div className="px-6 py-4">
        <Form {...form}>
          <form
            ref={formRef}
            onSubmit={(event) => void handleFormSubmit(event)}
            noValidate
            className="mx-auto flex w-full max-w-[960px] flex-col"
          >
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                if (isExerciseFormTab(value)) setActiveTab(value);
              }}
              className="gap-4"
            >
              <TabsList variant="line">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="steps">
                  解説ステップ
                  {hasIncompleteSteps ? (
                    <span
                      className="bg-warning ml-2 inline-block size-2 rounded-full"
                      aria-label="未入力のステップがあります"
                    />
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="related">関連情報</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <ExerciseFormBasicTab
                  imageInputRef={imageInputRef}
                  isUploading={isUploading}
                  onHandleImageFiles={handleImageFiles}
                  onToolChange={handleToolChange}
                  primaryMuscleOptions={primaryMuscleOptions}
                />
              </TabsContent>

              <TabsContent value="steps">
                <ExerciseFormStepsTab hasIncompleteSteps={hasIncompleteSteps} />
              </TabsContent>

              <TabsContent value="related">
                <ExerciseFormRelatedTab
                  currentExerciseId={defaultDetail?.id}
                  equipmentOptions={equipmentCandidates.items}
                  equipmentPaging={equipmentCandidates}
                  equipmentSearch={equipmentSearch}
                  exerciseToolId={toolId ?? ''}
                  exerciseToolLabel={toolLabel}
                  isBodyweightToolSelected={isBodyweightToolSelected}
                  isEquipmentError={equipmentCandidates.isError}
                  isEquipmentLoading={equipmentCandidates.isLoading}
                  onEquipmentPick={(item) =>
                    setPickedEquipment((current) => new Map(current).set(item.id, item))
                  }
                  onEquipmentSearchChange={setEquipmentSearch}
                  onRelatedExerciseSearchChange={setRelatedExerciseSearch}
                  relatedExerciseOptions={relatedExerciseOptions}
                  relatedExercisePaging={relatedCandidates}
                  relatedExerciseSearch={relatedExerciseSearch}
                  selectedEquipment={selectedEquipment}
                  selectedRelatedExercises={selectedRelatedExercises}
                />
              </TabsContent>
            </Tabs>

            <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t p-4">
              {submitErrorKind && hasFormErrors ? (
                <p role="alert" className="text-destructive mr-auto text-xs">
                  {submitErrorKind === 'missing'
                    ? '未入力の項目があります'
                    : '入力内容に誤りがあります'}
                </p>
              ) : null}
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={translation.isTranslating}
                onClick={() =>
                  leaveTo(
                    isEdit && defaultDetail
                      ? navigate('/exercises/[id]', defaultDetail.id)
                      : navigate('/exercises'),
                  )
                }
              >
                キャンセル
              </Button>
              <Button type="submit" size="lg" disabled={isSaving || isUploading}>
                {translation.isTranslating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    翻訳中...
                  </>
                ) : isEdit ? (
                  '変更を保存する'
                ) : (
                  '登録する'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <AlertDialog open={equipmentClearOpen} onOpenChange={setEquipmentClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>紐づけ機材を解除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {`器具種別を「なし（自重）」に変更すると、現在紐づけている機材（${selectedLinkedEquipmentIds.length}件）がすべて解除されます。この操作は元に戻せません。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingToolId(null);
                setEquipmentClearOpen(false);
              }}
            >
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                form.setValue('toolId', pendingToolId ?? bodyweightToolId ?? '', {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                form.setValue('linkedEquipmentIds', [], {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setEquipmentSearch('');
                setPendingToolId(null);
                setEquipmentClearOpen(false);
              }}
            >
              解除して変更する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* E-03 L237: confirm before saving equipment of another 器具種別. */}
      <AlertDialog open={mismatchConfirmOpen} onOpenChange={setMismatchConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>器具種別が一致しない機材があります</AlertDialogTitle>
            <AlertDialogDescription render={<div />}>
              <p className="[overflow-wrap:anywhere]">
                {`このエクササイズの器具種別「${toolLabel}」と異なる機材が紐づけられています。このまま保存しますか？`}
              </p>
              <ul className="mt-2 ml-5 max-h-48 list-disc overflow-y-auto">
                {mismatchedEquipment.map((item) => (
                  <li key={item.id} className="text-sm [overflow-wrap:anywhere]">
                    {item.label}（{item.toolName ?? '未設定'}）
                  </li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>戻って修正する</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                skipMismatchCheckRef.current = true;
                setMismatchConfirmOpen(false);
                void handleFormSubmit();
              }}
            >
              このまま保存する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* TODO(round3) R304 — FR-014: 再翻訳 over a hand-edited English text asks first; cancel
        (incl. ESC / outside click) keeps the text and clears the badge.
      <AlertDialog
        open={translation.confirmField !== null}
        onOpenChange={(open) => {
          if (!open) translation.cancelRetranslate();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>再翻訳で上書きしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              手動で編集された英語テキストがあります。上書きすると手動編集の内容は機械翻訳の結果に置き換わります。キャンセルした場合は現在の内容を保持します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => translation.cancelRetranslate()}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => translation.confirmRetranslate()}>
              上書きして再翻訳する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
    </ExerciseTranslationContext.Provider>
  );
}
