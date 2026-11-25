'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import { AlertTriangle } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card } from '@/components/ui/card';

import { adminRelayControllerControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { RelayControllerListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { ControllerFilters } from './_components/controller-filters';
import { getControllerTableColumns } from './_components/controller-table-columns';
import { useControllerFilters } from './_hooks/use-controller-filters';
import { invalidateDivergentControllerLists } from './_utils/controller-cache.util';

function ControllersPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const withReturnTo = useWithReturnTo();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const {
    activeFilterCount,
    clearFilters,
    currentPage,
    filters,
    hasActiveFilters,
    pageSize,
    queryParams,
    searchInput,
    setCurrentPage,
    setFilters,
    setPageSize,
    setSearchInput,
    showStoreColumn,
  } = useControllerFilters();

  // The default `createdAt` order has no column, so no header shows as sorted.
  const sorting: SortingState =
    filters.controller_sort_by === 'createdAt'
      ? []
      : [{ id: filters.controller_sort_by, desc: filters.controller_sort_order === 'desc' }];

  // `keepPreviousData` keeps the current rows on screen while the next query key resolves, so the
  // table dims under an overlay instead of flashing back to skeleton on every keystroke.
  const { data, isLoading, isFetching, isError, isPlaceholderData, refetch } = useQuery({
    ...adminRelayControllerControllerListOptions({ query: queryParams }),
    placeholderData: keepPreviousData,
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const columns = useMemo(() => getControllerTableColumns(showStoreColumn), [showStoreColumn]);
  const total = data?.pagination.totalItems ?? 0;
  const page = data?.pagination.page ?? currentPage;
  const limit = data?.pagination.limit ?? pageSize;
  const totalPages = data?.pagination.totalPages ?? 0;

  /**
   * The result set can shrink under a page that is already out of range (a filter narrowed it, or
   * units were removed elsewhere) and the API echoes the requested page back rather than clamping
   * it. Fall back to the last page that still holds rows instead of showing an empty table, and
   * only once the response for the current key has actually arrived.
   */
  useEffect(() => {
    if (isFetching) return;
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [isFetching, totalPages, currentPage, setCurrentPage]);

  /**
   * BUG-E02-D-09 — another user's create / delete is only seen by the next request, while every
   * other cached page of the same result set (other sorts / pages, and the layout's tab count)
   * keeps its old total for the 2-minute staleTime. A fresh response whose total disagrees with
   * them proves they are stale, so they are invalidated: the tab count refetches now, and a
   * previously visited sort refetches instead of being served without the new row.
   */
  const { q, storeId, status } = queryParams;
  useEffect(() => {
    if (!data || isPlaceholderData) return;
    invalidateDivergentControllerLists(
      queryClient,
      { q, storeId, status },
      data.pagination.totalItems,
    );
  }, [queryClient, data, isPlaceholderData, q, storeId, status]);

  return (
    <div className="space-y-4">
      <Card className="gap-3 overflow-hidden rounded-xl border p-0">
        <div className="p-3 pb-0">
          <ControllerFilters
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            status={filters.controller_status}
            onStatusChange={(status) =>
              setFilters({ controller_status: status, controller_page: 1 })
            }
            activeFilterCount={activeFilterCount}
            isFilterOpen={isFilterOpen}
            setIsFilterOpen={setIsFilterOpen}
          />
        </div>

        <DataTable
          columns={columns}
          data={items}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
          onRetry={() => void refetch()}
          errorTitle="接点制御装置一覧の取得に失敗しました"
          variant="simple"
          className="rounded-none border-x-0 border-b-0"
          containerClassName="max-h-[calc(100vh-330px)]"
          onRowClick={(row) => router.push(withReturnTo(navigate('/controllers/[id]', row.id)))}
          // BUG-E02-D-07 — a failed request (500 / 403 / 400) must not read as "nothing is
          // registered": it gets its own error state with a retry, and the filters stay reachable.
          emptyContent={
            isError ? (
              <Empty
                icon={AlertTriangle}
                title="接点制御装置一覧の取得に失敗しました"
                description="時間をおいて再度お試しください。"
                actionLabel="再試行"
                onAction={() => void refetch()}
              />
            ) : hasActiveFilters ? (
              <Empty variant="filtered" entityLabel="接点制御装置" onAction={clearFilters} />
            ) : (
              <Empty variant="empty" title="登録されている接点制御装置はありません" />
            )
          }
          // 異常 rows are tinted with a left accent bar as in the prototype's controller panel
          // (fitness-crm-ui f2fe3f9) — same treatment as the device list and the devices tab.
          getRowClassName={(row: RelayControllerListItemDto) =>
            row.status === 'abnormal'
              ? 'bg-destructive/10 shadow-[inset_4px_0_0_0_var(--destructive)] hover:bg-destructive/15'
              : undefined
          }
          tableOptions={{
            manualSorting: true,
            getRowId: (originalRow) => originalRow.id,
            onSortingChange: (updater) => {
              const next = typeof updater === 'function' ? updater(sorting) : updater;
              const column = next[0];

              setFilters({
                controller_sort_by: (column?.id ??
                  'createdAt') as typeof filters.controller_sort_by,
                controller_sort_order: !column || column.desc ? 'desc' : 'asc',
                controller_page: 1,
              });
            },
            state: { sorting },
          }}
        />

        {total > 0 && (
          <TablePaginationWithSize
            total={total}
            currentPage={page}
            pageSize={limit}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </Card>
    </div>
  );
}

export default function ControllersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ControllersPageContent />
    </Suspense>
  );
}
