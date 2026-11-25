'use client';

import { Suspense, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { adminSuspensionWithdrawalControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { SuspWdrListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { LeavesCancelDialog } from './_components/leaves-cancel-dialog';
import { LeavesFilters } from './_components/leaves-filters';
import { LeavesMonthlySkeleton } from './_components/leaves-monthly-skeleton';
import { LeavesMonthlyView } from './_components/leaves-monthly-view';
import { LeavesTableColumns } from './_components/leaves-table-columns';
import { LEAVE_PAGE_SIZE_OPTIONS, LeaveType } from './_constants/constants';
import { LeavesFiltersProvider } from './_contexts/leaves-filters-context';
import { useLeavesFilters } from './_hooks/use-leaves-filters.hook';
import { useLeavesMonthly } from './_hooks/use-leaves-monthly.hook';

function LeavesPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const { currentStoreId } = useCurrentStore();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SuspWdrListItemDto | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtersHook = useLeavesFilters();
  const {
    filterParams,
    queryParams,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    isMonthlyView,
    isMonthlySuspensionOnly,
  } = filtersHook;

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminSuspensionWithdrawalControllerListOptions({ query: queryParams }),
    placeholderData: keepPreviousData,
    enabled: !isMonthlyView,
  });
  const monthly = useLeavesMonthly(filterParams, isMonthlyView);

  const leaves = data?.items ?? [];
  const isViewError = isMonthlyView ? monthly.isError : isError;
  const monthlyLeaves = (monthly.data?.leaves ?? []).filter(
    (row) => !isMonthlySuspensionOnly || row.applicationType === LeaveType.SUSPENSION,
  );
  // The count badge and the banner report applications in both views, after the in-screen scope.
  const total = isMonthlyView ? monthlyLeaves.length : (data?.pagination.totalItems ?? 0);
  // FR-024 — the banner's denominator is the store scope before any in-screen filter.
  const totalAll =
    (isMonthlyView ? monthly.data?.totalAll : data?.pagination.totalAllItems) ?? total;

  /**
   * FR-034 — an over-range page (e.g. after rows leave the filtered set) is pulled back to
   * the last page. The real list answers such a page with no rows rather than clamping it,
   * so the last page is derived from `totalPages`.
   *
   * `isFetching` excludes the window where `keepPreviousData` is still showing the
   * *previous* query's response — its page count belongs to the old filter and would
   * otherwise be written back over the reset to page 1.
   */
  const lastPage = data ? Math.max(1, data.pagination.totalPages) : undefined;
  useEffect(() => {
    if (!isFetching && lastPage !== undefined && currentPage > lastPage) {
      setCurrentPage(lastPage);
    }
  }, [isFetching, lastPage, currentPage, setCurrentPage]);

  const showStoreColumn = currentStoreId === ALL_STORES;
  const columns = LeavesTableColumns({ showStoreColumn, onCancelClick: setCancelTarget });

  // FR-033 — a page change returns the operator to the top of the table body.
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    scrollRef.current
      ?.querySelector('[data-slot="table-container"]')
      ?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const emptyContent = isViewError ? (
    <Empty
      icon={AlertCircle}
      title="休会・退会一覧の取得に失敗しました"
      description="通信状況をご確認のうえ、再度お試しください。"
      actionLabel="再読み込み"
      onAction={() => void (isMonthlyView ? monthly.refetch() : refetch())}
    />
  ) : (
    <Empty
      variant={filtersHook.hasActiveFilters ? 'filtered' : 'empty'}
      entityLabel="休会・退会"
      onAction={filtersHook.hasActiveFilters ? filtersHook.clearFilters : undefined}
    />
  );

  return (
    <LeavesFiltersProvider value={filtersHook}>
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader
          title="休会・退会管理"
          badge={
            <Badge
              variant="outline"
              className="text-muted-foreground text-xs font-normal tabular-nums"
            >
              {total.toLocaleString()}件
            </Badge>
          }
        />

        <div
          ref={scrollRef}
          className="bg-background flex min-h-0 flex-1 flex-col overflow-auto px-6 py-4"
        >
          <Card className="gap-0 overflow-hidden py-0">
            <LeavesFilters
              isFilterOpen={isFilterOpen}
              onFilterOpenChange={setIsFilterOpen}
              totalAll={totalAll}
              total={total}
            />

            {isMonthlyView ? (
              monthly.isPending ? (
                <LeavesMonthlySkeleton />
              ) : (
                <LeavesMonthlyView
                  leaves={monthlyLeaves}
                  showStoreName={showStoreColumn}
                  emptyContent={emptyContent}
                />
              )
            ) : (
              <DataTable
                columns={columns}
                data={leaves}
                isLoading={isLoading}
                isFetching={isFetching}
                isError={isError}
                onRetry={() => void refetch()}
                errorTitle="休会・退会一覧の取得に失敗しました"
                variant="simple"
                className="rounded-none border-x-0 border-b-0"
                containerClassName={
                  isFilterOpen ? 'max-h-[calc(100vh-330px)]' : 'max-h-[calc(100vh-280px)]'
                }
                onRowClick={(row) =>
                  router.push(
                    withReturnTo(
                      navigate('/members/leaves/[id]', row.applicationId, {
                        type: row.applicationType,
                      }),
                    ),
                  )
                }
                emptyContent={emptyContent}
              />
            )}

            {/* 月別ビュー shows the whole filtered set at once, so it has no pages; 一覧 keeps its footer when empty, like the staff / member lists. */}
            {!isMonthlyView && (
              <TablePaginationWithSize
                currentPage={currentPage}
                total={total}
                pageSize={pageSize}
                pageSizeOptions={LEAVE_PAGE_SIZE_OPTIONS}
                onPageChange={handlePageChange}
                onPageSizeChange={setPageSize}
              />
            )}
          </Card>
        </div>
      </div>

      <LeavesCancelDialog
        target={cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      />
    </LeavesFiltersProvider>
  );
}

export default function LeavesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LeavesPageContent />
    </Suspense>
  );
}
