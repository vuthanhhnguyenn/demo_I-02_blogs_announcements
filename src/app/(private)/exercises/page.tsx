'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import { Database, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
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
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminExerciseMasterControllerDetailOptions,
  adminExerciseMasterControllerDetailQueryKey,
  adminExerciseMasterControllerListOptions,
  adminExerciseMasterControllerListQueryKey,
  adminExerciseMasterControllerPublishMutation,
  adminExerciseMasterControllerRemoveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { ExerciseListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission, UserRole } from '@/types/permission.type';

import { ExerciseCsvExportButton } from './_components/exercise-csv-export-button';
import { ExerciseDeleteDialogs } from './_components/exercise-delete-dialogs';
import { ExercisePublishConfirmDialog } from './_components/exercise-publish-confirm-dialog';
import { ExercisesFilters } from './_components/exercises-filters';
import { ExercisesTableColumns } from './_components/exercises-table-columns';
import {
  EXERCISE_LEVEL_LABELS,
  EXERCISE_STATUS_LABELS,
  type ExerciseDeleteBlockReason,
  findExerciseOptionLabel,
} from './_constants/constants';
import { useExerciseMasterOptions, useToolTypeLabel } from './_hooks/use-exercise-master-options';
import { type ExerciseSortKey, useExercisesFilters } from './_hooks/use-exercises-filters';
import { getExerciseDeleteBlockReason } from './_utils/exercise-error.util';
import {
  getExercisePublishStatus,
  hasIncompleteExerciseSteps,
  toPublishBody,
} from './_utils/exercise-status.util';

type ExerciseRow = ExerciseListItemDto;

/** Prototype `PermissionBadge type="hq"` (page-header-parts.tsx). */
function HeadquarterPermissionBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Badge
            variant="outline"
            className="text-muted-foreground cursor-default gap-1 text-xs font-normal"
          >
            <ShieldCheck className="size-3" />
            本部
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">本部権限が必要</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ExercisesPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const queryClient = useQueryClient();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<{
    row: ExerciseRow | null;
    mode: 'blocked' | 'confirm' | null;
    blockReason?: ExerciseDeleteBlockReason;
  }>({ row: null, mode: null });
  const filtersHook = useExercisesFilters();
  const {
    filters,
    setSorting,
    clearSorting,
    queryParams,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    hasActiveFilters,
    clearFilters,
  } = filtersHook;
  const { categoryOptions, primaryMuscleOptions } = useExerciseMasterOptions();
  const filterToolLabel = useToolTypeLabel(filters.toolId);
  const [unpublishTarget, setUnpublishTarget] = useState<ExerciseRow | null>(null);
  // The row 公開にする was clicked on, fixed at click time. `checking` while its detail is fetched
  // for the empty-steps check — the modal is already open then, so no other row can be operated.
  // Closing the modal aborts `check`, so a response arriving after キャンセル is ignored.
  const [publishDialog, setPublishDialog] = useState<{
    row: ExerciseRow;
    checking: boolean;
    check: AbortController;
  } | null>(null);
  // `isPending` reaches the button a render later; this drops a double-click's second DELETE.
  const deleteInFlightRef = useRef(false);

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminExerciseMasterControllerListOptions({
      query: queryParams,
    }),
  });
  // The header count and the banner's 「全 N 件」 are the unfiltered total, independent of filters.
  const { data: totalAllData } = useQuery({
    ...adminExerciseMasterControllerListOptions({
      query: { page: 1, limit: 1 },
    }),
  });
  const publishMutation = useMutation({
    ...adminExerciseMasterControllerPublishMutation(),
    onSuccess: (response, variables) => {
      const name = response.name;
      // The empty-steps warning is shown up front by the publish confirm dialog, not as a toast.
      toast.success(
        variables.body.publishStatus === 'published'
          ? `「${name}」を公開にしました`
          : `「${name}」を非公開にしました`,
      );
      // A cached detail still holding the old status would seed the edit form, whose save would
      // then publish it back — keep the detail cache in step with the list.
      queryClient.setQueryData(
        adminExerciseMasterControllerDetailQueryKey({ path: { id: variables.path.id } }),
        response,
      );
      void queryClient.invalidateQueries({
        queryKey: adminExerciseMasterControllerListQueryKey(),
      });
    },
  });

  // Repeat menu clicks for a row whose publish PATCH is still in flight are dropped (one request).
  const { mutate: mutatePublish, isPending: isPublishPending } = publishMutation;
  const pendingPublishId = isPublishPending ? publishMutation.variables?.path.id : undefined;
  const requestPublish = useCallback(
    (row: ExerciseRow, nextStatus: 'public' | 'private') => {
      if (pendingPublishId === row.id) return;
      mutatePublish({ path: { id: row.id }, body: toPublishBody(nextStatus) });
    },
    [mutatePublish, pendingPublishId],
  );

  // FR-007: the list rows carry no 解説ステップ, so the detail decides whether 公開にする first
  // asks to confirm (empty steps) or publishes in one click.
  const handlePublishClick = useCallback(
    async (row: ExerciseRow) => {
      const check = new AbortController();
      setPublishDialog({ row, checking: true, check });
      try {
        // staleTime 0: judge on the latest 解説ステップ, never on a detail cached by an earlier visit.
        const detail = await queryClient.fetchQuery({
          ...adminExerciseMasterControllerDetailOptions({ path: { id: row.id } }),
          staleTime: 0,
        });
        if (check.signal.aborted) return;
        if (hasIncompleteExerciseSteps(detail.descriptions.ja)) {
          setPublishDialog({ row, checking: false, check });
        } else {
          setPublishDialog(null);
          requestPublish(row, 'public');
        }
      } catch (error) {
        if (check.signal.aborted) return;
        setPublishDialog(null);
        toast.error(resolveApiErrorMessage(error));
      }
    },
    [queryClient, requestPublish],
  );

  // The delete-blocked 409s render in the dialog (FR-006), so the shared toast is suppressed and
  // every other failure is toasted here with the shared wording.
  const deleteMutation = useMutation({
    ...adminExerciseMasterControllerRemoveMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      toast.success(`「${deleteState.row?.name ?? ''}」を削除しました`);
      // Deleting the only row of a page past the first would leave an empty page — step back.
      if (items.length === 1 && page > 1) setCurrentPage(page - 1);
      void queryClient.invalidateQueries({
        queryKey: adminExerciseMasterControllerListQueryKey(),
      });
      setDeleteState({ row: null, mode: null });
    },
    onError: (error) => {
      const blockReason = getExerciseDeleteBlockReason(error);
      if (blockReason) {
        setDeleteState((prev) => ({ ...prev, mode: 'blocked', blockReason }));
        return;
      }
      toast.error(resolveApiErrorMessage(error));
    },
    onSettled: () => {
      deleteInFlightRef.current = false;
    },
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const total = pagination?.totalItems ?? 0;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;
  const totalAll = totalAllData?.pagination.totalItems ?? (hasActiveFilters ? undefined : total);
  const totalPages = pagination?.totalPages ?? 0;

  // A hand-edited `page` past the end (page=999) falls back to the last page.
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages, setCurrentPage]);

  // Prototype buildFilterSummary order: 検索 / カテゴリ / 主働筋 / 器具種別 / レベル / ステータス.
  const filterSummary = [
    queryParams.keyword ? `検索: "${queryParams.keyword}"` : '',
    filters.categoryId
      ? `カテゴリ: ${findExerciseOptionLabel(categoryOptions, filters.categoryId)}`
      : '',
    filters.primaryMuscleId
      ? `主働筋: ${findExerciseOptionLabel(primaryMuscleOptions, filters.primaryMuscleId)}`
      : '',
    filters.toolId ? `器具種別: ${filterToolLabel}` : '',
    filters.level ? `レベル: ${EXERCISE_LEVEL_LABELS[filters.level]}` : '',
    filters.publishStatus ? `ステータス: ${EXERCISE_STATUS_LABELS[filters.publishStatus]}` : '',
  ]
    .filter(Boolean)
    .join('、');

  // The default order (最終更新日 desc) is not a header selection: with no sort in the URL no header
  // is active, so 最終更新日 also cycles asc → desc → cleared on its first click.
  const sorting: SortingState = filters.sort
    ? [{ id: filters.sort, desc: (filters.order ?? 'desc') === 'desc' }]
    : [];
  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const [next] = typeof updater === 'function' ? updater(sorting) : updater;
    if (!next) {
      clearSorting();
      return;
    }
    // Only the columns rendering DataTableColumnHeader can reach here; their ids are the sort keys.
    setSorting(next.id as ExerciseSortKey, next.desc ? 'desc' : 'asc');
  };

  const columns = useMemo(
    () =>
      ExercisesTableColumns({
        categoryOptions,
        primaryMuscleOptions,
        onEdit: (id) => router.push(withReturnTo(navigate('/exercises/[id]/edit', id))),
        // FR-007: publish is one click unless a step is empty; unpublish asks 「非公開にしますか？」.
        onTogglePublish: (row) =>
          getExercisePublishStatus(row) === 'private'
            ? void handlePublishClick(row)
            : setUnpublishTarget(row),
        // A published exercise cannot be deleted (FR-006); the routine-use block arrives as a 409.
        onDelete: (row) =>
          getExercisePublishStatus(row) === 'public'
            ? setDeleteState({ row, mode: 'blocked', blockReason: 'published' })
            : setDeleteState({ row, mode: 'confirm' }),
      }),
    [categoryOptions, handlePublishClick, primaryMuscleOptions, router, withReturnTo],
  );

  return (
    <>
      <PageHeader
        title="エクササイズ管理"
        badge={
          <div className="flex items-center gap-2">
            <HeadquarterPermissionBadge />
            <Badge variant="outline" className="text-xs">
              {totalAll ?? '—'}件
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <ExerciseCsvExportButton query={filtersHook.exportQueryParams} />
            <RoleGatedButton
              allowedRoles={[UserRole.System, UserRole.Headquarter]}
              type="button"
              variant="outline"
              className="gap-1"
              denyTooltip="参照マスタ管理は本部のみアクセスできます"
              onClick={() => router.push(withReturnTo(navigate('/exercise-master')))}
            >
              <Database className="size-4" />
              参照マスタ管理
            </RoleGatedButton>
            <RoleGatedButton
              requiredPermission={Permission.ExercisesCreate}
              onClick={() => router.push(withReturnTo(navigate('/exercises/create')))}
            >
              <Plus className="size-4" />
              新規登録
            </RoleGatedButton>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
        <Card className="gap-3 overflow-hidden rounded-xl border p-0">
          <div className="p-3 pb-0">
            <ExercisesFilters
              filtersHook={filtersHook}
              isExpanded={isFilterOpen}
              onExpandedChange={setIsFilterOpen}
            />
          </div>

          <FilterResultBanner
            show={hasActiveFilters}
            totalCount={totalAll ?? total}
            filteredCount={total}
            filterSummary={filterSummary}
            onClear={clearFilters}
          />

          <DataTable
            columns={columns}
            data={items}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            errorTitle="エクササイズ一覧の取得に失敗しました"
            variant="simple"
            onRowClick={(row) => router.push(withReturnTo(navigate('/exercises/[id]', row.id)))}
            className="[&_thead_tr]:bg-muted/50 rounded-none border-x-0 border-b-0 text-xs [&_table]:text-xs [&_td]:text-xs [&_td]:leading-4 [&_th]:text-xs [&_th]:leading-4 [&_th]:font-semibold [&_thead_tr]:h-10"
            containerClassName={
              isFilterOpen ? 'max-h-[calc(100vh-330px)]' : 'max-h-[calc(100vh-286px)]'
            }
            emptyContent={
              isError ? (
                <div className="text-muted-foreground flex h-24 flex-col items-center justify-center gap-2 text-sm">
                  一覧の取得に失敗しました
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => void refetch()}
                  >
                    再試行
                  </Button>
                </div>
              ) : hasActiveFilters ? (
                <div className="text-muted-foreground flex h-24 flex-col items-center justify-center gap-2 text-sm">
                  条件に一致するエクササイズがありません
                  <Button variant="outline" size="sm" className="text-xs" onClick={clearFilters}>
                    条件をクリア
                  </Button>
                </div>
              ) : (
                <div className="text-muted-foreground flex h-24 items-center justify-center text-sm">
                  登録されたエクササイズはありません
                </div>
              )
            }
            tableOptions={{
              onSortingChange: handleSortingChange,
              manualSorting: true,
              state: { sorting },
            }}
          />

          {total > 0 && (
            <TablePaginationWithSize
              currentPage={page}
              total={total}
              onPageChange={setCurrentPage}
              pageSize={limit}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>

      <ExerciseDeleteDialogs
        mode={deleteState.mode}
        open={Boolean(deleteState.mode)}
        onOpenChange={(open) => {
          if (!open) setDeleteState({ row: null, mode: null });
        }}
        exerciseName={deleteState.row?.name ?? ''}
        blockReason={deleteState.blockReason}
        isPending={deleteMutation.isPending}
        onConfirmDelete={() => {
          if (!deleteState.row || deleteInFlightRef.current) return;
          deleteInFlightRef.current = true;
          deleteMutation.mutate({ path: { id: deleteState.row.id } });
        }}
      />

      <ExercisePublishConfirmDialog
        open={Boolean(publishDialog)}
        isChecking={publishDialog?.checking ?? false}
        onOpenChange={(open) => {
          if (open) return;
          publishDialog?.check.abort();
          setPublishDialog(null);
        }}
        onConfirm={() => {
          if (publishDialog && !publishDialog.checking) requestPublish(publishDialog.row, 'public');
        }}
      />

      <AlertDialog
        open={Boolean(unpublishTarget)}
        onOpenChange={(open) => {
          if (!open) setUnpublishTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader className="min-w-0">
            <AlertDialogTitle>非公開にしますか？</AlertDialogTitle>
            <AlertDialogDescription className="[overflow-wrap:anywhere] break-all">
              {`「${unpublishTarget?.name ?? ''}」を非公開にします。モバイルアプリからこのエクササイズは表示されなくなります。この操作は後から元に戻すことができます。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (unpublishTarget) requestPublish(unpublishTarget, 'private');
                setUnpublishTarget(null);
              }}
            >
              非公開にする
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ExercisesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ExercisesPageContent />
    </Suspense>
  );
}
