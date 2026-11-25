'use client';

import { Suspense, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Error as ErrorView } from '@/components/common/data-state-boundary/error';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import {
  adminRoutineMasterControllerDetailQueryKey,
  adminRoutineMasterControllerDuplicateMutation,
  adminRoutineMasterControllerListCategoriesOptions,
  adminRoutineMasterControllerListOptions,
  adminRoutineMasterControllerListQueryKey,
  adminRoutineMasterControllerPublishMutation,
  adminRoutineMasterControllerRemoveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { RoutineListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { RoutineDeleteDialog } from './_components/routine-delete-dialog';
import { RoutineFilters } from './_components/routine-filters';
import { RoutineRowActions } from './_components/routine-row-actions';
import { getRoutineTableColumns } from './_components/routine-table-columns';
import {
  ROUTINE_PAGE_SIZE_OPTIONS,
  ROUTINE_PUBLISH_STATUS_LABELS,
} from './_constants/routine.constants';
import { useRoutineFilters } from './_hooks/use-routine-filters.hook';
import { useSingleFlight } from './_hooks/use-single-flight.hook';

function RoutinesPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const queryClient = useQueryClient();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoutineListItemDto | null>(null);

  const {
    filters,
    queryParams,
    searchInput,
    setSearchInput,
    setFilters,
    clearFilters,
    currentPage,
    setCurrentPage,
    setPageSize,
    pageSize,
    hasActiveFilters,
    activeFilterCount,
  } = useRoutineFilters();

  // No sort in the URL = the API default (updatedAt desc), so 最終更新日 shows it as active.
  const sorting: SortingState = filters.rt_sort_by
    ? [{ id: filters.rt_sort_by, desc: filters.rt_sort_order === 'desc' }]
    : [{ id: 'updatedAt', desc: true }];

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminRoutineMasterControllerListOptions({ query: queryParams }),
  });

  // Unfiltered total for the `N件` badge / FilterResult denominator — the API has no
  // `totalAllItems`, so a `limit: 1` baseline runs only while a filter is active.
  const { data: baselineData } = useQuery({
    ...adminRoutineMasterControllerListOptions({ query: { page: 1, limit: 1 } }),
    enabled: hasActiveFilters,
  });

  const { data: categoriesData } = useQuery({
    ...adminRoutineMasterControllerListCategoriesOptions(),
  });
  const categories = categoriesData?.items ?? [];

  const singleFlight = useSingleFlight();

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: adminRoutineMasterControllerListQueryKey() });
  };

  const publishMutation = useMutation({
    ...adminRoutineMasterControllerPublishMutation(),
    onSuccess: (result) => {
      toast.success(
        result.publishStatus === 'published'
          ? `「${result.name}」を公開にしました`
          : `「${result.name}」を非公開にしました`,
      );
      invalidateList();
      queryClient.invalidateQueries({
        queryKey: adminRoutineMasterControllerDetailQueryKey({ path: { id: result.id } }),
      });
    },
    // Error toast comes from the shared MutationCache; refetch so a raced row shows its real state.
    onError: () => invalidateList(),
  });

  const duplicateMutation = useMutation({
    ...adminRoutineMasterControllerDuplicateMutation(),
    onSuccess: (result) => {
      // The API names the copy 「（元の名称）のコピー」 (FR-012) — shown as returned.
      toast.success(`「${result.name}」を作成しました`, {
        description: '公開ステータス: 非公開。複製先の編集画面に移動します',
      });
      invalidateList();
      router.push(navigate('/routines/[id]/edit', result.id));
    },
  });

  const deleteMutation = useMutation({
    ...adminRoutineMasterControllerRemoveMutation(),
    onSuccess: () => {
      toast.success('ルーティンを削除しました');
      setDeleteTarget(null);
      invalidateList();
    },
    // E-RTM-002 (published) etc. are toasted by the shared MutationCache.
    onError: () => invalidateList(),
  });

  const items = data?.items ?? [];
  const total = data?.pagination.totalItems ?? 0;
  const totalAllItems = hasActiveFilters ? (baselineData?.pagination.totalItems ?? 0) : total;
  const page = data?.pagination.page ?? currentPage;
  const limit = data?.pagination.limit ?? pageSize;
  const lastPage = Math.max(1, Math.ceil(total / limit));

  // Deleting the only row of the last page leaves the URL on a page past the end: move back.
  useEffect(() => {
    if (data && data.items.length === 0 && currentPage > 1 && total > 0) {
      setCurrentPage(lastPage);
    }
  }, [data, currentPage, total, lastPage, setCurrentPage]);

  const filterSummary = [
    filters.rt_keyword ? `検索: "${filters.rt_keyword}"` : '',
    filters.rt_category
      ? `カテゴリ: ${
          categories.find((category) => category.id === filters.rt_category)?.name ??
          filters.rt_category
        }`
      : '',
    filters.rt_status ? `ステータス: ${ROUTINE_PUBLISH_STATUS_LABELS[filters.rt_status]}` : '',
  ]
    .filter(Boolean)
    .join('、');

  const columns = getRoutineTableColumns((routine) => (
    <RoutineRowActions
      routine={routine}
      onEdit={() => router.push(withReturnTo(navigate('/routines/[id]/edit', routine.id)))}
      onDuplicate={() =>
        singleFlight((release) =>
          duplicateMutation.mutate({ path: { id: routine.id } }, { onSettled: release }),
        )
      }
      onTogglePublish={() =>
        publishMutation.mutate({
          path: { id: routine.id },
          body: {
            publishStatus: routine.publishStatus === 'published' ? 'unpublished' : 'published',
          },
        })
      }
      onDelete={() => setDeleteTarget(routine)}
    />
  ));

  return (
    <>
      <PageHeader
        title="ルーティン管理"
        badge={
          <Badge variant="outline" className="text-xs">
            {totalAllItems.toLocaleString()}件
          </Badge>
        }
        actions={
          <RoleGatedButton
            requiredPermission={Permission.RoutinesCreate}
            className="gap-1"
            denyTooltip="ルーティンの登録権限がありません"
            onClick={() => router.push(withReturnTo(navigate('/routines/create')))}
          >
            <Plus className="size-4" />
            新規登録
          </RoleGatedButton>
        }
      />

      <div className="bg-background flex flex-1 flex-col px-6 py-4">
        <Card className="gap-0 overflow-hidden rounded-xl border py-0">
          <div className="space-y-3 px-4 py-3">
            <RoutineFilters
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              isFilterOpen={isFilterOpen}
              setIsFilterOpen={setIsFilterOpen}
              activeFilterCount={activeFilterCount}
              categoryId={filters.rt_category}
              publishStatus={filters.rt_status}
              onCategoryChange={(categoryId) => setFilters({ rt_category: categoryId, rt_page: 1 })}
              onStatusChange={(status) => setFilters({ rt_status: status, rt_page: 1 })}
              onClearFilters={clearFilters}
            />
          </div>

          <FilterResultBanner
            show={hasActiveFilters}
            totalCount={totalAllItems}
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
            errorTitle="ルーティンの取得に失敗しました"
            variant="simple"
            className="rounded-none border-x-0 border-b-0"
            onRowClick={(row) => router.push(withReturnTo(navigate('/routines/[id]', row.id)))}
            emptyContent={
              isError && !data ? (
                <ErrorView title="ルーティンの取得に失敗しました" onRetry={() => void refetch()} />
              ) : (
                <Empty
                  variant={hasActiveFilters ? 'filtered' : 'empty'}
                  entityLabel="ルーティン"
                  title={hasActiveFilters ? undefined : '登録されたルーティンはありません'}
                  onAction={hasActiveFilters ? clearFilters : undefined}
                />
              )
            }
            containerClassName={
              isFilterOpen ? 'max-h-[calc(100vh-330px)]' : 'max-h-[calc(100vh-286px)]'
            }
            tableOptions={{
              manualSorting: true,
              getRowId: (originalRow) => originalRow.id,
              onSortingChange: (updater) => {
                const next = typeof updater === 'function' ? updater(sorting) : updater;
                if (next.length === 0) {
                  // Clearing from the default (updatedAt desc) would land on that same default,
                  // so the click goes to ascending instead.
                  if (!filters.rt_sort_by) {
                    setFilters({ rt_sort_by: 'updatedAt', rt_sort_order: 'asc', rt_page: 1 });
                    return;
                  }
                  setFilters({ rt_sort_by: null, rt_sort_order: null, rt_page: 1 });
                  return;
                }
                setFilters({
                  rt_sort_by: next[0]?.id as typeof filters.rt_sort_by,
                  rt_sort_order: next[0]?.desc ? 'desc' : 'asc',
                  rt_page: 1,
                });
              },
              state: { sorting },
            }}
          />

          {data && (
            <TablePaginationWithSize
              total={total}
              currentPage={page}
              pageSize={limit}
              pageSizeOptions={ROUTINE_PAGE_SIZE_OPTIONS}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>

      <RoutineDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        routineName={deleteTarget?.name ?? ''}
        isPublished={deleteTarget?.publishStatus === 'published'}
        isSubmitting={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          const id = deleteTarget.id;
          singleFlight((release) =>
            deleteMutation.mutate({ path: { id } }, { onSettled: release }),
          );
        }}
      />
    </>
  );
}

export default function RoutinesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RoutinesPageContent />
    </Suspense>
  );
}
