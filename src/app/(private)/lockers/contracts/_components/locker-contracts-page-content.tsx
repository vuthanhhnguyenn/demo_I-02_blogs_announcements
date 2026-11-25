'use client';

import { useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card } from '@/components/ui/card';

import { adminLockerContractsControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  LOCKER_OPTION_STATUS_LABELS,
  LOCKER_SLOT_STATUS_LABELS,
} from '../../_constants/locker-enum-labels.constants';
import { useLastSuccessfulData } from '../../_hooks/use-last-successful-data.hook';
import { useLockerCabinetLookup } from '../../_hooks/use-locker-cabinet-lookup.hook';
import { useLockerContractTypeChoices } from '../../_hooks/use-locker-contract-type-choices.hook';
import { useQueryErrorToast } from '../../_hooks/use-query-error-toast.hook';
import {
  LOCKER_CONTRACTS_SORT_KEYS,
  type LockerContractsSortKey,
  useLockerContractsFilters,
} from '../_hooks/use-locker-contracts-filters';
import { LockerContractsFilters } from './locker-contracts-filters';
import { getLockerContractsTableColumns } from './locker-contracts-table-columns';

function isSortKey(id: string | undefined): id is LockerContractsSortKey {
  return LOCKER_CONTRACTS_SORT_KEYS.includes(id as LockerContractsSortKey);
}

export function LockerContractsPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const {
    storeId,
    isStoreLoading,
    filters,
    queryParams,
    setFilters,
    clearFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    hasActiveFilters,
  } = useLockerContractsFilters();

  const {
    data: queryData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    ...adminLockerContractsControllerListOptions({ query: queryParams }),
    // Wait for the header store: restricted roles get 400 on a call without `storeId`
    enabled: !isStoreLoading,
    placeholderData: keepPreviousData,
  });

  useQueryErrorToast(isError, '契約一覧の取得に失敗しました');
  const data = useLastSuccessfulData(queryData, isError);

  const contracts = useMemo(() => data?.items ?? [], [data?.items]);
  const pagination = data?.pagination;
  const filteredTotal = pagination?.totalItems ?? 0;
  // `null` → the banner's 「M 件を抽出中」 fallback (CONV-001 §3.4.1)
  const totalContracts = pagination?.totalAllItems ?? null;

  // Contract rows carry `lockerId` + `slotCode` only; the cabinet's `locationCode` completes 「A-001」
  const cabinets = useLockerCabinetLookup(
    useMemo(() => contracts.map((c) => c.storeId), [contracts]),
  );
  const { byId: feeOptionsById } = useLockerContractTypeChoices(storeId);
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  const sorting: SortingState = [
    { id: filters.locker_contracts_sort_by, desc: filters.locker_contracts_sort_order === 'desc' },
  ];

  const showStoreColumn = !storeId;
  const columns = useMemo(
    () => getLockerContractsTableColumns(cabinets, { showStoreColumn }),
    [cabinets, showStoreColumn],
  );

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const id = next[0]?.id;
    if (!isSortKey(id)) {
      setFilters({ locker_contracts_sort_by: null, locker_contracts_sort_order: null });
      return;
    }

    setFilters({
      locker_contracts_sort_by: id,
      locker_contracts_sort_order: next[0]?.desc ? 'desc' : 'asc',
    });
  };

  return (
    <Card className="flex gap-0 overflow-hidden rounded-xl border p-0">
      <div className="px-4 py-3">
        <LockerContractsFilters storeId={storeId} filters={filters} setFilters={setFilters} />
      </div>

      <FilterResultBanner
        show={hasActiveFilters}
        totalCount={totalContracts}
        filteredCount={filteredTotal}
        filterSummary={[
          filters.locker_contracts_status
            ? LOCKER_OPTION_STATUS_LABELS[filters.locker_contracts_status]
            : '',
          filters.locker_contracts_slot_status
            ? LOCKER_SLOT_STATUS_LABELS[filters.locker_contracts_slot_status]
            : '',
          filters.locker_contracts_option_id
            ? (feeOptionsById.get(filters.locker_contracts_option_id)?.name ?? '')
            : '',
        ]}
        onClear={clearFilters}
      />

      <DataTable
        columns={columns}
        data={contracts}
        isLoading={isLoading || isStoreLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={() => void refetch()}
        errorTitle="契約一覧の取得に失敗しました"
        variant="simple"
        className="rounded-none border-x-0 border-b-0"
        containerClassName="max-h-[calc(100vh-300px)]"
        onRowClick={(row) => {
          // A slot whose contract row is gone (pending release after 終了) has no detail to open
          if (row.optionContractId) {
            router.push(withReturnTo(navigate('/lockers/contracts/[id]', row.optionContractId)));
          }
        }}
        emptyContent={
          <Empty
            variant={hasActiveFilters ? 'filtered' : 'empty'}
            entityLabel="契約"
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
      {!isLoading && !isStoreLoading && (
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
