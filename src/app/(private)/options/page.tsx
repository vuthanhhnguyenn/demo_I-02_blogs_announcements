'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Percent, Plus } from 'lucide-react';

import { useCurrentStoreBrand } from '@/hooks/use-current-store-brand.hook';
import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Error as ErrorView } from '@/components/common/data-state-boundary/error';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { adminOptionControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { OptionsFilters } from './_components/options-filters';
import { OptionsTableColumns } from './_components/options-table-columns';
import { OptionsFiltersProvider } from './_contexts/options-filters-context';
import {
  DEFAULT_OPTION_SORT,
  type OptionsFiltersState,
  useOptionsFilters,
} from './_hooks/use-options-filters';

function OptionsPageContent() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filtersHook = useOptionsFilters();
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
  const router = useRouter();
  const withReturnTo = useWithReturnTo();

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminOptionControllerListOptions({ query: { ...queryParams, includeTotalAll: true } }),
    placeholderData: keepPreviousData,
    // Offline: surface the failure (error view + retry) instead of pausing the query forever.
    networkMode: 'always',
  });

  const options = data?.items ?? [];
  const pagination = data?.pagination;
  const totalOptions = pagination?.totalItems ?? 0;
  // Header badge and banner baseline report the unfiltered total; `null` = the server declined
  // the count under load, so fall back to the filtered total.
  const totalAllOptions = pagination?.totalAllItems ?? totalOptions;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;
  // G-02 FR-006: the set discount screen (G-02-02) is FIT365-only, so it stays hidden while the
  // header store is of any other brand (Joyfit, Joyfit24, JoyfitYoga, JoyfitPlus).
  // The button also stays hidden while the brand is still being resolved, so it never flashes up
  // for a JOYFIT-family store right after a reload.
  const { brand: currentStoreBrand, isLoading: isStoreBrandLoading } = useCurrentStoreBrand();
  const isNonFit365Context =
    isStoreBrandLoading || (currentStoreBrand !== null && currentStoreBrand !== 'Fit365');

  useEffect(() => {
    if (!isFetching && page !== currentPage) {
      setCurrentPage(page);
    }
  }, [isFetching, page, currentPage, setCurrentPage]);

  // A page past the last one (bookmark, or the filter shrank the result) returns no rows: jump to the
  // last real page instead of claiming that no option exists.
  useEffect(() => {
    if (isFetching || isError || totalOptions === 0 || options.length > 0 || currentPage <= 1)
      return;
    setCurrentPage(Math.max(1, Math.ceil(totalOptions / limit)));
  }, [isFetching, isError, totalOptions, options.length, currentPage, limit, setCurrentPage]);

  // The default order shows no sort indicator, so a header click never starts by clearing it.
  const sorting: SortingState =
    filters.sort_by === DEFAULT_OPTION_SORT.sort_by &&
    filters.sort_order === DEFAULT_OPTION_SORT.sort_order
      ? []
      : [{ id: filters.sort_by, desc: filters.sort_order === 'desc' }];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (next.length === 0) {
      setFilters({ ...DEFAULT_OPTION_SORT, page: 1 });
    } else {
      // Only the columns rendering DataTableColumnHeader can reach here, and their ids are exactly
      // the API's sort keys — see OPTION_SORT_KEYS.
      setFilters({
        sort_by: next[0].id as OptionsFiltersState['sort_by'],
        sort_order: next[0].desc ? 'desc' : 'asc',
        page: 1,
      });
    }
  };

  const columns: ColumnDef<OptionListItemDto>[] = useMemo(
    () =>
      OptionsTableColumns({
        onEditClick: (id) => {
          router.push(withReturnTo(navigate('/options/[id]/edit', id)));
        },
      }),
    [router, withReturnTo],
  );

  return (
    <div className="">
      <PageHeader
        title="オプション管理"
        badge={<Badge variant="secondary">{totalAllOptions}件</Badge>}
        actions={
          <>
            {!isNonFit365Context && (
              <RoleGatedButton
                requiredPermission={Permission.OptionDiscountsView}
                type="button"
                variant="outline"
                className="gap-1"
                onClick={() => router.push(navigate('/option-discount'))}
              >
                <Percent className="size-4" />
                セット割設定
              </RoleGatedButton>
            )}
            <RoleGatedButton
              requiredPermission={Permission.OptionsCreate}
              type="button"
              className="gap-1"
              onClick={() => router.push(withReturnTo(navigate('/options/create')))}
            >
              <Plus className="size-4" />
              新規登録
            </RoleGatedButton>
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
        <Card className="gap-3 overflow-hidden rounded-xl border p-0">
          <OptionsFiltersProvider value={filtersHook}>
            <OptionsFilters
              isFilterOpen={isFilterOpen}
              onFilterOpenChange={setIsFilterOpen}
              totalCount={totalAllOptions}
              filteredCount={totalOptions}
            />
          </OptionsFiltersProvider>

          {isError ? (
            <ErrorView
              title="オプション一覧の取得に失敗しました"
              onRetry={() => {
                void refetch();
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={options}
              isLoading={isLoading}
              isFetching={isFetching}
              variant="simple"
              onRowClick={(row) => {
                router.push(withReturnTo(navigate('/options/[id]', row.id)));
              }}
              className="rounded-none border-x-0 border-b-0"
              containerClassName={
                isFilterOpen ? 'max-h-[calc(100vh-370px)]' : 'max-h-[calc(100vh-320px)]'
              }
              emptyContent={
                hasActiveFilters ? (
                  <Empty variant="filtered" entityLabel="オプション" onAction={clearFilters} />
                ) : (
                  <Empty variant="empty" entityLabel="オプション" />
                )
              }
              tableOptions={{
                onSortingChange: handleSortingChange,
                manualSorting: true,
                state: { sorting },
              }}
            />
          )}

          {(totalOptions > 0 || hasActiveFilters) && !isError && (
            <TablePaginationWithSize
              currentPage={page}
              total={totalOptions}
              pageSize={limit}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

export default function OptionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OptionsPageContent />
    </Suspense>
  );
}
