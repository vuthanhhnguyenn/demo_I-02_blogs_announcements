'use client';

import { Suspense, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { useStoreLabel } from '@/components/common/data-select-input';
import { Empty } from '@/components/common/data-state-boundary/empty';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card } from '@/components/ui/card';

import {
  adminStaffControllerReinviteMutation,
  adminStaffPermissionControllerListPositionsOptions,
  adminStaffPermissionControllerListStaffOptions,
  adminStaffPermissionControllerListStaffQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StaffSummaryDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { UserRole } from '@/types/permission.type';

import { StaffsFilters } from './_components/staffs-filters';
import {
  STAFF_SORT_API_FIELD_TO_COLUMN,
  STAFF_SORT_COLUMN_TO_API_FIELD,
  StaffsTableColumns,
} from './_components/staffs-table-columns';
import { STAFF_ROLE_LABELS, STAFF_STATUS_LABELS } from './_constants/constants';
import { StaffsFiltersProvider } from './_contexts/staffs-filters-context';
import { useStaffsFilters } from './_hooks/use-staffs-filters';

type Staff = StaffSummaryDto;

function StaffsPageContent() {
  const filtersHook = useStaffsFilters();
  const { filters, queryParams, currentPage, setCurrentPage, pageSize, setPageSize } = filtersHook;
  // Deep links (e.g. `/staffs?position=<id>`) must land with the panel already expanded, so the
  // condition that is filtering the list is visible and removable (TC-121, BUG-P2-01-13).
  // Initial-state only — reopening/closing afterwards stays a pure user action.
  const [isFilterOpen, setIsFilterOpen] = useState(
    () =>
      filters.role !== null ||
      filters.position !== null ||
      filters.store_id !== null ||
      filters.status !== null,
  );

  // Server-side sort — `GET /admin/staff` orders the full result set via `sort`/`order`.
  const sorting: SortingState = filters.sort
    ? [
        {
          id:
            STAFF_SORT_API_FIELD_TO_COLUMN[
              filters.sort as keyof typeof STAFF_SORT_API_FIELD_TO_COLUMN
            ] ?? filters.sort,
          desc: filters.order === 'desc',
        },
      ]
    : [];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (next.length === 0) {
      filtersHook.setSort(null, null);
      return;
    }
    const columnId = next[0].id as keyof typeof STAFF_SORT_COLUMN_TO_API_FIELD;
    const apiField = STAFF_SORT_COLUMN_TO_API_FIELD[columnId];
    if (!apiField) return;
    filtersHook.setSort(apiField, next[0].desc ? 'desc' : 'asc');
  };
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const queryClient = useQueryClient();
  const { currentStoreId } = useCurrentStore();
  const isSingleStoreContext = currentStoreId !== ALL_STORES;
  const headerStoreId = isSingleStoreContext ? currentStoreId : undefined;
  const hasActiveFilterOrSearch = filtersHook.hasActiveFilters;

  const reinviteMutation = useMutation({
    ...adminStaffControllerReinviteMutation(),
  });

  const handleResendInvite = (staffId: string, email: string) => {
    reinviteMutation.mutate(
      { path: { id: staffId } },
      {
        onSuccess: () => {
          toast.success('招待メールを再送しました', {
            description: `${email} に招待メールを再送信しました。`,
          });
          queryClient.invalidateQueries({
            queryKey: adminStaffPermissionControllerListStaffQueryKey(),
          });
        },
      },
    );
  };

  // Baseline count (role-scoped, no search/filter) — powers the FilterResultBanner's "全N件中"
  // text and the header badge, which must stay on the in-scope total while a filter narrows the
  // table (BUG-P2-01-03). Always fetched: the badge needs it even with no filter applied.
  const { data: baselineData } = useQuery({
    ...adminStaffPermissionControllerListStaffOptions({
      query: { page: 1, limit: 1, storeId: headerStoreId },
    }),
  });

  // ─── Fetch staffs list ─────────────────────────────────────────────────────
  // `store_id` from the header context (single-store scope) takes precedence over the
  // advanced-filter's own store select, which is hidden whenever the header is narrowed.

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminStaffPermissionControllerListStaffOptions({
      query: { ...queryParams, storeId: headerStoreId ?? queryParams.storeId },
    }),
  });

  // Labels for the FilterResultBanner's 職位/店舗 condition text (BUG-Y01LIST-02)
  const { data: positionsForBanner } = useQuery({
    ...adminStaffPermissionControllerListPositionsOptions(),
    enabled: filters.position != null,
  });
  const positionBannerLabel = positionsForBanner?.items.find(
    (p) => p.positionId === filters.position,
  )?.name;

  const { label: storeBannerLabel } = useStoreLabel(filters.store_id);

  const staffs = data?.items ?? [];
  const pagination = data?.pagination;
  const totalStaffs = pagination?.totalItems ?? 0;
  /** Unfiltered in-scope total — the header badge's semantics, distinct from `totalStaffs`. */
  const baselineTotal = baselineData?.pagination.totalItems ?? totalStaffs;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  // ─── Columns ───────────────────────────────────────────────────────────────

  const handlePositionClick = (positionId: string) => {
    filtersHook.updateFilter('position', positionId);
    setIsFilterOpen(true);
  };

  const columns: ColumnDef<Staff>[] = useMemo(
    () =>
      StaffsTableColumns({
        onEditClick: (id) => {
          router.push(withReturnTo(navigate('/staffs/[id]/edit', id)));
        },
        onPositionClick: handlePositionClick,
        onResendInvite: handleResendInvite,
        isSingleStoreContext,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSingleStoreContext, withReturnTo],
  );

  return (
    <div className="">
      {/* Header Section */}
      <div className="flex flex-col gap-3 px-4 py-4 pb-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">スタッフ管理</h1>
          <span className="text-muted-foreground text-sm">{baselineTotal}件</span>
        </div>
        <RoleGatedButton
          allowedRoles={[UserRole.Headquarter, UserRole.System]}
          denyTooltip="本部権限が必要です"
          className="w-full gap-2 sm:w-auto"
          onClick={() => router.push(withReturnTo(navigate('/staffs/create')))}
        >
          <Plus className="size-4" />
          スタッフを追加
        </RoleGatedButton>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Filters + Table in one Card */}
        <Card className="gap-0! overflow-hidden rounded-xl border p-0 shadow-sm">
          {/* Filters */}
          <div className="p-3">
            <StaffsFiltersProvider value={filtersHook}>
              <StaffsFilters
                isFilterOpen={isFilterOpen}
                onFilterOpenChange={setIsFilterOpen}
                isSingleStoreContext={isSingleStoreContext}
              />
            </StaffsFiltersProvider>
          </div>

          <FilterResultBanner
            show={hasActiveFilterOrSearch}
            totalCount={baselineTotal}
            filteredCount={totalStaffs}
            filterSummary={[
              filters.search && `"${filters.search}"`,
              filters.role && `ロール: ${STAFF_ROLE_LABELS[filters.role]}`,
              filters.position != null && positionBannerLabel && `職位: ${positionBannerLabel}`,
              filters.store_id && storeBannerLabel && `店舗: ${storeBannerLabel}`,
              filters.status && `ステータス: ${STAFF_STATUS_LABELS[filters.status]}`,
            ].filter((v): v is string => Boolean(v))}
            onClear={filtersHook.clearFilters}
          />

          {/* Table */}
          <DataTable
            columns={columns}
            data={staffs}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            errorTitle="スタッフ一覧の取得に失敗しました"
            variant="simple"
            className="rounded-none border-x-0 border-b-0"
            containerClassName={
              isFilterOpen ? 'max-h-[calc(100vh-370px)]' : 'max-h-[calc(100vh-320px)]'
            }
            tableOptions={{
              manualSorting: true,
              onSortingChange: handleSortingChange,
              state: { sorting },
            }}
            onRowClick={(row) => {
              router.push(withReturnTo(navigate('/staffs/[id]', row.id)));
            }}
            emptyContent={
              <Empty
                variant={hasActiveFilterOrSearch ? 'filtered' : 'empty'}
                entityLabel="スタッフ"
                onAction={hasActiveFilterOrSearch ? filtersHook.clearFilters : undefined}
              />
            }
          />

          {/* Pagination */}
          <TablePaginationWithSize
            total={totalStaffs}
            currentPage={page}
            pageSize={limit}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </Card>
      </div>
    </div>
  );
}

export default function StaffsPage() {
  return (
    <Suspense>
      <StaffsPageContent />
    </Suspense>
  );
}
