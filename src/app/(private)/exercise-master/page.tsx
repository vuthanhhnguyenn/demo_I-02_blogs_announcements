'use client';

import { Suspense, useMemo, useRef, useState } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminExerciseRefMasterControllerCreateCategoryMutation,
  adminExerciseRefMasterControllerCreateExplanationMutation,
  adminExerciseRefMasterControllerCreateMuscleMutation,
  // TODO(round3) R303 — tag CRUD is phase 2 (seed data only, D24).
  // adminExerciseRefMasterControllerCreateTagMutation,
  adminExerciseRefMasterControllerCreateTypeMutation,
  adminExerciseRefMasterControllerDeleteCategoryMutation,
  adminExerciseRefMasterControllerDeleteExplanationMutation,
  adminExerciseRefMasterControllerDeleteMuscleMutation,
  // adminExerciseRefMasterControllerDeleteTagMutation,
  adminExerciseRefMasterControllerDeleteTypeMutation,
  adminExerciseRefMasterControllerListCategoriesQueryKey,
  adminExerciseRefMasterControllerListExplanationsQueryKey,
  adminExerciseRefMasterControllerListMusclesQueryKey,
  adminExerciseRefMasterControllerListTagsQueryKey,
  adminExerciseRefMasterControllerListTypesQueryKey,
  adminExerciseRefMasterControllerUpdateCategoryMutation,
  adminExerciseRefMasterControllerUpdateExplanationMutation,
  adminExerciseRefMasterControllerUpdateMuscleMutation,
  // adminExerciseRefMasterControllerUpdateTagMutation,
  adminExerciseRefMasterControllerUpdateTypeMutation,
  adminTrainingEquipmentControllerCreateToolTypeMutation,
  adminTrainingEquipmentControllerDeleteToolTypeMutation,
  adminTrainingEquipmentControllerToolTypesQueryKey,
  adminTrainingEquipmentControllerUpdateToolTypeMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { UserRole } from '@/types/permission.type';

import { ExerciseMasterDeleteDialog } from './_components/exercise-master-delete-dialog';
import { ExerciseMasterFormDialog } from './_components/exercise-master-form-dialog';
import { ExerciseMasterTabPanel } from './_components/exercise-master-tab-panel';
import {
  type ExerciseMasterRow,
  type FormMode,
  TAB_META,
  TAB_ORDER,
  type TabKey,
  getMasterRowName,
} from './_constants/constants';
import { useMasterTabSummaries } from './_hooks/use-master-lists';
import {
  EMPTY_EXERCISE_MASTER_FORM_VALUES,
  type ExerciseMasterFormSubmitValues,
  type ExerciseMasterFormValues,
} from './_schemas/exercise-master-form.schema';
import {
  EXERCISE_MASTER_ERROR_CODE,
  getExerciseMasterErrorCode,
  toCreateExplanationBody,
  toCreateMasterBody,
  toCreateToolTypeBody,
  toUpdateExplanationBody,
  toUpdateMasterBody,
  toUpdateToolTypeBody,
} from './_utils/exercise-master-api.util';

function ExerciseMasterPageContent() {
  const { hasRole, isLoading: isAuthLoading } = useAuthUser();
  const queryClient = useQueryClient();
  const canAccess = hasRole([UserRole.System, UserRole.Headquarter]);
  const [activeTab, setActiveTab] = useState<TabKey>('category');
  const [formState, setFormState] = useState<{
    open: boolean;
    mode: FormMode;
    kind: TabKey;
    row: ExerciseMasterRow | null;
  }>({
    open: false,
    mode: 'create',
    kind: 'category',
    row: null,
  });
  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    kind: TabKey;
    row: ExerciseMasterRow | null;
  }>({
    open: false,
    kind: 'category',
    row: null,
  });

  // Tab counts and the next 表示順 — the tables themselves are listed by each tab panel.
  const summaries = useMasterTabSummaries(canAccess);

  const queryKeys = {
    category: adminExerciseRefMasterControllerListCategoriesQueryKey(),
    muscle: adminExerciseRefMasterControllerListMusclesQueryKey(),
    tool: adminTrainingEquipmentControllerToolTypesQueryKey(),
    exercise_type: adminExerciseRefMasterControllerListTypesQueryKey(),
    tag: adminExerciseRefMasterControllerListTagsQueryKey(),
    explanation: adminExerciseRefMasterControllerListExplanationsQueryKey(),
  };

  const activeLabel = TAB_META[activeTab].label;
  const activeCount = summaries[activeTab].total;
  const nextSortOrder = String(summaries[activeTab].topSortOrder + 1);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Double-click guards: `isPending` re-renders a tick after `mutate`, so a fast second click
  // (or a second async form validation) would otherwise send a second request.
  const saveInFlightRef = useRef(false);
  const deleteInFlightRef = useRef(false);

  // The shared MutationCache toast is suppressed for saves: a duplicate code is shown only under
  // the コード field, every other failure is toasted here.
  const saveCallbacks = (kind: TabKey, verb: '登録' | '更新') => ({
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      toast.success(`${TAB_META[kind].label}を${verb}しました`);
      void queryClient.invalidateQueries({ queryKey: queryKeys[kind] });
      setFormState((current) => ({ ...current, open: false, row: null }));
    },
    onError: (error: unknown) => {
      if (getExerciseMasterErrorCode(error) === EXERCISE_MASTER_ERROR_CODE.codeExists) {
        setCodeError('このコードは既に登録されています');
        return;
      }
      toast.error(resolveApiErrorMessage(error));
    },
    onSettled: () => {
      saveInFlightRef.current = false;
    },
  });
  // Failures are toasted by the shared MutationCache.
  const deleteCallbacks = (kind: TabKey) => ({
    onSuccess: () => {
      toast.success('参照マスタを削除しました');
      void queryClient.invalidateQueries({ queryKey: queryKeys[kind] });
      setDeleteState((current) => ({ ...current, open: false, row: null }));
    },
    onError: (error: unknown) => {
      // Already deleted elsewhere (stale list): close the confirm and show the true state.
      if (getApiErrorStatus(error) === 404) {
        void queryClient.invalidateQueries({ queryKey: queryKeys[kind] });
        setDeleteState((current) => ({ ...current, open: false, row: null }));
      }
    },
    onSettled: () => {
      deleteInFlightRef.current = false;
    },
  });

  const createCategoryMutation = useMutation({
    ...adminExerciseRefMasterControllerCreateCategoryMutation(),
    ...saveCallbacks('category', '登録'),
  });
  const createMuscleMutation = useMutation({
    ...adminExerciseRefMasterControllerCreateMuscleMutation(),
    ...saveCallbacks('muscle', '登録'),
  });
  const createToolMutation = useMutation({
    ...adminTrainingEquipmentControllerCreateToolTypeMutation(),
    ...saveCallbacks('tool', '登録'),
  });
  const createExerciseTypeMutation = useMutation({
    ...adminExerciseRefMasterControllerCreateTypeMutation(),
    ...saveCallbacks('exercise_type', '登録'),
  });
  // TODO(round3) R303
  // const createTagMutation = useMutation({
  //   ...adminExerciseRefMasterControllerCreateTagMutation(),
  //   ...saveCallbacks('tag', '登録'),
  // });
  const createExplanationMutation = useMutation({
    ...adminExerciseRefMasterControllerCreateExplanationMutation(),
    ...saveCallbacks('explanation', '登録'),
  });
  const updateCategoryMutation = useMutation({
    ...adminExerciseRefMasterControllerUpdateCategoryMutation(),
    ...saveCallbacks('category', '更新'),
  });
  const updateMuscleMutation = useMutation({
    ...adminExerciseRefMasterControllerUpdateMuscleMutation(),
    ...saveCallbacks('muscle', '更新'),
  });
  const updateToolMutation = useMutation({
    ...adminTrainingEquipmentControllerUpdateToolTypeMutation(),
    ...saveCallbacks('tool', '更新'),
  });
  const updateExerciseTypeMutation = useMutation({
    ...adminExerciseRefMasterControllerUpdateTypeMutation(),
    ...saveCallbacks('exercise_type', '更新'),
  });
  // TODO(round3) R303
  // const updateTagMutation = useMutation({
  //   ...adminExerciseRefMasterControllerUpdateTagMutation(),
  //   ...saveCallbacks('tag', '更新'),
  // });
  const updateExplanationMutation = useMutation({
    ...adminExerciseRefMasterControllerUpdateExplanationMutation(),
    ...saveCallbacks('explanation', '更新'),
  });
  const deleteCategoryMutation = useMutation({
    ...adminExerciseRefMasterControllerDeleteCategoryMutation(),
    ...deleteCallbacks('category'),
  });
  const deleteMuscleMutation = useMutation({
    ...adminExerciseRefMasterControllerDeleteMuscleMutation(),
    ...deleteCallbacks('muscle'),
  });
  const deleteToolMutation = useMutation({
    ...adminTrainingEquipmentControllerDeleteToolTypeMutation(),
    ...deleteCallbacks('tool'),
  });
  const deleteExerciseTypeMutation = useMutation({
    ...adminExerciseRefMasterControllerDeleteTypeMutation(),
    ...deleteCallbacks('exercise_type'),
  });
  // TODO(round3) R303
  // const deleteTagMutation = useMutation({
  //   ...adminExerciseRefMasterControllerDeleteTagMutation(),
  //   ...deleteCallbacks('tag'),
  // });
  const deleteExplanationMutation = useMutation({
    ...adminExerciseRefMasterControllerDeleteExplanationMutation(),
    ...deleteCallbacks('explanation'),
  });

  const initialValues = useMemo<ExerciseMasterFormValues>(() => {
    if (formState.mode === 'edit' && formState.row) {
      return {
        code: formState.row.code,
        name: getMasterRowName(formState.row),
        description: formState.row.description ?? '',
        sortOrder: String(formState.row.sortOrder),
      };
    }

    return {
      ...EMPTY_EXERCISE_MASTER_FORM_VALUES,
      sortOrder: nextSortOrder,
    };
  }, [formState.mode, formState.row, nextSortOrder]);

  const handleSave = (values: ExerciseMasterFormSubmitValues) => {
    if (saveInFlightRef.current) return;
    setCodeError(null);
    if (formState.mode === 'create') {
      saveInFlightRef.current = true;
      const body = toCreateMasterBody(values);
      if (formState.kind === 'category') createCategoryMutation.mutate({ body });
      if (formState.kind === 'muscle') createMuscleMutation.mutate({ body });
      if (formState.kind === 'tool')
        createToolMutation.mutate({ body: toCreateToolTypeBody(values) });
      if (formState.kind === 'exercise_type') createExerciseTypeMutation.mutate({ body });
      // TODO(round3) R303
      // if (formState.kind === 'tag') createTagMutation.mutate({ body });
      if (formState.kind === 'explanation') {
        createExplanationMutation.mutate({ body: toCreateExplanationBody(values) });
      }
      return;
    }

    if (!formState.row) {
      toast.error('入力内容を確認してください');
      return;
    }

    saveInFlightRef.current = true;
    const path = { id: formState.row.id };
    const body = toUpdateMasterBody(values);
    if (formState.kind === 'category') updateCategoryMutation.mutate({ path, body });
    if (formState.kind === 'muscle') updateMuscleMutation.mutate({ path, body });
    if (formState.kind === 'tool') {
      updateToolMutation.mutate({ path, body: toUpdateToolTypeBody(values) });
    }
    if (formState.kind === 'exercise_type') updateExerciseTypeMutation.mutate({ path, body });
    // TODO(round3) R303
    // if (formState.kind === 'tag') updateTagMutation.mutate({ path, body });
    if (formState.kind === 'explanation') {
      updateExplanationMutation.mutate({ path, body: toUpdateExplanationBody(values) });
    }
  };

  if (isAuthLoading) {
    return <Loading />;
  }

  if (!canAccess) {
    return (
      <>
        <PageHeader
          breadcrumb={
            <BackToListLink label="エクササイズ管理に戻る" listPath={navigate('/exercises')} />
          }
          title="参照マスタ管理"
        />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground text-sm">
            参照マスタ管理は本部（Headquarter / System）のみアクセスできます
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb={
          <BackToListLink label="エクササイズ管理に戻る" listPath={navigate('/exercises')} />
        }
        title="参照マスタ管理"
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Database className="size-3.5" />
              {activeCount ?? '—'}件
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 rounded-full px-2.5 text-[11px] font-medium"
                    />
                  }
                >
                  本部
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="max-w-xs">
                  <p className="text-xs leading-5">
                    参照マスタ管理は本部（Headquarter / System）のみ操作できます
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        actions={
          // A read-only tab (タグ, phase 1 — R303) has no create button.
          TAB_META[activeTab].readOnly ? null : (
            <RoleGatedButton
              allowedRoles={[UserRole.System, UserRole.Headquarter]}
              denyTooltip="参照マスタ管理は本部のみ操作できます"
              type="button"
              className="gap-1 bg-black text-white hover:bg-black/90"
              onClick={() => {
                setFormState({
                  open: true,
                  mode: 'create',
                  kind: activeTab,
                  row: null,
                });
              }}
            >
              <Plus className="size-4" />
              {activeLabel}を登録
            </RoleGatedButton>
          )
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
          <TabsList variant="line">
            {TAB_ORDER.map((kind) => (
              <TabsTrigger key={kind} value={kind} className="text-sm">
                {TAB_META[kind].label}
                <Badge variant="outline" className="ml-1 min-w-5 px-1 tabular-nums">
                  {summaries[kind].total ?? '—'}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {TAB_ORDER.map((kind) => (
            // keepMounted: each tab keeps its own search and page across tab switches.
            <TabsContent key={kind} value={kind} keepMounted className="mt-3">
              <ExerciseMasterTabPanel
                kind={kind}
                isActive={activeTab === kind}
                unfilteredTotal={summaries[kind].total}
                onCreate={() => setFormState({ open: true, mode: 'create', kind, row: null })}
                onEdit={(row) => setFormState({ open: true, mode: 'edit', kind, row })}
                onDelete={(row) => setDeleteState({ open: true, kind, row })}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <ExerciseMasterFormDialog
        key={`${formState.mode}-${formState.kind}-${formState.row?.id ?? 'new'}-${formState.open ? 'open' : 'closed'}`}
        open={formState.open}
        mode={formState.mode}
        kind={formState.kind}
        isSubmitting={
          createCategoryMutation.isPending ||
          createMuscleMutation.isPending ||
          createToolMutation.isPending ||
          createExerciseTypeMutation.isPending ||
          createExplanationMutation.isPending ||
          updateCategoryMutation.isPending ||
          updateMuscleMutation.isPending ||
          updateToolMutation.isPending ||
          updateExerciseTypeMutation.isPending ||
          updateExplanationMutation.isPending
        }
        initialValues={initialValues}
        codeError={codeError}
        onOpenChange={(open) => {
          if (!open) {
            setCodeError(null);
            setFormState({
              open: false,
              mode: 'create',
              kind: activeTab,
              row: null,
            });
          }
        }}
        onSubmit={handleSave}
      />

      <ExerciseMasterDeleteDialog
        open={deleteState.open}
        label={TAB_META[deleteState.kind].label}
        row={deleteState.row}
        isSubmitting={
          deleteCategoryMutation.isPending ||
          deleteMuscleMutation.isPending ||
          deleteToolMutation.isPending ||
          deleteExerciseTypeMutation.isPending ||
          deleteExplanationMutation.isPending
        }
        onOpenChange={(open) => {
          if (!open) {
            setDeleteState({
              open: false,
              kind: activeTab,
              row: null,
            });
          }
        }}
        onConfirm={() => {
          if (!deleteState.row || deleteInFlightRef.current) return;
          deleteInFlightRef.current = true;
          if (deleteState.kind === 'category') {
            deleteCategoryMutation.mutate({ path: { id: deleteState.row.id } });
          }
          if (deleteState.kind === 'muscle') {
            deleteMuscleMutation.mutate({ path: { id: deleteState.row.id } });
          }
          if (deleteState.kind === 'tool') {
            deleteToolMutation.mutate({ path: { id: deleteState.row.id } });
          }
          if (deleteState.kind === 'exercise_type') {
            deleteExerciseTypeMutation.mutate({ path: { id: deleteState.row.id } });
          }
          // TODO(round3) R303
          // if (deleteState.kind === 'tag') {
          //   deleteTagMutation.mutate({ path: { id: deleteState.row.id } });
          // }
          if (deleteState.kind === 'explanation') {
            deleteExplanationMutation.mutate({ path: { id: deleteState.row.id } });
          }
        }}
      />
    </>
  );
}

export default function ExerciseMasterPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ExerciseMasterPageContent />
    </Suspense>
  );
}
