'use client';

// Client component: nuqs-backed filters/pagination and a row-level refund dialog require browser state.
import { Suspense, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { useStoreLabel } from '@/components/common/data-select-input/store-select-input';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import { adminTransactionControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { TransactionRowDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { TransactionRefundRequestDialog } from './_components/transaction-refund-request-dialog';
import { TransactionsCsvExportButton } from './_components/transactions-csv-export-button';
import { TransactionsFilters } from './_components/transactions-filters';
import { getTransactionsTableColumns } from './_components/transactions-table';
import {
  TRANSACTION_PAGE_SIZE_OPTIONS,
  useTransactionsFilters,
} from './_hooks/use-transactions-filters.hook';
import {
  TRANSACTION_TYPE_LABELS,
  getTransactionPaymentMethodLabel,
} from './_utils/transaction-labels.util';

function SalesTransactionsPageContent() {
  const router = useRouter();
  const [refundRow, setRefundRow] = useState<TransactionRowDto | null>(null);

  const filterState = useTransactionsFilters();
  const {
    filters,
    filterParams,
    isScopeLoading,
    queryParams,
    baselineQueryParams,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    hasActiveFilters,
    hasNarrowingFilters,
    clearFilters,
  } = filterState;

  const {
    data,
    isLoading: isListLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminTransactionControllerListOptions({ query: queryParams }),
    enabled: !isScopeLoading,
  });
  const isLoading = isListLoading || isScopeLoading;
  const errorStatus = getApiErrorStatus(error);
  const isClientError = errorStatus !== undefined && errorStatus < 500;

  // Store name for the filter-result summary label — by id, so a store past the first page resolves.
  // A URL store the header store overrides is not what the list shows — don't name it
  const { label: storeLabel } = useStoreLabel(filters.tf_store_id, {
    enabled: filterState.showStoreFilter,
  });
  const storeName = filterState.showStoreFilter ? (storeLabel ?? undefined) : undefined;

  const items = data?.items ?? [];
  const total = data?.pagination.totalItems ?? 0;
  const { data: baselineData } = useQuery({
    ...adminTransactionControllerListOptions({ query: baselineQueryParams ?? queryParams }),
    enabled: Boolean(baselineQueryParams) && hasNarrowingFilters && !isScopeLoading,
  });
  // `totalAllItems` may be null when the server declines the count — fall back to the filtered total
  const totalAllItems = baselineQueryParams
    ? (baselineData?.pagination.totalItems ?? total)
    : (data?.pagination.totalAllItems ?? total);
  const columns = getTransactionsTableColumns({ onRequestRefund: setRefundRow });

  const filterSummary = [
    filters.tf_search ? `"${filters.tf_search}"` : '',
    filters.tf_transaction_type
      ? `種別: ${TRANSACTION_TYPE_LABELS[filters.tf_transaction_type]}`
      : '',
    filters.tf_payment_method
      ? `決済: ${getTransactionPaymentMethodLabel(filters.tf_payment_method)}`
      : '',
    storeName ? `店舗: ${storeName}` : '',
    filters.tf_date_from ? `開始: ${filters.tf_date_from}` : '',
    filters.tf_date_to ? `終了: ${filters.tf_date_to}` : '',
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        title="入出金明細"
        badge={
          <Badge variant="outline" className="text-xs">
            {total}件
          </Badge>
        }
        actions={
          <TransactionsCsvExportButton
            filters={filterParams}
            total={total}
            filterSummary={filterSummary}
          />
        }
      />

      <div className="bg-background flex flex-1 flex-col px-6 py-4">
        <div className="space-y-4">
          <Card className="gap-0 overflow-hidden rounded-xl border py-0">
            <div className="px-4 py-3">
              <TransactionsFilters filterState={filterState} />
            </div>

            <FilterResultBanner
              show={hasActiveFilters}
              totalCount={totalAllItems}
              filteredCount={total}
              filterSummary={filterSummary}
              onClear={clearFilters}
            />

            <DataStateBoundary
              isLoading={isLoading}
              isError={isError}
              // 4xx (e.g. E-TXN-007 archived period) carries its own reason — not a network problem
              errorDescription={isClientError ? resolveApiErrorMessage(error) : undefined}
              isEmpty={false}
              onRetry={() => refetch()}
              skeleton={
                <DataTable
                  columns={columns}
                  data={[]}
                  isLoading
                  variant="simple"
                  className="rounded-none border-x-0 border-b-0"
                />
              }
            >
              <DataTable
                columns={columns}
                data={items}
                variant="simple"
                className="rounded-none border-x-0 border-b-0"
                onRowClick={(row) => {
                  if (row.billingId) router.push(navigate('/sales/[id]', row.billingId));
                }}
                emptyContent={
                  <Empty
                    variant={hasNarrowingFilters ? 'filtered' : 'empty'}
                    entityLabel="取引"
                    onAction={hasNarrowingFilters ? clearFilters : undefined}
                  />
                }
              />
            </DataStateBoundary>

            {total > 0 && (
              <TablePaginationWithSize
                total={total}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={TRANSACTION_PAGE_SIZE_OPTIONS}
              />
            )}
          </Card>
        </div>
      </div>

      <TransactionRefundRequestDialog
        row={refundRow}
        onOpenChange={(open) => {
          if (!open) setRefundRow(null);
        }}
      />
    </>
  );
}

export default function SalesTransactionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SalesTransactionsPageContent />
    </Suspense>
  );
}
