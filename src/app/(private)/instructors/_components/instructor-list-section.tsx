'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useInstructorList } from '@/app/(private)/instructors/_hooks/use-instructor-list';
import {
  BRAND_GROUP_BADGE,
  COACH_TYPE_LABELS,
  INSTRUCTOR_PAGE_SIZE,
  brandGroupsOf,
  fullName,
  toInstructorCountQuery,
  toInstructorListQuery,
} from '@/app/(private)/instructors/_utils/instructor-api.util';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';

import { useDebounce } from '@/hooks/use-debounce.hook';
import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BrandBadge } from '@/components/common/brand-badge';
import { Empty } from '@/components/common/data-state-boundary/empty';
import { DataTable } from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePagination } from '@/components/common/table-pagination';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';

import { adminTrainerControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { TrainerListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { InstructorAvatar } from './instructor-avatar';
import { InstructorFilters } from './instructor-filters';
import { InstructorTabs } from './instructor-tabs';

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (!isActive) {
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px]">
        無効
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[11px]">
      有効
    </Badge>
  );
}

export function InstructorListSection() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const { params, setParams, resetFilters } = useInstructorList();
  const {
    tab: activeTab,
    search,
    role: filterRole,
    brand: filterBrand,
    status: filterStatus,
    sort_by,
    sort_order,
    page,
  } = params;

  const debouncedSearch = useDebounce(search, 300);
  // The header's store narrows the list and the counts (D6); 全店舗 sends none
  const { currentStoreId } = useCurrentStore();
  const scopeStoreId = currentStoreId && currentStoreId !== ALL_STORES ? currentStoreId : null;

  const query = useMemo(
    () =>
      toInstructorListQuery(
        {
          tab: activeTab,
          search: debouncedSearch,
          role: filterRole,
          brand: filterBrand,
          status: filterStatus,
          sort_by,
          sort_order,
          page,
        },
        scopeStoreId,
      ),
    [
      activeTab,
      debouncedSearch,
      filterRole,
      filterBrand,
      filterStatus,
      sort_by,
      sort_order,
      page,
      scopeStoreId,
    ],
  );

  const { data, isLoading, isError, refetch } = useQuery(
    adminTrainerControllerListOptions({ query }),
  );

  // Each tab badge counts its tab under the current search / filters, so it matches the rows the
  // tab lists (UT D-04 No3). The role filter belongs to the active tab only. The header count stays
  // the unfiltered total in scope.
  const countFilters = useMemo(
    () => ({ search: debouncedSearch, brand: filterBrand, status: filterStatus }),
    [debouncedSearch, filterBrand, filterStatus],
  );
  const { data: studioCount } = useQuery(
    adminTrainerControllerListOptions({
      query: toInstructorCountQuery('studio', scopeStoreId, {
        ...countFilters,
        role: activeTab === 'studio' ? filterRole : '',
      }),
    }),
  );
  const { data: ptCount } = useQuery(
    adminTrainerControllerListOptions({
      query: toInstructorCountQuery('pt', scopeStoreId, {
        ...countFilters,
        role: activeTab === 'pt' ? filterRole : '',
      }),
    }),
  );
  const { data: allCount } = useQuery(
    adminTrainerControllerListOptions({ query: toInstructorCountQuery(null, scopeStoreId) }),
  );

  const instructors = useMemo(() => data?.items ?? [], [data]);
  const total = data?.pagination.totalItems ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  const activeFilterCount = [filterRole, filterBrand, filterStatus].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0 || search !== '';

  const [sorting, setSorting] = useState<SortingState>(() =>
    sort_by === 'id' && sort_order === 'asc' ? [] : [{ id: sort_by, desc: sort_order === 'desc' }],
  );
  const handleSortingChange = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(next);
      if (next.length === 0) return;
      void setParams({
        sort_by: next[0].id,
        sort_order: next[0].desc ? 'desc' : 'asc',
        page: 1,
      });
    },
    [sorting, setParams],
  );

  const columns: ColumnDef<TrainerListItemDto>[] = useMemo(
    () => [
      {
        // The API id is a UUID — truncated with a tooltip; sorting by it sends `createdAt` (D5)
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
        cell: ({ row }) => (
          <TextWithTooltip
            text={row.original.id}
            className="text-muted-foreground max-w-[84px] font-mono text-xs"
          />
        ),
        meta: { className: 'w-[100px]' },
      },
      {
        id: 'name',
        accessorFn: (row) => fullName(row),
        header: ({ column }) => <DataTableColumnHeader column={column} title="氏名" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <InstructorAvatar
              id={row.original.id}
              name={fullName(row.original)}
              photoUrl={row.original.facePhotoUrl}
            />
            <p className="text-sm font-medium">{fullName(row.original)}</p>
          </div>
        ),
        meta: { className: 'w-[240px]' },
      },
      {
        // FR-001: its own column (not a sub-line under 氏名); the API has no nickname sort
        accessorKey: 'nickname',
        header: 'ニックネーム',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.nickname ? (
            <TextWithTooltip text={row.original.nickname} className="max-w-[144px] text-sm" />
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
        meta: { className: 'w-[160px]' },
      },
      {
        accessorKey: 'coachTypes',
        header: '役割区分',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.coachTypes.map((role) => (
              <Badge key={role} variant="outline" className="text-[10px] font-normal">
                {COACH_TYPE_LABELS[role]}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        // Brand groups of the trainer's schedule stores (D3); none until a schedule exists
        id: 'brands',
        header: 'ブランド',
        enableSorting: false,
        cell: ({ row }) => {
          const groups = brandGroupsOf(row.original.derivedBrands);
          return groups.length === 0 ? (
            <span className="text-muted-foreground text-xs">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {groups.map((group) => (
                <BrandBadge key={group} brand={BRAND_GROUP_BADGE[group]} />
              ))}
            </div>
          );
        },
        meta: { className: 'w-[160px]' },
      },
      {
        id: 'status',
        accessorKey: 'isActive',
        header: 'ステータス',
        enableSorting: false,
        cell: ({ row }) => <StatusBadge isActive={row.original.isActive} />,
        meta: { className: 'w-[100px]' },
      },
    ],
    [],
  );

  const renderTable = () => (
    <>
      <DataTable
        columns={columns}
        data={instructors}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        errorTitle="指導者一覧の取得に失敗しました"
        variant="simple"
        onRowClick={(row) => router.push(withReturnTo(navigate('/instructors/[id]', row.id)))}
        className="rounded-none border-x-0 border-b-0"
        tableOptions={{
          manualSorting: true,
          onSortingChange: handleSortingChange,
          state: { sorting },
          getRowId: (originalRow) => originalRow.id,
        }}
        emptyContent={
          <Empty
            onAction={resetFilters}
            title="指導者が見つかりません"
            description={
              hasActiveFilters ? '検索条件を変更してお試しください' : '登録された指導者がいません'
            }
          />
        }
      />
      {!isError && total > 0 && (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          limit={INSTRUCTOR_PAGE_SIZE}
          onPageChange={(newPage) => void setParams({ page: newPage })}
          isLoading={isLoading}
        />
      )}
    </>
  );

  return (
    <div className="flex flex-col">
      <PageHeader
        title="指導者管理"
        badge={
          <Badge variant="secondary" className="text-xs">
            {(allCount?.pagination.totalItems ?? 0).toLocaleString()}件
          </Badge>
        }
        actions={
          <RoleGatedButton
            requiredPermission={Permission.InstructorsCreate}
            denyTooltip="新規登録は本部・マネージャー・スタッフのみ可能です"
            type="button"
            className="h-8 gap-1 rounded-[10px] px-3 text-sm font-semibold"
            onClick={() => router.push(withReturnTo(navigate('/instructors/create')))}
          >
            <Plus className="size-3.5" />
            新規指導者登録
          </RoleGatedButton>
        }
      />

      <div className="px-6 py-4">
        <Tabs
          value={activeTab}
          // The search, brand and status carry over, so the tab opens on the count its badge showed;
          // the role filter lists the other tab's types, so it is cleared
          onValueChange={(v) => setParams({ tab: v as 'studio' | 'pt', role: '', page: 1 })}
          className="gap-4"
        >
          <InstructorTabs
            studioCount={studioCount?.pagination.totalItems ?? 0}
            ptCount={ptCount?.pagination.totalItems ?? 0}
          />

          <Card className="gap-0 overflow-hidden py-0">
            <div className="space-y-3 px-4 py-3">
              <InstructorFilters
                tab={activeTab}
                search={search}
                onSearchChange={(v) => setParams({ search: v, page: 1 })}
                filterRole={filterRole}
                filterBrand={filterBrand}
                filterStatus={filterStatus}
                onRoleChange={(v) => setParams({ role: v, page: 1 })}
                onBrandChange={(v) => setParams({ brand: v, page: 1 })}
                onStatusChange={(v) => setParams({ status: v, page: 1 })}
                onClearFilters={resetFilters}
                activeFilterCount={activeFilterCount}
              />
            </div>

            <TabsContent value="studio" className="mt-0">
              {renderTable()}
            </TabsContent>
            <TabsContent value="pt" className="mt-0">
              {renderTable()}
            </TabsContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}
