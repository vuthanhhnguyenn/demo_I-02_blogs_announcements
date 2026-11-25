'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useCurrentStore } from '@/contexts/current-store.context';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import { Unlock } from 'lucide-react';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import {
  adminLockerSlotOpsControllerListPendingReleaseOptions,
  adminStoreControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { Permission } from '@/types/permission.type';

import { ReleaseConfirmDialog } from '../_components/release-confirm-dialog';
import { useLastSuccessfulData } from '../_hooks/use-last-successful-data.hook';
import { useLockerBulkRelease } from '../_hooks/use-locker-bulk-release.hook';
import { formatLockerLocationLabel, useLockerLocations } from '../_hooks/use-locker-locations.hook';
import { useQueryErrorToast } from '../_hooks/use-query-error-toast.hook';
import {
  type LockerSlotReleaseTarget,
  releaseTargetsFromSelection,
} from '../_utils/locker-slot-release.util';
import { LockerPendingSlotsFilters } from './_components/locker-pending-slots-filters';
import {
  getLockerPendingSlotsTableColumns,
  toPendingReleaseTarget,
} from './_components/locker-pending-slots-table-columns';
import {
  LOCKER_PENDING_SORT_KEYS,
  type LockerPendingSortKey,
  useLockerPendingSlotsFilters,
} from './_hooks/use-locker-pending-slots-filters';

function isSortKey(id: string | undefined): id is LockerPendingSortKey {
  return LOCKER_PENDING_SORT_KEYS.includes(id as LockerPendingSortKey);
}

function LockerPendingSlotsPageContent() {
  const { hasPermission } = useAuthUser();
  const canRelease = hasPermission(Permission.LockersEdit);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, LockerSlotReleaseTarget>>(
    new Map(),
  );
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releaseTargets, setReleaseTargets] = useState<string[]>([]);
  const { releaseTargets: releaseSelectedTargets, isReleasing } = useLockerBulkRelease();
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
    activeFilterCount,
  } = useLockerPendingSlotsFilters();

  const {
    data: queryData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    ...adminLockerSlotOpsControllerListPendingReleaseOptions({ query: queryParams }),
    // Wait for the header store: restricted roles get 400 on a call without `storeId`
    enabled: !isStoreLoading,
    placeholderData: keepPreviousData,
  });

  useQueryErrorToast(isError, '開放待ち一覧の取得に失敗しました');
  const data = useLastSuccessfulData(queryData, isError);

  // Store name for the filter banner. Shares its query key with the store filter's own
  // lookup, so React Query serves it from cache rather than issuing a second request.
  // Restricted roles read it from their own stores (Observer gets 403 on `/admin/stores/{id}`).
  const { canSelectAllStores, restrictedStores } = useCurrentStore();
  const { data: filteredStoreDetail } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: filters.locker_pending_store_id ?? '' } }),
    enabled: Boolean(filters.locker_pending_store_id) && canSelectAllStores,
  });
  const filteredStoreRes = canSelectAllStores
    ? filteredStoreDetail
    : restrictedStores.find((store) => store.id === filters.locker_pending_store_id);

  const { byId: locationsById } = useLockerLocations();
  const filteredLocation = filters.locker_pending_location_id
    ? locationsById.get(filters.locker_pending_location_id)
    : undefined;

  const pendingSlots = useMemo(() => data?.items ?? [], [data?.items]);
  const pagination = data?.pagination;
  const filteredTotal = pagination?.totalItems ?? 0;
  // `null` → the banner's 「M 件を抽出中」 fallback (CONV-001 §3.4.1)
  const totalPendingSlots = pagination?.totalAllItems ?? null;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  const sorting: SortingState = [
    { id: filters.locker_pending_sort_by, desc: filters.locker_pending_sort_order === 'desc' },
  ];

  const selectedIds = useMemo(() => new Set(selectedItems.keys()), [selectedItems]);
  const selectedCount = selectedItems.size;
  const currentPageIds = pendingSlots.map((row) => row.slotId);
  const areAllCurrentRowsSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));

  const toggleRow = useCallback((target: LockerSlotReleaseTarget) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(target.slotId)) {
        next.delete(target.slotId);
      } else {
        next.set(target.slotId, target);
      }
      return next;
    });
  }, []);

  const toggleAllCurrentRows = useCallback(() => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (areAllCurrentRowsSelected) {
        currentPageIds.forEach((id) => next.delete(id));
      } else {
        pendingSlots.forEach((row) => {
          next.set(row.slotId, toPendingReleaseTarget(row));
        });
      }
      return next;
    });
  }, [areAllCurrentRowsSelected, currentPageIds, pendingSlots]);

  const handleBulkRelease = useCallback(() => {
    const targets = releaseTargetsFromSelection(selectedItems);
    setReleaseTargets(targets.map((target) => target.label));
    setReleaseDialogOpen(true);
  }, [selectedItems]);

  const handleConfirmRelease = useCallback(() => {
    releaseSelectedTargets(releaseTargetsFromSelection(selectedItems), {
      onSuccess: () => {
        setReleaseDialogOpen(false);
        setSelectedItems(new Map());
      },
      onPartialSuccess: (openedSlotIds) => {
        setReleaseDialogOpen(false);
        setSelectedItems((prev) => {
          const next = new Map(prev);
          openedSlotIds.forEach((id) => next.delete(id));
          return next;
        });
      },
    });
  }, [releaseSelectedTargets, selectedItems]);

  const columns = useMemo(
    () =>
      getLockerPendingSlotsTableColumns({
        canSelect: canRelease,
        showStoreColumn: !storeId,
        areAllCurrentRowsSelected,
        selectedIds,
        toggleAllCurrentRows,
        toggleRow,
      }),
    [canRelease, storeId, areAllCurrentRowsSelected, selectedIds, toggleAllCurrentRows, toggleRow],
  );

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const id = next[0]?.id;
    if (!isSortKey(id)) {
      setFilters({ locker_pending_sort_by: null, locker_pending_sort_order: null });
      return;
    }

    setFilters({
      locker_pending_sort_by: id,
      locker_pending_sort_order: next[0]?.desc ? 'desc' : 'asc',
    });
  };

  return (
    <>
      <Card className="flex gap-0 overflow-hidden rounded-xl border p-0">
        <div className="flex flex-col gap-3 px-4 py-3">
          <LockerPendingSlotsFilters
            activeFilterCount={activeFilterCount}
            clearFilters={clearFilters}
            filters={filters}
            hasActiveFilters={hasActiveFilters}
            isFilterOpen={isFilterOpen}
            setFilters={setFilters}
            setIsFilterOpen={setIsFilterOpen}
          />

          {canRelease && selectedCount > 0 && (
            <div className="border-primary/20 bg-primary/10 sticky top-0 z-20 flex items-center gap-3 rounded-lg border px-3 py-2">
              <span className="text-primary text-sm font-medium">{selectedCount}件選択中</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedItems(new Map())}>
                選択解除
              </Button>
              <div className="bg-primary/20 h-4 w-px" />
              <RoleGatedButton
                requiredPermission={Permission.LockersEdit}
                denyTooltip="開放操作の権限がありません"
                size="sm"
                className="gap-1"
                onClick={handleBulkRelease}
              >
                <Unlock className="size-3.5" />
                一括開放
              </RoleGatedButton>
            </div>
          )}
        </div>

        <FilterResultBanner
          show={hasActiveFilters}
          totalCount={totalPendingSlots}
          filteredCount={filteredTotal}
          filterSummary={[
            filters.locker_pending_store_id
              ? (filteredStoreRes?.name ?? filters.locker_pending_store_id)
              : '',
            filteredLocation ? formatLockerLocationLabel(filteredLocation) : '',
            filters.locker_pending_cancel_from || filters.locker_pending_cancel_to
              ? `解約日 ${filters.locker_pending_cancel_from || '—'}〜${filters.locker_pending_cancel_to || '—'}`
              : '',
          ]}
          onClear={clearFilters}
        />

        <DataTable
          columns={columns}
          data={pendingSlots}
          isLoading={isLoading || isStoreLoading}
          isFetching={isFetching}
          isError={isError}
          onRetry={() => void refetch()}
          errorTitle="開放待ち一覧の取得に失敗しました"
          variant="simple"
          className="rounded-none border-x-0 border-b-0"
          containerClassName={
            isFilterOpen ? 'max-h-[calc(100vh-380px)]' : 'max-h-[calc(100vh-320px)]'
          }
          emptyContent={
            // FR-008 error case: show 「対象なし」 when no data matches
            <Empty
              variant={hasActiveFilters ? 'filtered' : 'empty'}
              title="対象なし"
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

      <ReleaseConfirmDialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        targetSlots={releaseTargets}
        onConfirm={handleConfirmRelease}
        isPending={isReleasing}
      />
    </>
  );
}

export default function LockerPendingSlotsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LockerPendingSlotsPageContent />
    </Suspense>
  );
}
