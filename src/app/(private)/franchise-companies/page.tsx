'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { adminFcCompanyControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { FcCompanySummaryDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { FcPermissionDenied } from './[id]/_components/fc-permission-denied';
import { FranchiseCompanyDeleteDialog } from './[id]/_components/franchise-company-delete-dialog';
import { FranchiseCompaniesFilters } from './_components/franchise-companies-filters';
import { FranchiseCompaniesTableColumns } from './_components/franchise-companies-table-columns';
import {
  FRANCHISE_COMPANY_PAGE_SIZE_OPTIONS,
  FRANCHISE_COMPANY_SORT_COLUMNS,
  FRANCHISE_COMPANY_STATUS_FILTER_LABELS,
  type FcCompanySortColumn,
  MANAGEMENT_TYPE_LABELS,
} from './_constants/constants';
import { useFranchiseCompaniesFilters } from './_hooks/use-franchise-companies-filters';
import { isFcCompanyPermissionError } from './_utils/fc-company-api.util';

function FranchiseCompaniesPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const [deleteTarget, setDeleteTarget] = useState<FcCompanySummaryDto | null>(null);
  const filtersHook = useFranchiseCompaniesFilters();
  const {
    filters,
    setFilters,
    queryParams,
    currentPage,
    setCurrentPage,
    clampCurrentPage,
    pageSize,
    setPageSize,
    hasActiveFilters,
    clearFilters,
  } = filtersHook;

  const { data, isLoading, isFetching, isPlaceholderData, isError, error, refetch } = useQuery({
    ...adminFcCompanyControllerListOptions({
      query: { ...queryParams, includeTotalAll: hasActiveFilters || undefined },
    }),
    placeholderData: keepPreviousData,
  });

  const companies = data?.items ?? [];
  const pagination = data?.pagination;
  const filteredTotal = pagination?.totalItems ?? 0;
  const totalAllItems = pagination?.totalAllItems;
  const totalPages = pagination?.totalPages ?? 0;

  // `?page=9999` など総ページ数を超えたページは最後の有効なページへ丸める。
  // 丸めた結果が返るまでは（keepPreviousData で残る）範囲外レスポンスの 0 件を
  // 「FC企業がまだありません」として描かず、読み込み中として扱う
  const isPageOutOfRange =
    pagination !== undefined && totalPages > 0 && pagination.page > totalPages;
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      clampCurrentPage(totalPages);
    }
  }, [totalPages, currentPage, clampCurrentPage]);

  // 抽出バナー / ヘッダーバッジ用の絞り込み前件数 = totalAllItems。サーバーが null を返した
  // （負荷時に件数取得を見送った）場合のみ、絞り込みなしの件数を別途取得する
  const { data: unfilteredData } = useQuery({
    ...adminFcCompanyControllerListOptions({ query: { page: 1, limit: 1 } }),
    enabled: hasActiveFilters && data !== undefined && !isPlaceholderData && totalAllItems == null,
  });

  const totalCompanies = hasActiveFilters
    ? (totalAllItems ?? unfilteredData?.pagination.totalItems ?? filteredTotal)
    : filteredTotal;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  const filterSummary = [
    filters.search ? `"${filters.search}"` : '',
    filters.managementType ? `区分: ${MANAGEMENT_TYPE_LABELS[filters.managementType]}` : '',
    filters.status ? `ステータス: ${FRANCHISE_COMPANY_STATUS_FILTER_LABELS[filters.status]}` : '',
  ];

  // The initial 登録日時 order has no column, so no header shows a sort arrow
  const sorting: SortingState = FRANCHISE_COMPANY_SORT_COLUMNS.includes(
    filters.sortBy as FcCompanySortColumn,
  )
    ? [{ id: filters.sortBy, desc: filters.sortOrder === 'desc' }]
    : [];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const column = next[0]?.id;
    if (!column || !FRANCHISE_COMPANY_SORT_COLUMNS.includes(column as FcCompanySortColumn)) {
      setFilters({ sortBy: null, sortOrder: null, page: 1 });
      return;
    }

    setFilters({
      sortBy: column as FcCompanySortColumn,
      sortOrder: next[0].desc ? 'desc' : 'asc',
      page: 1,
    });
  };

  const columns = useMemo(
    () =>
      FranchiseCompaniesTableColumns({
        onDeleteClick: (company) => setDeleteTarget(company),
      }),
    [],
  );

  const deleteBlockedReason =
    deleteTarget && deleteTarget.managedStoreCount > 0 ? '管轄店舗が存在するため' : null;

  return (
    <>
      <PageHeader
        title="FC企業管理"
        badge={
          <Badge
            variant="outline"
            className="text-muted-foreground text-xs font-normal tabular-nums"
          >
            {totalCompanies.toLocaleString()}件
          </Badge>
        }
        actions={
          <RoleGatedButton
            requiredPermission={Permission.FCCompaniesCreate}
            className="gap-1"
            onClick={() => router.push(withReturnTo(navigate('/franchise-companies/create')))}
          >
            <Plus className="size-4" />
            新規登録
          </RoleGatedButton>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
        <Card className="gap-0 overflow-hidden rounded-xl border p-0">
          <div className="px-4 py-3">
            <FranchiseCompaniesFilters filtersHook={filtersHook} />
          </div>

          <FilterResultBanner
            show={hasActiveFilters}
            totalCount={totalCompanies}
            filteredCount={filteredTotal}
            filterSummary={filterSummary}
            onClear={clearFilters}
          />

          <DataTable
            columns={columns}
            data={companies}
            isLoading={isLoading || isPageOutOfRange}
            isFetching={isFetching}
            isError={isError}
            onRetry={() => void refetch()}
            errorTitle="FC企業一覧の取得に失敗しました"
            variant="simple"
            className="rounded-none border-x-0 border-b-0"
            containerClassName={
              hasActiveFilters ? 'max-h-[calc(100vh-370px)]' : 'max-h-[calc(100vh-320px)]'
            }
            onRowClick={(row) =>
              router.push(withReturnTo(navigate('/franchise-companies/[id]', row.id)))
            }
            emptyContent={
              // D15: the list is HQ-only on the BE — a 職位 that reaches the screen but not the
              // data gets a permission state, not a retry that can never succeed
              isError && isFcCompanyPermissionError(error) ? (
                <FcPermissionDenied description="FC企業一覧を参照する権限がありません" />
              ) : isError ? (
                <Empty
                  title="FC企業一覧の取得に失敗しました"
                  description="時間をおいて再度お試しください。"
                  onAction={() => void refetch()}
                  actionLabel="再試行"
                />
              ) : (
                <Empty
                  variant={hasActiveFilters ? 'filtered' : 'empty'}
                  entityLabel="FC企業"
                  onAction={hasActiveFilters ? clearFilters : undefined}
                />
              )
            }
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
            total={filteredTotal}
            pageSize={limit}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={FRANCHISE_COMPANY_PAGE_SIZE_OPTIONS}
          />
        </Card>
      </div>

      <FranchiseCompanyDeleteDialog
        companyId={deleteTarget?.id ?? ''}
        companyName={deleteTarget?.displayName ?? ''}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        redirectOnSuccess={false}
        blockedReason={deleteBlockedReason}
        wording="list"
      />
    </>
  );
}

export default function FranchiseCompaniesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <FranchiseCompaniesPageContent />
    </Suspense>
  );
}
