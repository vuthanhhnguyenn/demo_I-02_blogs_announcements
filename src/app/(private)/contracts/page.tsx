'use client';

import { Suspense, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';

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
  adminPlanControllerListOptions,
  adminStoreControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { ContractsFilters } from './_components/contracts-filters';
import { useContractsTableColumns } from './_components/contracts-table-columns';
import { PlanDeleteDialog } from './_components/plan-delete-dialog';
import {
  MAIN_CONTRACT_PAGE_SIZE_OPTIONS,
  MAIN_CONTRACT_STATUS_LABELS,
  MAIN_CONTRACT_TYPE_LABELS,
  type MainContractRow,
  PLAN_BRAND_LABELS,
} from './_constants/constants';
import { ContractsFiltersProvider } from './_contexts/contracts-filters-context';
import { DEFAULT_CONTRACT_SORT, useContractsFilters } from './_hooks/use-contracts-filters';

function ContractsPageContent() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MainContractRow | null>(null);
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const filtersHook = useContractsFilters();
  const {
    filters,
    setFilters,
    queryParams,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    hasActiveFilters,
    clearFilters,
  } = filtersHook;

  const {
    data: queryData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    ...adminPlanControllerListOptions({
      // 「N件」 in the header and 「全N件中M件」 in the filter banner are the *unfiltered* total,
      // which `includeTotalAll` returns as `pagination.totalAllItems`. Asked for only while a
      // filter is on — without one it equals `totalItems`, and the extra COUNT is wasted.
      query: { ...queryParams, includeTotalAll: hasActiveFilters || undefined },
    }),
    placeholderData: keepPreviousData,
    // The table keeps its previous rows on a failed refetch, so the failure needs its own
    // signal. Opts into the shared QueryCache toast rather than raising one here, so the
    // operator reads the backend's own message.
    meta: { showErrorToast: true },
  });

  // When a refetch fails after a successful load (new filter, page, sort), TanStack drops the
  // placeholder and `data` becomes undefined: keep showing the last good result so the table,
  // banner and toolbar stay usable. Only a first load with nothing to show becomes the error view.
  const [lastData, setLastData] = useState(queryData);
  if (queryData && queryData !== lastData) setLastData(queryData);
  const data = queryData ?? (isError ? lastData : undefined);

  // Resolves the 店舗 filter's name for the result banner; shares its cache with the filter panel.
  const { data: selectedStore } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: filters.store_id ?? '' } }),
    enabled: !!filters.store_id,
  });

  const contracts = data?.items ?? [];
  const pagination = data?.pagination;
  const totalContracts = pagination?.totalItems ?? 0;
  // `totalAllItems` may come back `null` when the server declines the count under load.
  const totalAllContracts = pagination?.totalAllItems ?? totalContracts;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  // A URL `page` past the last page (or left behind by a shrunk result set) gets an empty page
  // from the API: clamp to the last real page instead of showing an empty table.
  const totalPages = pagination?.totalPages ?? 0;
  useEffect(() => {
    if (data && contracts.length === 0 && totalContracts > 0 && totalPages > 0) {
      setCurrentPage(Math.min(currentPage, totalPages));
    }
  }, [data, contracts.length, totalContracts, totalPages, currentPage, setCurrentPage]);

  const filterSummary = [
    filters.search ? `"${filters.search}"` : null,
    filters.contract_type ? MAIN_CONTRACT_TYPE_LABELS[filters.contract_type] : null,
    filters.brand ? PLAN_BRAND_LABELS[filters.brand] : null,
    filters.store_id ? `店舗: ${selectedStore?.name ?? filters.store_id}` : null,
    filters.status ? MAIN_CONTRACT_STATUS_LABELS[filters.status] : null,
    filters.companion_benefit !== 'all'
      ? `同伴特典: ${filters.companion_benefit === 'true' ? 'あり' : 'なし'}`
      : null,
  ].filter((part): part is string => Boolean(part));

  // The default `createdAt` order has no column, so no header shows a sort indicator for it.
  const sorting: SortingState =
    filters.sort_by && filters.sort_by !== DEFAULT_CONTRACT_SORT.sort_by
      ? [{ id: filters.sort_by, desc: filters.sort_order === 'desc' }]
      : [];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (next.length === 0) {
      setFilters({ ...DEFAULT_CONTRACT_SORT, page: 1 });
      return;
    }
    setFilters({
      sort_by: next[0].id as typeof filters.sort_by,
      sort_order: next[0].desc ? 'desc' : 'asc',
      page: 1,
    });
  };

  const columns = useContractsTableColumns({ onDelete: setDeleteTarget });

  return (
    <>
      <PageHeader
        title="主契約管理"
        badge={
          <Badge variant="outline" className="text-xs">
            {totalAllContracts}件
          </Badge>
        }
        actions={
          <RoleGatedButton
            requiredPermission={Permission.ContractsCreate}
            onClick={() => router.push(withReturnTo(navigate('/contracts/create')))}
          >
            <Plus className="size-4" />
            新規登録
          </RoleGatedButton>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
        <Card className="gap-3 overflow-hidden rounded-xl border p-0">
          <div className="p-3 pb-0">
            <ContractsFiltersProvider value={filtersHook}>
              <ContractsFilters isFilterOpen={isFilterOpen} onFilterOpenChange={setIsFilterOpen} />
            </ContractsFiltersProvider>
          </div>

          <FilterResultBanner
            show={hasActiveFilters}
            totalCount={totalAllContracts}
            filteredCount={totalContracts}
            filterSummary={filterSummary}
            onClear={clearFilters}
          />

          <DataTable
            columns={columns}
            data={contracts}
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
            onRetry={() => void refetch()}
            errorTitle="主契約一覧の取得に失敗しました"
            emptyContent={
              isError && !data ? (
                <ErrorView onRetry={() => refetch()} />
              ) : (
                <Empty
                  variant={hasActiveFilters ? 'filtered' : 'empty'}
                  entityLabel="主契約"
                  onAction={hasActiveFilters ? clearFilters : undefined}
                />
              )
            }
            variant="simple"
            className="rounded-none border-x-0 border-b-0"
            containerClassName={
              isFilterOpen ? 'max-h-[calc(100vh-330px)]' : 'max-h-[calc(100vh-286px)]'
            }
            onRowClick={(row) => router.push(withReturnTo(navigate('/contracts/[id]', row.planId)))}
            tableOptions={{
              onSortingChange: handleSortingChange,
              manualSorting: true,
              state: {
                sorting,
              },
            }}
          />

          <TablePaginationWithSize
            currentPage={page}
            total={totalContracts}
            onPageChange={setCurrentPage}
            pageSize={limit}
            onPageSizeChange={setPageSize}
            pageSizeOptions={MAIN_CONTRACT_PAGE_SIZE_OPTIONS}
          />
        </Card>
      </div>

      {deleteTarget && (
        <PlanDeleteDialog
          planId={deleteTarget.planId}
          planName={deleteTarget.name}
          parentPlanId={deleteTarget.parentPlanId}
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        />
      )}
    </>
  );
}

export default function ContractsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ContractsPageContent />
    </Suspense>
  );
}
