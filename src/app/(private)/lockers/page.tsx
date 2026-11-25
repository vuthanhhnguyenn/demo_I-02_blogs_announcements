'use client';

import { Suspense, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card } from '@/components/ui/card';

import { adminLockerControllerListLockersOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { LockersFilters } from './_components/lockers-filters';
import { getLockersTableColumns } from './_components/lockers-table-columns';
import { LOCKER_SHAPE_TYPE_LABELS } from './_constants/locker-enum-labels.constants';
import { useLastSuccessfulData } from './_hooks/use-last-successful-data.hook';
import {
  LOCKER_LIST_SORT_KEYS,
  type LockerListSortKey,
  useLockersFilters,
} from './_hooks/use-lockers-filters';
import { useQueryErrorToast } from './_hooks/use-query-error-toast.hook';

function isSortKey(id: string | undefined): id is LockerListSortKey {
  return LOCKER_LIST_SORT_KEYS.includes(id as LockerListSortKey);
}

function LockersPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const { currentStoreId, isLoading: isStoreLoading } = useCurrentStore();
  // 全店舗 (HQ / system) omits `storeId` and lists every store (API-100 §4.1, BE MR !795)
  const storeId = currentStoreId && currentStoreId !== ALL_STORES ? currentStoreId : undefined;
  const isAllStores = storeId === undefined;

  const {
    filters,
    queryParams,
    searchInput,
    setSearchInput,
    setFilters,
    clearFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    hasActiveFilters,
  } = useLockersFilters(storeId);

  const {
    data: queryData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    ...adminLockerControllerListLockersOptions({ query: queryParams }),
    enabled: !isStoreLoading,
    placeholderData: keepPreviousData,
  });

  useQueryErrorToast(isError, 'ロッカー一覧の取得に失敗しました');
  const data = useLastSuccessfulData(queryData, isError);

  const lockers = useMemo(() => data?.items ?? [], [data?.items]);
  const pagination = data?.pagination;
  // Pre-filter total of the banner = `totalAllItems` (CONV-001 §3.4.1). For HQ `storeId` is an optional
  // filter, so it counts every store even with one picked — as on the 契約一覧 / 開放待ち tabs and members.
  // A missing count stays `null` so the banner reads 「M 件を抽出中」 (§3.4.1 null contract).
  const totalLockers = pagination?.totalAllItems ?? null;
  const filteredTotal = pagination?.totalItems ?? 0;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  const sorting: SortingState = [
    { id: filters.lockers_sort_by, desc: filters.lockers_sort_order === 'desc' },
  ];

  const columns = useMemo(() => getLockersTableColumns({ isAllStores }), [isAllStores]);

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const id = next[0]?.id;
    if (!isSortKey(id)) {
      setFilters({ lockers_sort_by: null, lockers_sort_order: null });
      return;
    }

    setFilters({ lockers_sort_by: id, lockers_sort_order: next[0]?.desc ? 'desc' : 'asc' });
  };

  return (
    <Card className="flex gap-0 overflow-hidden rounded-xl border p-0">
      <div className="px-4 py-3">
        <LockersFilters
          filters={filters}
          searchInput={searchInput}
          setFilters={setFilters}
          setSearchInput={setSearchInput}
        />
      </div>

      <FilterResultBanner
        show={hasActiveFilters}
        totalCount={totalLockers}
        filteredCount={filteredTotal}
        filterSummary={[
          filters.lockers_search ? `"${filters.lockers_search}"` : '',
          filters.lockers_shape ? LOCKER_SHAPE_TYPE_LABELS[filters.lockers_shape] : '',
        ]}
        onClear={clearFilters}
      />

      <DataTable
        columns={columns}
        data={lockers}
        isLoading={isLoading || isStoreLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={() => void refetch()}
        errorTitle="ロッカー一覧の取得に失敗しました"
        variant="simple"
        className="rounded-none border-x-0 border-b-0"
        containerClassName="max-h-[calc(100vh-300px)]"
        onRowClick={(row) => router.push(withReturnTo(navigate('/lockers/[id]', row.id)))}
        emptyContent={
          <Empty
            variant={hasActiveFilters ? 'filtered' : 'empty'}
            entityLabel="ロッカー"
            title={hasActiveFilters ? undefined : '登録されたロッカーはありません'}
            onAction={hasActiveFilters ? clearFilters : undefined}
          />
        }
        tableOptions={{
          manualSorting: true,
          onSortingChange: handleSortingChange,
          state: { sorting },
        }}
      />

      {/* No footer until the first page arrives — it would read 「全 0 件」 while loading */}
      {!isLoading && (
        <TablePaginationWithSize
          currentPage={page}
          total={filteredTotal}
          pageSize={limit}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </Card>
  );
}

export default function LockersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LockersPageContent />
    </Suspense>
  );
}
