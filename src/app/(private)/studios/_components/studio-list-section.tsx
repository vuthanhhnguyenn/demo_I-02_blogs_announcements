'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { StudioFilters } from '@/app/(private)/studios/_components/studio-filters';
import { useStudioList } from '@/app/(private)/studios/_hooks/use-studio-list';
import {
  STUDIO_KIND_BY_TYPE,
  STUDIO_PAGE_SIZE,
  type StudioKind,
  toStudioListQuery,
} from '@/app/(private)/studios/_utils/studio-api.util';
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

import { adminStudioControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { StudioListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

// --- Helper ---
export function TypeBadge({
  type,
}: Readonly<{
  type: StudioKind;
}>) {
  switch (type) {
    case 'studio-lesson':
      return (
        <Badge
          variant="outline"
          className="bg-muted text-muted-foreground border-border text-[11px]"
        >
          スタジオレッスン用
        </Badge>
      );
    case 'pt':
      return (
        <Badge
          variant="outline"
          className="bg-warning/10 text-warning border-warning/20 text-[11px]"
        >
          PT用
        </Badge>
      );
    case 'body-care':
      return (
        <Badge variant="outline" className="bg-info/10 text-info border-info/20 text-[11px]">
          ボディケア用
        </Badge>
      );
  }
}
export function StudioListSection() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const { params, setParams, resetFilters } = useStudioList();
  const { search, store_id, studio_type, brand, status, sort_by, sort_order, page } = params;

  const debouncedSearch = useDebounce(search, 300);
  // The header's store narrows the list (D5 of the integration plan); 全店舗 leaves it to the filter
  const { currentStoreId, isLoading: isStoreScopeLoading } = useCurrentStore();
  const scopeStoreId = currentStoreId && currentStoreId !== ALL_STORES ? currentStoreId : null;

  // Switching the header store drops the filter's store: the filter is hidden under a specific
  // header store, so a store left in it would narrow the list out of sight. The first resolved
  // scope is not a switch.
  const previousStoreIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (isStoreScopeLoading) return;
    const previousStoreId = previousStoreIdRef.current;
    previousStoreIdRef.current = currentStoreId;
    if (previousStoreId === null || previousStoreId === currentStoreId) return;
    void setParams({ store_id: '', page: 1 });
  }, [currentStoreId, isStoreScopeLoading, setParams]);

  const query = useMemo(
    () =>
      toStudioListQuery(
        {
          search: debouncedSearch,
          store_id,
          studio_type,
          brand,
          status,
          sort_by,
          sort_order,
          page,
        },
        scopeStoreId,
      ),
    [
      debouncedSearch,
      store_id,
      studio_type,
      brand,
      status,
      sort_by,
      sort_order,
      page,
      scopeStoreId,
    ],
  );

  const { data, isLoading, isError, refetch } = useQuery(
    adminStudioControllerListOptions({ query }),
  );

  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.pagination.totalItems ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  // The filter's store only counts on 全店舗, where it is shown
  const activeFilterCount = [scopeStoreId ? '' : store_id, studio_type, brand, status].filter(
    Boolean,
  ).length;
  const hasActiveFilters = activeFilterCount > 0 || search !== '';

  const [sorting, setSorting] = useState<SortingState>(() =>
    sort_by === 'id' && sort_order === 'asc' ? [] : [{ id: sort_by, desc: sort_order === 'desc' }],
  );
  const handleSortingChange = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(next);
      if (next.length === 0) return;
      setParams({
        sort_by: next[0].id,
        sort_order: next[0].desc ? 'desc' : 'asc',
        page: 1,
      });
    },
    [sorting, setParams],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setParams({ page: newPage });
    },
    [setParams],
  );

  const handleClearFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const columns: ColumnDef<StudioListItemDto>[] = useMemo(
    () => [
      {
        // The API id is a UUID — truncated with a tooltip; sorting by it sends `createdAt` (UUID v7)
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="スタジオID" />,
        cell: ({ row }) => (
          <TextWithTooltip
            text={row.original.id}
            className="text-muted-foreground max-w-[84px] font-mono text-xs"
          />
        ),
        meta: { className: 'w-[100px]' },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="スタジオ名" />,
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'brand',
        header: 'ブランド',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.brand ? <BrandBadge brand={row.original.brand} /> : <span>—</span>,
        meta: { className: 'w-[100px]' },
      },
      {
        // TODO(round2) B1: sortable once the API sorts by store name (FR-001-03)
        id: 'store_name',
        accessorKey: 'storeName',
        header: '店舗名',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.original.storeName ?? '—'}</span>
        ),
      },
      {
        id: 'studio_type',
        accessorKey: 'studioType',
        header: ({ column }) => <DataTableColumnHeader column={column} title="スタジオ区分" />,
        cell: ({ row }) => <TypeBadge type={STUDIO_KIND_BY_TYPE[row.original.studioType]} />,
      },
      {
        accessorKey: 'capacity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="定員" />,
        cell: ({ row }) => <span className="text-xs">{row.original.capacity}名</span>,
        meta: { className: 'w-[80px]' },
      },
      {
        id: 'status',
        accessorKey: 'isActive',
        header: 'ステータス',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge
              variant="outline"
              className="bg-success/10 text-success border-success/20 text-[11px]"
            >
              有効
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-muted text-muted-foreground border-muted-foreground/20 text-[11px]"
            >
              無効
            </Badge>
          ),
        meta: { className: 'w-[100px]' },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col">
      <PageHeader
        title="スタジオ管理"
        badge={
          <Badge variant="secondary" className="text-xs">
            {total.toLocaleString()}件
          </Badge>
        }
        actions={
          <RoleGatedButton
            requiredPermission={Permission.StudiosCreate}
            type="button"
            className="h-8 gap-1 rounded-[10px] px-3 text-sm font-semibold"
            onClick={() => router.push(withReturnTo(navigate('/studios/create')))}
          >
            <Plus className="size-3.5" />
            新規スタジオ登録
          </RoleGatedButton>
        }
      />

      <div className="px-6 py-4">
        <Card className="gap-0 overflow-hidden py-0">
          <StudioFilters
            search={search}
            onSearchChange={(v) => setParams({ search: v, page: 1 })}
            storeId={store_id}
            onStoreIdChange={(v) => setParams({ store_id: v, page: 1 })}
            studioType={studio_type}
            onStudioTypeChange={(v) => setParams({ studio_type: v, page: 1 })}
            brand={brand}
            onBrandChange={(v) => setParams({ brand: v, page: 1 })}
            status={status}
            onStatusChange={(v) => setParams({ status: v, page: 1 })}
            activeFilterCount={activeFilterCount}
            onClearFilters={handleClearFilters}
          />
          <DataTable
            columns={columns}
            data={items}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            errorTitle="スタジオ一覧の取得に失敗しました"
            variant="simple"
            onRowClick={(row) => router.push(withReturnTo(navigate('/studios/[id]', row.id)))}
            className="rounded-none border-x-0 border-b-0"
            tableOptions={{
              manualSorting: true,
              onSortingChange: handleSortingChange,
              state: { sorting },
              getRowId: (originalRow) => originalRow.id,
            }}
            emptyContent={
              <Empty
                onAction={handleClearFilters}
                title="スタジオが見つかりません"
                description={
                  hasActiveFilters
                    ? '検索条件を変更してお試しください'
                    : '登録されたスタジオがありません'
                }
              />
            }
          />

          {total > 0 && (
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              total={total}
              limit={STUDIO_PAGE_SIZE}
              onPageChange={handlePageChange}
              isLoading={isLoading}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
