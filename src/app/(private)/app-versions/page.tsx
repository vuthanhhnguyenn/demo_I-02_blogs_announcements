'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminAppVersionControllerDetailQueryKey,
  adminAppVersionControllerListOptions,
  adminAppVersionControllerListQueryKey,
  adminAppVersionControllerRemoveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { AppVersionDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { AppStoreUrlDialog } from './_components/app-store-url-dialog';
import { AppVersionDeleteDialog } from './_components/app-version-delete-dialog';
import { AppVersionFilters } from './_components/app-version-filters';
import { AppVersionTableColumns } from './_components/app-version-table-columns';
import {
  APP_VERSION_DETAIL_QUERY_PREFIX,
  formatAppVersionTitle,
} from './_constants/app-version.constants';
import { useAppVersionsFilters } from './_hooks/use-app-versions-filters';

function AppVersionsPageContent() {
  const [deleteTarget, setDeleteTarget] = useState<AppVersionDto | null>(null);
  const [storeUrlOpen, setStoreUrlOpen] = useState(false);
  const filtersHook = useAppVersionsFilters();
  const { currentPage, setCurrentPage } = filtersHook;
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const queryClient = useQueryClient();

  const { data, error, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminAppVersionControllerListOptions({ query: filtersHook.queryParams }),
    // Keep the current rows while a brand / page change loads, so the table does not
    // flash back to the skeleton.
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const totalFilteredItems = pagination?.totalItems ?? 0;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? filtersHook.pageSize;
  // The out-of-range response (no rows under a non-zero total) is about to be replaced by the
  // clamp below: show it as loading, never as an empty list.
  const isPastLastPage = !isError && items.length === 0 && totalFilteredItems > 0;
  const isListLoading = isLoading || isPastLastPage;

  // A page past the last one (bookmark, or a delete emptied the last page) returns no rows: pull
  // the URL back to the last real page. Only on a settled response: mid-flight `keepPreviousData`
  // still describes the previous page.
  useEffect(() => {
    if (isFetching || !pagination) return;
    const lastPage = Math.max(1, pagination.totalPages);
    if (currentPage > lastPage) setCurrentPage(lastPage);
  }, [isFetching, pagination, currentPage, setCurrentPage]);

  const deleteMutation = useMutation({
    ...adminAppVersionControllerRemoveMutation(),
    onSuccess: (_data, variables) => {
      toast.success('アプリバージョンを削除しました');
      queryClient.invalidateQueries({ queryKey: adminAppVersionControllerListQueryKey() });
      // A detail opened earlier must not come back from cache as live (Back / Forward).
      queryClient.removeQueries({
        queryKey: adminAppVersionControllerDetailQueryKey({ path: variables.path }),
      });
      // Every other detail too: a later setting left blank carried over from the deleted one.
      queryClient.invalidateQueries({ queryKey: APP_VERSION_DETAIL_QUERY_PREFIX });
      setDeleteTarget(null);
    },
  });

  // What a failed load offers: conditions the server refused (400/422) are not fixed by
  // resending them, a refused request (403) has no way out here, anything else is retried.
  // The same rule holds with no rows (empty-state block) and over stale rows (error row).
  const errorStatus = getApiErrorStatus(error);
  const isConditionRefused = errorStatus === 400 || errorStatus === 422;
  const isRetryable = !isConditionRefused && errorStatus !== 403;
  const retry = () => void refetch();
  const listErrorAction = (() => {
    if (isConditionRefused) {
      return { onAction: filtersHook.clearFilters, actionLabel: '条件をクリア' };
    }
    return isRetryable ? { onAction: retry, actionLabel: '再試行' } : {};
  })();

  const columns: ColumnDef<AppVersionDto>[] = useMemo(
    () =>
      AppVersionTableColumns({
        onEditClick: (id) => {
          router.push(withReturnTo(navigate('/app-versions/[id]/edit', id)));
        },
        onDeleteClick: (item) => {
          setDeleteTarget(item);
        },
      }),
    [router, withReturnTo],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="アプリ配信バージョン管理"
        badge={
          // Only once a count is in hand: while loading or under a load error 0件 would be false.
          pagination && (
            <Badge
              variant="outline"
              className="text-muted-foreground text-xs font-normal tabular-nums"
            >
              {pagination.totalItems.toLocaleString()}件
            </Badge>
          )
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="gap-1"
              onClick={() => setStoreUrlOpen(true)}
            >
              <Link2 className="size-4" />
              ストアの URL の設定
            </Button>
            <RoleGatedButton
              requiredPermission={Permission.AppVersionsCreate}
              type="button"
              className="gap-1"
              denyTooltip="本部権限が必要です"
              onClick={() => router.push(withReturnTo(navigate('/app-versions/create')))}
            >
              <Plus className="size-4" />
              新規登録
            </RoleGatedButton>
          </>
        }
      />

      <div className="bg-background flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
        <Card className="flex min-h-0 flex-col gap-0 rounded-xl border p-0">
          <AppVersionFilters filtersHook={filtersHook} />

          <DataTable
            isLoading={isListLoading}
            isFetching={isFetching}
            isError={isError}
            onRetry={isRetryable ? retry : undefined}
            errorTitle="アプリバージョン一覧の取得に失敗しました"
            tableSize="md"
            columns={columns}
            data={items}
            variant="simple"
            className="h-full min-h-0 flex-1 rounded-none border-x-0 border-b-0"
            containerClassName="h-full"
            onRowClick={(item) =>
              router.push(withReturnTo(navigate('/app-versions/[id]', item.id)))
            }
            emptyContent={
              isError ? (
                <Empty
                  title="アプリバージョン一覧の取得に失敗しました"
                  description={resolveApiErrorMessage(error)}
                  {...listErrorAction}
                />
              ) : (
                <Empty
                  variant={filtersHook.hasActiveFilters ? 'filtered' : 'empty'}
                  entityLabel="アプリバージョン"
                  onAction={filtersHook.hasActiveFilters ? filtersHook.clearFilters : undefined}
                />
              )
            }
          />

          {/* A failed reload keeps the earlier rows on screen, and their pager with them. */}
          {!isListLoading && pagination && (
            <TablePaginationWithSize
              currentPage={page}
              total={totalFilteredItems}
              pageSize={limit}
              onPageChange={filtersHook.setCurrentPage}
              onPageSizeChange={filtersHook.setPageSize}
            />
          )}
        </Card>
      </div>

      <AppVersionDeleteDialog
        open={deleteTarget !== null}
        targetName={deleteTarget ? formatAppVersionTitle(deleteTarget) : null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync({ path: { id: deleteTarget.id } });
        }}
        isPending={deleteMutation.isPending}
      />

      <AppStoreUrlDialog open={storeUrlOpen} onOpenChange={setStoreUrlOpen} />
    </div>
  );
}

export default function AppVersionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AppVersionsPageContent />
    </Suspense>
  );
}
