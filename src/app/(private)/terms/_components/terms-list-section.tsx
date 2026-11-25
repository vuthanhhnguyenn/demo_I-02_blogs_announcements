'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { termsColumns } from '@/app/(private)/terms/_components/terms-columns';
import { TermsDeleteDialog } from '@/app/(private)/terms/_components/terms-delete-dialog';
import { TermsFilters } from '@/app/(private)/terms/_components/terms-filters';
import {
  TERMS_BRAND_LABELS,
  TERMS_STATUS_LABELS,
  TERMS_TYPES,
  TERMS_TYPE_TAB_LABELS,
  type TermsType,
} from '@/app/(private)/terms/_constants/constants';
import { useTermsFilters } from '@/app/(private)/terms/_hooks/use-terms-filters';
import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, Plus } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import { adminTermsControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { TermsDocumentSummaryDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { UserRole } from '@/types/permission.type';

const TYPE_TABS: Array<{ value: TermsType | 'all'; label: string }> = [
  { value: 'all', label: 'すべて' },
  ...TERMS_TYPES.map((type) => ({ value: type, label: TERMS_TYPE_TAB_LABELS[type] })),
];

export function TermsListSection() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const { hasRole } = useAuthUser();
  const isTrainer = hasRole([UserRole.Trainer]);
  const [deleteTarget, setDeleteTarget] = useState<TermsDocumentSummaryDto | null>(null);

  const filtersHook = useTermsFilters();
  const { filters, setFilters, currentPage, setCurrentPage, pageSize, setPageSize } = filtersHook;

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    ...adminTermsControllerListOptions({ query: filtersHook.queryParams }),
    enabled: !isTrainer,
    // Keep the previous rows (dimmed, with the DataTable overlay) while a filter / page / sort
    // changes, but not across type tabs: another tab's rows must never stand in for this tab's
    // result, so a tab switch shows the skeleton instead (like the per-tab tables of lessons).
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[0].query?.termsType === filtersHook.queryParams.termsType
        ? previousData
        : undefined,
  });

  // Header badge: live documents in the caller's brand scope, independent of tab / search /
  // filters / include-deleted. `totalAllItems` is per type tab, so it needs its own count query.
  const { data: headerCountData } = useQuery({
    ...adminTermsControllerListOptions({ query: { page: 1, limit: 1 } }),
    enabled: !isTrainer,
  });
  const headerCount = headerCountData?.pagination.total;

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? 0;
  const totalAllItems = pagination?.totalAllItems ?? null;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  // Requested page out of range (a stale bookmark / ?page=9999): the API serves no rows for it,
  // so pull the URL back to the last page that exists — once a real response is in hand (members).
  useEffect(() => {
    if (isFetching || !pagination) return;
    const lastPage = Math.max(1, pagination.totalPages);
    if (currentPage > lastPage) setCurrentPage(lastPage);
  }, [isFetching, pagination, currentPage, setCurrentPage]);

  /**
   * What the failed-load block offers (members list pattern): conditions the server refused
   * (400/422, e.g. a search over 100 characters) are fixed by clearing them, a refusal (403) has
   * no way out here, anything else (outage, transport failure) is worth a retry.
   */
  const listErrorAction: { onAction?: () => void; actionLabel?: string } = (() => {
    const status = getApiErrorStatus(error);
    if (status === 403) return {};
    if (status === 400 || status === 422) {
      return { onAction: filtersHook.clearFilters, actionLabel: '条件をクリア' };
    }
    return { onAction: () => void refetch(), actionLabel: '再試行' };
  })();

  const columns: ColumnDef<TermsDocumentSummaryDto>[] = useMemo(
    () =>
      termsColumns({
        onViewClick: (item) => router.push(withReturnTo(navigate('/terms/[id]', item.id))),
        onEditClick: (item) => router.push(withReturnTo(navigate('/terms/[id]/edit', item.id))),
        onDeleteClick: (item) => setDeleteTarget(item),
      }),
    [router, withReturnTo],
  );

  const activeTab = filters.termsType ?? 'all';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="規約文書管理"
        badge={
          headerCount !== undefined && (
            <Badge
              variant="outline"
              className="text-muted-foreground text-xs font-normal tabular-nums"
            >
              {headerCount.toLocaleString()}件
            </Badge>
          )
        }
        actions={
          <RoleGatedButton
            allowedRoles={[UserRole.Headquarter, UserRole.System]}
            className="h-8 gap-1 rounded-[10px] px-3 text-sm font-semibold"
            onClick={() => router.push(withReturnTo(navigate('/terms/create')))}
          >
            <Plus className="size-3.5" />
            新規登録
          </RoleGatedButton>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6 py-4">
        {isTrainer ? (
          <div className="flex h-full min-h-100 items-center justify-center">
            <Card className="flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center">
              <p className="text-sm font-semibold">この画面を表示する権限がありません</p>
              <p className="text-muted-foreground text-xs">
                規約文書管理はトレーナーロールでは参照できません。
              </p>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setFilters({ termsType: value === 'all' ? null : (value as TermsType), page: 1 });
              }}
              className="gap-4"
            >
              <TabsList variant="line">
                {TYPE_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={activeTab}>
                <Card className="gap-0 overflow-hidden rounded-xl border p-0">
                  <TermsFilters filtersHook={filtersHook} />

                  <FilterResultBanner
                    show={filtersHook.hasActiveFilters && !isError}
                    totalCount={totalAllItems}
                    filteredCount={totalItems}
                    filterSummary={[
                      filters.query ? `"${filters.query}"` : '',
                      filtersHook.brandEnum
                        ? (TERMS_BRAND_LABELS[filtersHook.brandEnum] ?? filtersHook.brandEnum)
                        : '',
                      filters.status ? (TERMS_STATUS_LABELS[filters.status] ?? filters.status) : '',
                    ]}
                    onClear={filtersHook.clearFilters}
                  />

                  <DataTable
                    tableSize="md"
                    columns={columns}
                    data={items}
                    isLoading={isLoading}
                    isFetching={isFetching}
                    isError={isError}
                    onRetry={() => void refetch()}
                    errorTitle="規約文書一覧の取得に失敗しました"
                    variant="simple"
                    className="rounded-none border-x-0 border-b-0"
                    onRowClick={(row) => {
                      router.push(withReturnTo(navigate('/terms/[id]', row.id)));
                    }}
                    getRowClassName={(row) => (row.isDeleted ? 'opacity-50' : undefined)}
                    tableOptions={{
                      onSortingChange: filtersHook.setSorting,
                      manualSorting: true,
                      state: { sorting: filtersHook.sorting },
                    }}
                    emptyContent={
                      isError ? (
                        <Empty
                          icon={AlertCircle}
                          title="規約文書一覧の取得に失敗しました"
                          description={resolveApiErrorMessage(error)}
                          {...listErrorAction}
                        />
                      ) : (
                        <Empty
                          variant={filtersHook.hasActiveFilters ? 'filtered' : 'empty'}
                          entityLabel="規約文書"
                          onAction={
                            filtersHook.hasActiveFilters ? filtersHook.clearFilters : undefined
                          }
                        />
                      )
                    }
                  />

                  {!isError && totalItems > 0 && (
                    <TablePaginationWithSize
                      currentPage={page}
                      total={totalItems}
                      pageSize={limit}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                    />
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <TermsDeleteDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}
