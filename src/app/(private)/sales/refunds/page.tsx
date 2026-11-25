'use client';

// Client component: nuqs-backed filter/sort/pagination state and row-selection state
// require the browser. Decision mutations live in RefundDecisionDialog.
import { Suspense, useEffect, useState } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';
import type { RowSelectionState, SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card } from '@/components/ui/card';

import { adminRefundControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { RefundApplicationListItemDto } from '@/lib/api-real/types.gen';

import {
  PAYMENT_METHOD_LABELS,
  REFUND_DISPLAY_STATUS_LABELS,
} from '../_constants/sales-labels.constant';
import { RefundBulkActionBar } from './_components/refund-bulk-action-bar';
import { RefundCsvExportButton } from './_components/refund-csv-export-button';
import type { RefundConfirmAction } from './_components/refund-decision-dialog';
import { RefundDecisionDialog } from './_components/refund-decision-dialog';
import { RefundDetailSheet } from './_components/refund-detail-sheet';
import { RefundFilters } from './_components/refund-filters';
import { RefundPendingBanner } from './_components/refund-pending-banner';
import { getRefundQueueColumns } from './_components/refund-queue-table';
import { useRefundFilters } from './_hooks/use-refund-filters.hook';
import {
  APPLICANT_ROLE_FILTER_LABELS,
  REFUND_PAGE_SIZE_OPTIONS,
  REFUND_SORT_KEYS,
  canDecideRefund,
} from './_utils/refund-api.util';

/** The list's sortable columns — API-118 §5 also accepts `approvedAt`, which has no column here */
function isRefundSortKey(value: string | undefined): value is (typeof REFUND_SORT_KEYS)[number] {
  return !!value && (REFUND_SORT_KEYS as readonly string[]).includes(value);
}

function SalesRefundsPageContent() {
  const { user } = useAuthUser();

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [detailEntry, setDetailEntry] = useState<RefundApplicationListItemDto | null>(null);
  const [confirmAction, setConfirmAction] = useState<RefundConfirmAction | null>(null);

  const filterState = useRefundFilters();
  const {
    filters,
    setFilters,
    isScopeLoading,
    queryParams,
    baselineQueryParams,
    dateFrom,
    dateTo,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
  } = filterState;

  const sorting: SortingState = filters.rf_sort_by
    ? [{ id: filters.rf_sort_by, desc: filters.rf_sort_order !== 'asc' }]
    : [];

  // A failed load shows the error state with 再試行, never the empty state (016D-07)
  const {
    data,
    isLoading: isListLoading,
    isError,
    refetch,
  } = useQuery({
    ...adminRefundControllerListOptions({ query: queryParams }),
    enabled: !isScopeLoading,
  });
  const isLoading = isListLoading || isScopeLoading;

  // The error panel replaces the table; the toast says which request failed
  useEffect(() => {
    if (isError) toast.error('返金手続き一覧の取得に失敗しました', { id: 'refund-list-error' });
  }, [isError]);

  // FR-014 banner: the pending count, independent of the active filters (R301: no total amount)
  const { data: pendingData } = useQuery({
    ...adminRefundControllerListOptions({
      query: {
        displayStatus: ['pending_approval'],
        storeId: queryParams.storeId,
        page: 1,
        limit: 1,
      },
    }),
    enabled: !isScopeLoading,
  });

  const items = data?.items ?? [];
  const total = data?.pagination.totalItems ?? 0;
  const { data: baselineData } = useQuery({
    ...adminRefundControllerListOptions({ query: baselineQueryParams ?? queryParams }),
    enabled: Boolean(baselineQueryParams) && filterState.hasActiveFilters && !isScopeLoading,
  });
  // `totalAllItems` may be null when the server declines the count — fall back to the filtered total
  const totalAllItems = baselineQueryParams
    ? (baselineData?.pagination.totalItems ?? total)
    : (data?.pagination.totalAllItems ?? total);
  const pendingCount = pendingData?.pagination.totalItems ?? 0;
  const columns = getRefundQueueColumns();

  const selectedEntries = items.filter((item) => rowSelection[item.id]);
  const approvableEntries = selectedEntries.filter((item) => canDecideRefund(item, user));
  const nonApprovableCount = selectedEntries.length - approvableEntries.length;

  function handleDecisionSuccess() {
    if (confirmAction?.kind === 'bulk') {
      setRowSelection({});
    } else {
      setDetailEntry(null);
    }
    setConfirmAction(null);
  }

  const filterSummary = [
    filters.rf_status ? `ステータス ${REFUND_DISPLAY_STATUS_LABELS[filters.rf_status]}` : '',
    filters.rf_payment_method ? `決済手段 ${PAYMENT_METHOD_LABELS[filters.rf_payment_method]}` : '',
    filters.rf_applicant_role
      ? `申請者ロール ${APPLICANT_ROLE_FILTER_LABELS[filters.rf_applicant_role]}`
      : '',
    dateFrom || dateTo ? `申請日 ${dateFrom ?? ''}〜${dateTo ?? ''}` : '',
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        title="返金手続き一覧"
        actions={<RefundCsvExportButton defaultFromDate={dateFrom} defaultToDate={dateTo} />}
      />

      <div className="bg-background flex flex-1 flex-col px-6 py-4">
        <div className="space-y-4">
          <RefundPendingBanner pendingCount={pendingCount} />

          <Card className="gap-0 overflow-hidden rounded-xl border py-0">
            <div className="space-y-3 px-4 py-3">
              <RefundFilters filterState={filterState} />

              <RefundBulkActionBar
                selectedCount={selectedEntries.length}
                approvableCount={approvableEntries.length}
                excludedCount={nonApprovableCount}
                onClear={() => setRowSelection({})}
                onApprove={() =>
                  setConfirmAction({
                    kind: 'bulk',
                    decision: 'approve',
                    entries: approvableEntries,
                    excludedCount: nonApprovableCount,
                  })
                }
              />
            </div>

            <FilterResultBanner
              show={filterState.hasActiveFilters}
              totalCount={totalAllItems}
              filteredCount={total}
              filterSummary={filterSummary}
              onClear={filterState.clearFilters}
            />

            <DataStateBoundary
              isLoading={false}
              isError={isError}
              isEmpty={false}
              onRetry={() => refetch()}
            >
              <DataTable
                columns={columns}
                data={items}
                isLoading={isLoading}
                variant="simple"
                className="rounded-none border-x-0 border-b-0"
                onRowClick={(row) => setDetailEntry(row)}
                emptyContent={
                  <Empty
                    variant={filterState.hasActiveFilters ? 'filtered' : 'empty'}
                    entityLabel="返金手続き"
                    onAction={filterState.hasActiveFilters ? filterState.clearFilters : undefined}
                  />
                }
                tableOptions={{
                  manualSorting: true,
                  enableRowSelection: (row) => row.original.displayStatus === 'pending_approval',
                  getRowId: (originalRow) => originalRow.id,
                  onRowSelectionChange: setRowSelection,
                  onSortingChange: (updater) => {
                    const next = typeof updater === 'function' ? updater(sorting) : updater;
                    const sortKey = next[0]?.id;
                    if (!isRefundSortKey(sortKey)) {
                      setFilters({ rf_sort_by: null, rf_sort_order: null, rf_page: 1 });
                      return;
                    }
                    setFilters({
                      rf_sort_by: sortKey,
                      rf_sort_order: next[0]?.desc ? 'desc' : 'asc',
                      rf_page: 1,
                    });
                  },
                  state: { sorting, rowSelection },
                }}
              />
            </DataStateBoundary>

            {total > 0 && (
              <TablePaginationWithSize
                total={total}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={REFUND_PAGE_SIZE_OPTIONS}
              />
            )}
          </Card>
        </div>
      </div>

      <RefundDetailSheet
        entry={detailEntry}
        open={!!detailEntry}
        onClose={() => setDetailEntry(null)}
        onDecide={(decision) => {
          if (!detailEntry) return;
          setConfirmAction({ kind: 'single', decision, entry: detailEntry });
        }}
      />

      <RefundDecisionDialog
        action={confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        onSuccess={handleDecisionSuccess}
      />
    </>
  );
}

export default function SalesRefundsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SalesRefundsPageContent />
    </Suspense>
  );
}
