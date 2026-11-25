'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RowSelectionState } from '@tanstack/react-table';
import { toast } from 'sonner';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { useStoreLabel } from '@/components/common/data-select-input/store-select-input';
import { Empty } from '@/components/common/data-state-boundary/empty';
import { Error as ErrorState } from '@/components/common/data-state-boundary/error';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import {
  adminTransferControllerApproveMutation,
  adminTransferControllerBulkApproveMutation,
  adminTransferControllerListOptions,
  adminTransferControllerListQueryKey,
  adminTransferControllerRejectMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { TransferBulkApproveBar } from './_components/transfer-bulk-approve-bar';
import { TransferBulkApproveDialog } from './_components/transfer-bulk-approve-dialog';
import { TransferDecisionDialog } from './_components/transfer-decision-dialog';
import { TransferFilters } from './_components/transfer-filters';
import {
  type TransferItem,
  TransferTableColumns,
  getTransferMemberName,
  isTransferSelectable,
} from './_components/transfer-table-columns';
import {
  TRANSFER_BULK_APPROVE_ERROR_LABELS,
  TRANSFER_BULK_APPROVE_MAX,
  TRANSFER_EXCLUSION_LABELS,
  isTransferApplicationPending,
  toTransferBrandGroup,
} from './_constants/constants';
import { TransferFiltersProvider } from './_contexts/transfer-filters-context';
import { useSubmitLock } from './_hooks/use-submit-lock';
import { useTransferActScope } from './_hooks/use-transfer-act-scope';
import { useTransferFilters } from './_hooks/use-transfer-filters';
import { invalidateAfterTransferDecision } from './_utils/transfer-cache.util';

function TransferListPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const { hasPermission } = useAuthUser();
  const canApprove = hasPermission(Permission.MembersTransfersApprove);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [approveTarget, setApproveTarget] = useState<TransferItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TransferItem | null>(null);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  const queryClient = useQueryClient();
  // One decision is in flight at a time (a single dialog is open), so one lock covers all three.
  const submitLock = useSubmitLock();
  const getStoreBlockReason = useTransferActScope();
  const filtersHook = useTransferFilters();
  const {
    queryParams,
    isStoreScopeLoading,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    hasActiveFilters,
    clearFilters,
    buildFilterSummary,
  } = filtersHook;

  // A header store switch replaces the whole result set, so the selection made under the previous
  // store is dropped at once — not once the new list arrives, which on a slow network would leave
  // 一括承認 armed with the previous store's applications while the header already shows the next.
  const [selectionStoreId, setSelectionStoreId] = useState(queryParams.storeId);
  if (selectionStoreId !== queryParams.storeId) {
    setSelectionStoreId(queryParams.storeId);
    setRowSelection({});
  }

  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } = useQuery({
    // `totalAllItems` (the in-scope count before filters) feeds the "全 N 件中" banner.
    ...adminTransferControllerListOptions({ query: { ...queryParams, includeTotalAll: true } }),
    // Keeps the previous page on screen while the next one loads, so the table never blanks.
    placeholderData: keepPreviousData,
    // Wait for the header store: a request sent first would be scoped to a provisional store.
    enabled: !isStoreScopeLoading,
    // DataTable owns loading and empty; a query error is a toast (BE `userMessage`), not a
    // full-region swap that would unmount the very filters needed to recover.
    meta: { showErrorToast: true },
  });

  const transfers = useMemo(() => data?.items ?? [], [data?.items]);
  /** Scoped + filtered count — drives pagination and the header badge. */
  const total = data?.pagination.totalItems ?? 0;
  const scopedTotal = data?.pagination.totalAllItems ?? total;

  const invalidateTransfers = () =>
    queryClient.invalidateQueries({ queryKey: adminTransferControllerListQueryKey() });

  const invalidateAfterDecision = (transfer: TransferItem) =>
    void invalidateAfterTransferDecision(queryClient, transfer);

  const { mutate: approve, isPending: isApproving } = useMutation({
    ...adminTransferControllerApproveMutation(),
    onSettled: submitLock.release,
    onSuccess: () => {
      const name = approveTarget ? getTransferMemberName(approveTarget) : '';
      if (approveTarget) invalidateAfterDecision(approveTarget);
      setApproveTarget(null);
      toast.success(`${name} の移籍申請を承認しました。`);
    },
    onError: () => {
      // A 409 (another operator moved the request on) would otherwise leave this row stale and
      // the dialog open on a step that no longer exists.
      void invalidateTransfers();
      setApproveTarget(null);
    },
  });

  const { mutate: reject, isPending: isRejecting } = useMutation({
    ...adminTransferControllerRejectMutation(),
    onSettled: submitLock.release,
    onSuccess: () => {
      const name = rejectTarget ? getTransferMemberName(rejectTarget) : '';
      if (rejectTarget) invalidateAfterDecision(rejectTarget);
      setRejectTarget(null);
      toast.success(`${name} の移籍申請を否認しました。`);
    },
    onError: () => {
      void invalidateTransfers();
      setRejectTarget(null);
    },
  });

  const { mutate: bulkApprove, isPending: isBulkApproving } = useMutation({
    ...adminTransferControllerBulkApproveMutation(),
    onSettled: submitLock.release,
    // Always 200: each id succeeds or fails on its own, reported in `results[]`.
    onSuccess: ({ summary, results }) => {
      setIsBulkDialogOpen(false);
      setRowSelection({});
      // Approved rows may have moved their members' main-contract store (see invalidateAfterDecision).
      for (const transfer of transfers) {
        if (results.some((r) => r.transferApplicationId === transfer.transferApplicationId)) {
          invalidateAfterDecision(transfer);
        }
      }
      if (summary.approved > 0) {
        toast.success(`${summary.approved}件の移籍申請を一括承認しました。`);
      }
      // A partial failure must be surfaced — silently reporting only the successes would leave
      // the operator believing the whole batch went through.
      const notApproved = results.filter((r) => r.outcome !== 'approved');
      if (notApproved.length > 0) {
        const nameById = new Map(
          transfers.map((t) => [t.transferApplicationId, getTransferMemberName(t)]),
        );
        toast.error(`${notApproved.length}件は承認できませんでした`, {
          description: notApproved
            .map((r) => {
              const reason = r.errorCode
                ? TRANSFER_BULK_APPROVE_ERROR_LABELS[r.errorCode]
                : (r.exclusionReasons ?? []).map((e) => TRANSFER_EXCLUSION_LABELS[e]).join('・');
              return `${nameById.get(r.transferApplicationId) ?? r.transferApplicationId}: ${reason}`;
            })
            .join('\n'),
        });
      }
    },
  });

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );

  /**
   * Selection is keyed by transfer id (via `getRowId` below), not row index, so a selection
   * made before a search/filter change can't silently land on a different transfer that
   * happens to occupy the same row position afterwards. Narrowing the results can still leave
   * a selected id out of the new result set entirely, so drop it once the new page of data for
   * the changed filters has actually arrived (not the stale `keepPreviousData` page).
   */
  const filterSignature = JSON.stringify({
    status: queryParams.status,
    fromStoreId: queryParams.fromStoreId,
    toStoreId: queryParams.toStoreId,
    storeId: queryParams.storeId,
    brandGroup: queryParams.brandGroup,
    appliedFrom: queryParams.appliedFrom,
    appliedTo: queryParams.appliedTo,
    autoTransferEligibility: queryParams.autoTransferEligibility,
  });
  const prevFilterSignatureRef = useRef(filterSignature);
  const pendingPruneRef = useRef(false);

  useEffect(() => {
    if (prevFilterSignatureRef.current !== filterSignature) {
      prevFilterSignatureRef.current = filterSignature;
      pendingPruneRef.current = true;
    }
  }, [filterSignature]);

  useEffect(() => {
    if (!pendingPruneRef.current) return;
    pendingPruneRef.current = false;
    const validIds = new Set(transfers.map((transfer) => transfer.transferApplicationId));
    setRowSelection((prev) => {
      const next: RowSelectionState = {};
      for (const id of Object.keys(prev)) {
        if (prev[id] && validIds.has(id)) next[id] = true;
      }
      return next;
    });
  }, [transfers]);

  const columns = useMemo(
    () =>
      TransferTableColumns({
        onApproveClick: setApproveTarget,
        onRejectClick: setRejectTarget,
        onMemberClick: (transfer) =>
          router.push(navigate('/members/[id]', transfer.member.memberId)),
        getStoreBlockReason,
        canApprove,
        isStale: isPlaceholderData,
      }),
    [canApprove, getStoreBlockReason, isPlaceholderData, router],
  );

  const selectedTwoStepCount = transfers.filter(
    (transfer) =>
      rowSelection[transfer.transferApplicationId] &&
      toTransferBrandGroup(transfer.fromStore.brandEnum) === 'FIT365',
  ).length;

  // The store pickers page through the catalog, so a store restored from the URL may not be on a
  // loaded page; resolve just the two filtered ids by detail lookup for the banner.
  const { label: fromStoreLabel } = useStoreLabel(filtersHook.filters.from_store_id);
  const { label: toStoreLabel } = useStoreLabel(filtersHook.filters.to_store_id);
  const storeNameById = (id: string) =>
    id === filtersHook.filters.from_store_id
      ? (fromStoreLabel ?? undefined)
      : (toStoreLabel ?? undefined);

  const filterSummary = buildFilterSummary(storeNameById);

  return (
    <div>
      <PageHeader
        title="移籍管理"
        badge={
          <Badge variant="secondary" className="text-xs">
            {total.toLocaleString()}件
          </Badge>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <Card className="gap-0 overflow-hidden rounded-xl p-0">
          {/* Toolbar: filters first, then the bulk-approve bar (only while rows are selected). */}
          <div className="flex flex-col gap-3 px-4 py-3">
            <TransferFiltersProvider value={filtersHook}>
              <TransferFilters isFilterOpen={isFilterOpen} onFilterOpenChange={setIsFilterOpen} />
            </TransferFiltersProvider>
            <TransferBulkApproveBar
              selectedCount={selectedIds.length}
              disabled={isPlaceholderData}
              onClearSelection={() => setRowSelection({})}
              onBulkApprove={() => setIsBulkDialogOpen(true)}
            />
          </div>

          <FilterResultBanner
            show={hasActiveFilters}
            totalCount={scopedTotal}
            filteredCount={total}
            filterSummary={filterSummary}
            onClear={clearFilters}
          />

          <DataTable
            columns={columns}
            data={transfers}
            isLoading={isLoading || isStoreScopeLoading}
            isFetching={isFetching}
            isError={!!error}
            onRetry={() => void refetch()}
            errorTitle="移籍申請の取得に失敗しました"
            variant="simple"
            onRowClick={(row) =>
              router.push(
                withReturnTo(navigate('/members/transfers/[id]', row.transferApplicationId)),
              )
            }
            className="rounded-none border-x-0 border-b-0"
            containerClassName={
              isFilterOpen ? 'max-h-[calc(100vh-380px)]' : 'max-h-[calc(100vh-330px)]'
            }
            tableOptions={{
              getRowId: (row) => row.transferApplicationId,
              state: { rowSelection },
              onRowSelectionChange: setRowSelection,
              // The previous query's rows stay on screen while the next loads (`keepPreviousData`);
              // none of them may be picked up again for a bulk approve meanwhile.
              enableRowSelection: (row) =>
                !isPlaceholderData && isTransferSelectable(row.original, getStoreBlockReason),
            }}
            emptyContent={
              // A failed fetch must not read as "no transfers" — show the error with a retry instead.
              error ? (
                <ErrorState title="移籍申請の取得に失敗しました" onRetry={() => void refetch()} />
              ) : (
                <Empty
                  variant={hasActiveFilters ? 'filtered' : 'empty'}
                  entityLabel="移籍"
                  onAction={hasActiveFilters ? clearFilters : undefined}
                />
              )
            }
          />

          <TablePaginationWithSize
            total={total}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </Card>
      </div>

      <TransferDecisionDialog
        action="approve"
        transfer={approveTarget}
        isPending={isApproving}
        onCancel={() => setApproveTarget(null)}
        onConfirm={(comment) => {
          if (approveTarget && isTransferApplicationPending(approveTarget.status)) {
            const { status } = approveTarget;
            submitLock.run(() =>
              approve({
                path: { transferApplicationId: approveTarget.transferApplicationId },
                // Optimistic lock: a case another operator moved on meanwhile fails with 409
                // E-TRF-005 instead of approving a step the user never saw.
                body: { comment, expectedStatus: status },
              }),
            );
          }
        }}
      />

      <TransferDecisionDialog
        action="reject"
        transfer={rejectTarget}
        isPending={isRejecting}
        onCancel={() => setRejectTarget(null)}
        onConfirm={(comment) => {
          if (rejectTarget && isTransferApplicationPending(rejectTarget.status)) {
            const { status } = rejectTarget;
            submitLock.run(() =>
              reject({
                path: { transferApplicationId: rejectTarget.transferApplicationId },
                body: { comment, expectedStatus: status },
              }),
            );
          }
        }}
      />

      <TransferBulkApproveDialog
        open={isBulkDialogOpen}
        selectedCount={selectedIds.length}
        selectedTwoStepCount={selectedTwoStepCount}
        isPending={isBulkApproving}
        onOpenChange={setIsBulkDialogOpen}
        onConfirm={(comment) =>
          submitLock.run(() =>
            bulkApprove({
              body: {
                // Last line of defence: the API rejects more than the per-request maximum.
                transferApplicationIds: selectedIds.slice(0, TRANSFER_BULK_APPROVE_MAX),
                comment,
              },
            }),
          )
        }
      />
    </div>
  );
}

export default function TransferListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      }
    >
      <TransferListPageContent />
    </Suspense>
  );
}
