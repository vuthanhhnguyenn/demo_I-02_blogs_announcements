'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { RowSelectionState, SortingState } from '@tanstack/react-table';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { adminConnectedDeviceControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { ConnectedDeviceDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { EquipmentBulkStatusDialog } from './_components/equipment-bulk-status-dialog';
import { EquipmentFilters } from './_components/equipment-filters';
import { getEquipmentTableColumns } from './_components/equipment-table-columns';
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_TYPE_LABELS,
  type EquipmentStatus,
} from './_constants/constants';
import { useEquipmentBulkStatus } from './_hooks/use-equipment-bulk-status.hook';
import { useEquipmentFilters } from './_hooks/use-equipment-filters';

type EquipmentListItem = ConnectedDeviceDto;

function EquipmentPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // Statuses of rows the user has selected, accumulated as they are ticked. Selection can span
  // pages, so the current response alone cannot tell us what a selected device's status is —
  // and we need it to drop no-op rows before submitting a bulk change.
  const [selectedStatusById, setSelectedStatusById] = useState<Record<string, EquipmentStatus>>({});
  const {
    activeFilterCount,
    clearFilters,
    currentPage,
    filters,
    hasActiveFilters,
    isAbnormalPinned,
    pageSize,
    queryParams,
    releaseAbnormalPin,
    searchInput,
    selectedStoreName,
    setCurrentPage,
    setFilters,
    setPageSize,
    setSearchInput,
    showStoreColumn,
    showStoreFilter,
  } = useEquipmentFilters();

  // The default `createdAt` order has no column, so no header shows as sorted.
  const sorting: SortingState =
    filters.equipment_sort_by === 'createdAt'
      ? []
      : [{ id: filters.equipment_sort_by, desc: filters.equipment_sort_order === 'desc' }];

  // `keepPreviousData` keeps the current page on screen while the next query key resolves, so the
  // table dims under an overlay instead of flashing back to skeleton on every keystroke — and the
  // selection-pruning effect below never sees an empty result set mid-flight.
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminConnectedDeviceControllerListOptions({ query: queryParams }),
    placeholderData: keepPreviousData,
  });

  // A failed list request must not read as "there is nothing registered": besides the toast, the
  // table body shows an error state with 再試行 (BUG-E02-A-15) while the filters stay mounted.
  useEffect(() => {
    if (isError) toast.error('接続機器一覧の取得に失敗しました');
  }, [isError]);

  const { bulkUpdateStatus, isBulkUpdating } = useEquipmentBulkStatus();

  const columns = useMemo(() => getEquipmentTableColumns({ showStoreColumn }), [showStoreColumn]);
  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.pagination.totalItems ?? 0;
  const totalAllItems = data?.pagination.totalAllItems ?? total;
  const page = data?.pagination.page ?? currentPage;
  const limit = data?.pagination.limit ?? pageSize;
  const totalPages = data?.pagination.totalPages ?? 0;

  /**
   * The result set can shrink under a page that is already out of range (a filter narrowed it, or
   * devices were removed elsewhere) and the API echoes the requested page back rather than
   * clamping it. Fall back to the last page that still holds rows instead of showing an empty
   * table, and only once the response for the current key has actually arrived.
   */
  useEffect(() => {
    if (isFetching) return;
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [isFetching, totalPages, currentPage, setCurrentPage]);

  /**
   * Selection is keyed by device id (see `getRowId`), never by row position, so narrowing the
   * results cannot silently move a selection onto a different device. A narrowed result set can
   * still leave a selected id out entirely, so drop those once the data for the changed filters
   * has actually arrived — not while the previous page is still being shown.
   */
  const filterSignature = JSON.stringify({
    q: queryParams?.q,
    storeId: queryParams?.storeId,
    deviceType: queryParams?.deviceType,
    status: queryParams?.status,
  });
  const previousFilterSignature = useRef(filterSignature);
  const shouldPruneSelection = useRef(false);

  useEffect(() => {
    if (previousFilterSignature.current !== filterSignature) {
      previousFilterSignature.current = filterSignature;
      shouldPruneSelection.current = true;
    }
  }, [filterSignature]);

  useEffect(() => {
    if (!shouldPruneSelection.current) return;
    shouldPruneSelection.current = false;

    const validIds = new Set(items.map((item) => item.id));
    setRowSelection((previous) => {
      const next: RowSelectionState = {};
      for (const id of Object.keys(previous)) {
        if (previous[id] && validIds.has(id)) next[id] = true;
      }
      return next;
    });
  }, [items]);

  const selectedIDs = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  const handleRowSelectionChange = (
    updater: RowSelectionState | ((previous: RowSelectionState) => RowSelectionState),
  ) => {
    const next = typeof updater === 'function' ? updater(rowSelection) : updater;
    setRowSelection(next);
    setSelectedStatusById((previous) => {
      const merged = { ...previous };
      for (const item of items) {
        if (next[item.id]) merged[item.id] = item.status;
      }
      for (const id of Object.keys(merged)) {
        if (!next[id]) delete merged[id];
      }
      return merged;
    });
  };

  const clearSelection = () => {
    setRowSelection({});
    setSelectedStatusById({});
  };

  // Joined with 、 as in the prototype (the shared banner's array form joins with ・, so the
  // summary is handed over pre-built).
  const filterSummary = useMemo(
    () =>
      [
        searchInput.trim() ? `検索: "${searchInput.trim()}"` : '',
        // 店舗 appears only when the in-panel filter is the thing narrowing the list; under a
        // single-store header scope the panel is not even rendered.
        selectedStoreName ? `店舗: ${selectedStoreName}` : '',
        filters.equipment_type
          ? `機器タイプ: ${EQUIPMENT_TYPE_LABELS[filters.equipment_type]}`
          : '',
        // The pinned 異常 restriction is already spelled out by its own chip, so the banner
        // summary leaves 状態 out while the deep link is in force.
        !isAbnormalPinned && filters.equipment_status
          ? `状態: ${EQUIPMENT_STATUS_LABELS[filters.equipment_status]}`
          : '',
      ]
        .filter(Boolean)
        .join('、'),
    [
      searchInput,
      selectedStoreName,
      filters.equipment_type,
      filters.equipment_status,
      isAbnormalPinned,
    ],
  );

  const handleBulkStatusSubmit = (payload: { status: EquipmentStatus; changedNote?: string }) => {
    if (selectedIDs.length === 0) return;

    // Devices already holding the target status are dropped before the request: the backend
    // rejects the whole batch on a no-op transition, so a mixed selection would fail wholesale.
    const deviceIds = selectedIDs.filter((id) => selectedStatusById[id] !== payload.status);

    if (deviceIds.length === 0) {
      toast.info('選択中の機器はすでにこの状態のため、変更はありません');
      setBulkDialogOpen(false);
      clearSelection();
      return;
    }

    bulkUpdateStatus(
      { deviceIds, status: payload.status, changedNote: payload.changedNote },
      {
        onSuccess: () => {
          setBulkDialogOpen(false);
          clearSelection();
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="gap-3 overflow-hidden rounded-xl border p-0">
        <div className="p-3 pb-0">
          <EquipmentFilters
            activeFilterCount={activeFilterCount}
            filters={filters}
            isFilterOpen={isFilterOpen}
            searchInput={searchInput}
            setFilters={setFilters}
            setIsFilterOpen={setIsFilterOpen}
            setSearchInput={setSearchInput}
            showStoreFilter={showStoreFilter}
            isAbnormalPinned={isAbnormalPinned}
          />

          {/*
           * 異常 deep-link chip (SR-004): states the pinned restriction and its matched count, and
           * its dismiss action is the only way to release the pin (`条件をクリア` keeps it).
           */}
          {isAbnormalPinned && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15 h-auto gap-2 rounded-full py-1 text-xs font-medium"
                onClick={releaseAbnormalPin}
              >
                <span className="bg-destructive size-1.5 rounded-full" />
                異常 — {total}件
                <X className="size-3" />
              </Button>
            </div>
          )}

          {selectedIDs.length > 0 && (
            <div className="bg-primary/10 border-primary/20 mt-3 flex items-center gap-3 rounded-lg border px-3 py-2">
              <span className="text-primary text-sm font-medium">{selectedIDs.length}件選択中</span>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                選択解除
              </Button>
              <div className="bg-primary/20 h-4 w-px" />
              <RoleGatedButton
                size="sm"
                requiredPermission={Permission.EquipmentEdit}
                denyTooltip="一括状態変更の権限がありません"
                onClick={() => setBulkDialogOpen(true)}
              >
                一括状態変更
              </RoleGatedButton>
            </div>
          )}
        </div>

        <FilterResultBanner
          // BUG-E02-A-15 — a failed request has no counts; 「全 0 件中 0 件」 would read as a result.
          show={hasActiveFilters && !isError}
          totalCount={totalAllItems}
          filteredCount={total}
          filterSummary={filterSummary}
          onClear={clearFilters}
          className="rounded-none border-x-0 border-t-0"
        />

        <DataTable
          columns={columns}
          data={items}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
          onRetry={() => void refetch()}
          errorTitle="接続機器一覧の取得に失敗しました"
          variant="simple"
          className="rounded-none border-x-0 border-b-0"
          containerClassName={
            isFilterOpen ? 'max-h-[calc(100vh-390px)]' : 'max-h-[calc(100vh-330px)]'
          }
          onRowClick={(row: EquipmentListItem) =>
            router.push(withReturnTo(navigate('/equipment/[id]', row.id)))
          }
          emptyContent={
            isError ? (
              // BUG-E02-A-15 — error variant instead of the true-empty copy.
              <Empty
                icon={AlertTriangle}
                title="接続機器一覧の取得に失敗しました"
                description="時間をおいて再度お試しください。"
                actionLabel="再試行"
                onAction={() => void refetch()}
              />
            ) : hasActiveFilters ? (
              <Empty
                variant="filtered"
                title="条件に一致する機器はありません"
                onAction={clearFilters}
              />
            ) : (
              <Empty variant="empty" title="登録されている機器はありません" />
            )
          }
          getRowClassName={(row: EquipmentListItem) =>
            row.status === 'abnormal'
              ? 'bg-destructive/10 shadow-[inset_4px_0_0_0_var(--destructive)]'
              : undefined
          }
          tableOptions={{
            manualSorting: true,
            enableRowSelection: true,
            getRowId: (originalRow) => originalRow.id,
            onRowSelectionChange: handleRowSelectionChange,
            onSortingChange: (updater) => {
              const next = typeof updater === 'function' ? updater(sorting) : updater;
              const column = next[0];

              setFilters({
                equipment_sort_by: (column?.id ?? 'createdAt') as typeof filters.equipment_sort_by,
                equipment_sort_order: !column || column.desc ? 'desc' : 'asc',
                equipment_page: 1,
              });
            },
            state: { sorting, rowSelection },
          }}
        />

        {total > 0 && (
          <TablePaginationWithSize
            total={total}
            currentPage={page}
            pageSize={limit}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            // BUG-E02-A-02 — spec Δ21: the footer is hidden while every row fits on one page.
            alwaysShowFooter={false}
          />
        )}
      </Card>

      <EquipmentBulkStatusDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        selectedCount={selectedIDs.length}
        isSubmitting={isBulkUpdating}
        onSubmit={handleBulkStatusSubmit}
      />
    </div>
  );
}

export default function EquipmentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EquipmentPageContent />
    </Suspense>
  );
}
