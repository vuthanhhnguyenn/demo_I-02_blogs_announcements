'use client';

// Client component: nuqs-backed filters/pagination and React Query mutations require browser state.
import { Suspense, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';
import type { RowSelectionState } from '@tanstack/react-table';
import { FileSpreadsheet, Lock, Plus } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { useStoreLabel } from '@/components/common/data-select-input/store-select-input';
import { Empty } from '@/components/common/data-state-boundary/empty';
import { Error as ErrorState } from '@/components/common/data-state-boundary/error';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { MonthPicker } from '@/components/common/month-picker';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import { adminSalesBillingControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { SalesBulkConfirmDialog } from './_components/sales-bulk-confirm-dialog';
import { SalesBulkRefundDialog } from './_components/sales-bulk-refund-dialog';
import { SalesCursorPagination } from './_components/sales-cursor-pagination';
import { SalesFilters } from './_components/sales-filters';
import { SalesSummary } from './_components/sales-summary';
import {
  fromSalesSortingState,
  getSalesTableColumns,
  isUnconfirmedBilling,
  toSalesSortingState,
} from './_components/sales-table-columns';
import { BILLING_TYPE_LABELS } from './_constants/sales-labels.constant';
import { SALES_PAGE_SIZE_OPTIONS, useSalesFilters } from './_hooks/use-sales-filters.hook';
import { isSalesPickerMonthEnabled } from './_utils/billing-month.util';

const CONFIRMATION_STATUS_LABELS: Record<'confirmed' | 'unconfirmed', string> = {
  unconfirmed: '未確定',
  confirmed: '確定済',
};

function toMonthPickerValue(month: string): string {
  return month.replace('-', '/');
}

function fromMonthPickerValue(value: string): string {
  return value.replace('/', '-');
}

function SalesPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const { hasPermission } = useAuthUser();
  const canConfirm = hasPermission(Permission.SalesConfirm);
  const canRefund = hasPermission(Permission.SalesRefundInitiate);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkRefundOpen, setBulkRefundOpen] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const filterState = useSalesFilters();
  const {
    filters,
    setFilters,
    month,
    queryParams,
    baselineQueryParams,
    effectiveStoreId,
    showStoreFilter,
    isScopeLoading,
    currentPage,
    goToNextPage,
    goToPreviousPage,
    pageSize,
    setPageSize,
    sort,
    setSort,
    hasActiveFilters,
    clearFilters,
  } = filterState;

  const sorting = toSalesSortingState(sort);

  // Selection belongs to one result set: any month / filter / search / sort / page change drops it,
  // so a bulk action can never reach rows the user no longer sees (state adjusted during render)
  const selectionScope = JSON.stringify(queryParams);
  const [prevSelectionScope, setPrevSelectionScope] = useState(selectionScope);
  if (selectionScope !== prevSelectionScope) {
    setPrevSelectionScope(selectionScope);
    setRowSelection({});
  }

  const {
    data,
    isLoading: isListLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminSalesBillingControllerListOptions({ query: queryParams }),
    enabled: !isScopeLoading,
  });
  const isLoading = isListLoading || isScopeLoading;

  // Baseline count for the filter banner's 全N件 — only while a secondary filter narrows the list
  const { data: baselineData } = useQuery({
    ...adminSalesBillingControllerListOptions({ query: baselineQueryParams }),
    enabled: hasActiveFilters && !isScopeLoading,
  });

  // Store name for the filter-result summary label — by id, so a store past the first page resolves.
  // A URL store the header store overrides is not what the list shows — don't name it
  const isStoreFilterApplied = effectiveStoreId === filters.sf_store_id;
  const { label: storeLabel } = useStoreLabel(filters.sf_store_id, {
    enabled: isStoreFilterApplied,
  });
  const storeName = isStoreFilterApplied ? (storeLabel ?? undefined) : undefined;

  const items = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const totalAllItems = baselineData?.totalCount ?? total;
  const columns = getSalesTableColumns({ showStore: showStoreFilter });
  const filterSummary = [
    filters.sf_search ? `"${filters.sf_search}"` : '',
    filters.sf_confirmation_status
      ? CONFIRMATION_STATUS_LABELS[filters.sf_confirmation_status]
      : '',
    storeName ? `店舗: ${storeName}` : '',
    filters.sf_billing_type ? BILLING_TYPE_LABELS[filters.sf_billing_type] : '',
    filters.sf_unpaid_only ? '未納のみ' : '',
  ].filter(Boolean);
  const selectedRecords = items.filter((item) => rowSelection[item.billingId]);
  const selectedIds = selectedRecords.map((item) => item.billingId);
  const unconfirmedSelectedRecords = selectedRecords.filter((item) =>
    isUnconfirmedBilling(item.confirmStatus),
  );
  const publicIdById = new Map(items.map((item) => [item.billingId, item.publicId]));

  // Selection is per page: a cursor page's rows are not kept once the user pages away
  const handlePreviousPage = () => {
    setRowSelection({});
    goToPreviousPage();
  };
  const handleNextPage = () => {
    setRowSelection({});
    goToNextPage(data?.nextCursor);
  };
  const hasUnconfirmedSelected = unconfirmedSelectedRecords.length > 0;

  return (
    <>
      <PageHeader
        title="売上管理"
        badge={
          <Badge variant="outline" className="text-xs">
            {isError ? '—' : `${total}件`}
          </Badge>
        }
        dateControl={
          <MonthPicker
            value={toMonthPickerValue(month)}
            showArrows
            isMonthEnabled={isSalesPickerMonthEnabled}
            onChange={(value) => setFilters({ sf_month: fromMonthPickerValue(value) })}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            {/* FR-008: the export lives on its own screen (prototype `sales-accounting-export`) */}
            <RoleGatedButton
              requiredPermission={Permission.SalesExport}
              variant="outline"
              className="gap-1"
              denyTooltip="会計CSVを出力する権限がありません"
              onClick={() => router.push(withReturnTo(navigate('/sales/accounting-export')))}
            >
              <FileSpreadsheet className="size-4" />
              会計CSV出力
            </RoleGatedButton>
            <RoleGatedButton
              requiredPermission={Permission.SalesManualRegister}
              className="gap-1"
              denyTooltip="請求を追加する権限がありません"
              onClick={() => router.push(withReturnTo(navigate('/sales/register')))}
            >
              <Plus className="size-4" />
              請求の手動追加
            </RoleGatedButton>
          </div>
        }
      />

      <div className="bg-background flex flex-1 flex-col px-6 py-4">
        <div className="space-y-4">
          <SalesSummary billingMonth={month} storeId={effectiveStoreId} enabled={!isScopeLoading} />

          <Card className="gap-0 overflow-hidden rounded-xl border py-0">
            <div className="space-y-3 px-4 py-3">
              <SalesFilters filterState={filterState} />

              {selectedIds.length > 0 && (
                <div className="bg-primary/10 border-primary/20 flex items-center gap-3 rounded-lg border px-3 py-2">
                  <span className="text-primary text-sm font-medium">
                    {selectedIds.length}件選択中
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
                    選択解除
                  </Button>
                  <div className="bg-primary/20 h-4 w-px" />
                  {canRefund && (
                    <RoleGatedButton
                      requiredPermission={Permission.SalesRefundInitiate}
                      size="sm"
                      onClick={() => setBulkRefundOpen(true)}
                    >
                      返金申請
                    </RoleGatedButton>
                  )}
                  {canConfirm && (
                    <RoleGatedButton
                      requiredPermission={Permission.SalesConfirm}
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={!hasUnconfirmedSelected}
                      onClick={() => setBulkConfirmOpen(true)}
                    >
                      <Lock className="size-3" />
                      確定
                    </RoleGatedButton>
                  )}
                </div>
              )}
            </div>

            <FilterResultBanner
              show={hasActiveFilters && !isError}
              totalCount={totalAllItems}
              filteredCount={total}
              filterSummary={filterSummary}
              onClear={clearFilters}
            />

            {/* A failed load must not read as an empty month (no rows, 0件) */}
            {isError ? (
              <div className="p-4">
                <ErrorState
                  title="請求一覧の取得に失敗しました"
                  // Same rule as the summary card: a 4xx (e.g. 403 E-AUTH-101 store out of scope)
                  // shows the API's userMessage; only a 5xx / network failure says try again later
                  description={
                    (getApiErrorStatus(error) ?? 500) < 500
                      ? resolveApiErrorMessage(error)
                      : '時間をおいて再度お試しください。'
                  }
                  onRetry={() => void refetch()}
                />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={items}
                isLoading={isLoading}
                variant="simple"
                className="rounded-none border-x-0 border-b-0"
                emptyContent={
                  hasActiveFilters ? (
                    <Empty variant="filtered" entityLabel="請求" onAction={clearFilters} />
                  ) : (
                    <Empty variant="empty" title="この月の請求はありません" />
                  )
                }
                onRowClick={(row) =>
                  router.push(withReturnTo(navigate('/sales/[id]', row.billingId)))
                }
                getRowClassName={(row) =>
                  [
                    row.unpaidAmount > 0 && 'bg-destructive/10',
                    rowSelection[row.billingId] && 'bg-primary/10',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                tableOptions={{
                  manualSorting: true,
                  enableRowSelection: true,
                  getRowId: (originalRow) => originalRow.billingId,
                  onRowSelectionChange: setRowSelection,
                  onSortingChange: (updater) => {
                    const next = typeof updater === 'function' ? updater(sorting) : updater;
                    setRowSelection({});
                    setSort(fromSalesSortingState(next, sort));
                  },
                  state: { sorting, rowSelection },
                }}
              />
            )}

            {!isError && total > 0 && (
              <SalesCursorPagination
                total={total}
                currentPage={currentPage}
                pageSize={pageSize}
                pageItemCount={items.length}
                hasNextPage={Boolean(data?.nextCursor)}
                onPreviousPage={handlePreviousPage}
                onNextPage={handleNextPage}
                onPageSizeChange={(size) => {
                  setRowSelection({});
                  setPageSize(size);
                }}
                pageSizeOptions={SALES_PAGE_SIZE_OPTIONS}
              />
            )}
          </Card>
        </div>
      </div>

      <SalesBulkRefundDialog
        open={bulkRefundOpen}
        onOpenChange={setBulkRefundOpen}
        billingRecordIds={selectedIds}
        publicIdById={publicIdById}
        onSuccess={() => setRowSelection({})}
      />

      <SalesBulkConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        selectedIds={selectedIds}
        unconfirmedSelectedRecords={unconfirmedSelectedRecords}
        onSuccess={() => setRowSelection({})}
      />
    </>
  );
}

export default function SalesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SalesPageContent />
    </Suspense>
  );
}
