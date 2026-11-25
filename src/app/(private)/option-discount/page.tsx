'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';

import { useRouter } from 'next/navigation';

import { handleLogout } from '@/utils/global.util';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Error as ErrorView } from '@/components/common/data-state-boundary/error';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePagination } from '@/components/common/table-pagination';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card } from '@/components/ui/card';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminOptionSetControllerDetailQueryKey,
  adminOptionSetControllerListOptions,
  adminOptionSetControllerListQueryKey,
  adminOptionSetControllerSetActiveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionSetListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { OptionDiscountFilters } from './_components/option-discount-filters';
import {
  OptionDiscountTableColumns,
  isRightAfterMenuAction,
} from './_components/option-discount-table-columns';
import { OptionDiscountFiltersProvider } from './_contexts/option-discount-filters-context';
import {
  type OptionDiscountFiltersState,
  useOptionDiscountFilters,
} from './_hooks/use-option-discount-filters';

type OptionDiscountRow = OptionSetListItemDto;

function OptionDiscountPageContent() {
  const filtersHook = useOptionDiscountFilters();
  const queryClient = useQueryClient();
  const {
    filters,
    setFilters,
    queryParams,
    currentPage,
    setCurrentPage,
    pageSize,
    hasActiveFilters,
    clearFilters,
  } = filtersHook;
  const router = useRouter();
  const withReturnTo = useWithReturnTo();

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    ...adminOptionSetControllerListOptions({
      query: { ...queryParams, includeTotalAll: true },
    }),
    placeholderData: keepPreviousData,
    // Offline: surface the failure (error view + retry) instead of pausing the query forever.
    networkMode: 'always',
  });

  // 401 = the refresh interceptor could not renew the session — same exit as PagePermissionGuard.
  const isSessionExpired = isError && getApiErrorStatus(error) === 401;
  const loggingOutRef = useRef(false);
  useEffect(() => {
    if (!isSessionExpired || loggingOutRef.current) return;
    loggingOutRef.current = true;
    void handleLogout({ sessionExpired: true });
  }, [isSessionExpired]);

  // G-02 FR-006: a set discount is never deleted — it is deactivated instead.
  const { mutate: toggleStatus } = useMutation({
    ...adminOptionSetControllerSetActiveMutation(),
    onSuccess: (res) => {
      toast.success(
        res.isActive ? `「${res.name}」を有効化しました` : `「${res.name}」を無効化しました`,
      );
      queryClient.invalidateQueries({ queryKey: adminOptionSetControllerListQueryKey() });
      queryClient.invalidateQueries({
        queryKey: adminOptionSetControllerDetailQueryKey({ path: { setId: res.id } }),
      });
    },
    // The failure toast comes from the app-wide MutationCache handler (BE `userMessage`).
  });

  const optionDiscounts = data?.items ?? [];
  const pagination = data?.pagination;
  const totalOptionDiscounts = pagination?.totalItems ?? 0;
  // Unfiltered total for the banner's 「全N件中」; `null` = the server declined the count.
  const totalAllOptionDiscounts = pagination?.totalAllItems ?? totalOptionDiscounts;
  const totalPages = pagination?.totalPages ?? 0;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  useEffect(() => {
    if (!isFetching && page !== currentPage) {
      setCurrentPage(page);
    }
  }, [isFetching, page, currentPage, setCurrentPage]);

  const sorting: SortingState = filters.sort_by
    ? [{ id: filters.sort_by, desc: filters.sort_order === 'desc' }]
    : [];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;

    if (next.length === 0) {
      setFilters({ sort_by: null, sort_order: null });
    } else {
      setFilters({
        sort_by: next[0].id as OptionDiscountFiltersState['sort_by'],
        sort_order: next[0].desc ? 'desc' : 'asc',
      });
    }
  };

  const columns: ColumnDef<OptionDiscountRow>[] = useMemo(
    () =>
      OptionDiscountTableColumns({
        onEditClick: (id) => {
          router.push(withReturnTo(navigate('/option-discount/[id]/edit', id)));
        },
        onToggleStatusClick: (optionDiscount) => {
          toggleStatus({
            path: { setId: optionDiscount.id },
            body: { isActive: !optionDiscount.isActive },
          });
        },
      }),
    [router, toggleStatus, withReturnTo],
  );

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer"
                  onClick={() => router.push(navigate('/options'))}
                >
                  オプション管理
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>セット割設定</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        title="セット割設定"
        badge={
          <Badge
            variant="outline"
            className="bg-destructive/15 text-destructive border-destructive/20 text-xs font-medium"
          >
            FIT365 限定
          </Badge>
        }
        actions={
          <RoleGatedButton
            requiredPermission={Permission.OptionDiscountsCreate}
            className="gap-1"
            onClick={() => router.push(withReturnTo(navigate('/option-discount/create')))}
          >
            <Plus className="size-4" />
            新規登録
          </RoleGatedButton>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
        <Card className="gap-0 overflow-hidden rounded-xl border p-0">
          <OptionDiscountFiltersProvider value={filtersHook}>
            <OptionDiscountFilters
              totalCount={totalAllOptionDiscounts}
              filteredCount={totalOptionDiscounts}
            />
          </OptionDiscountFiltersProvider>

          {isError ? (
            isSessionExpired ? (
              <Loading />
            ) : (
              <ErrorView
                title="セット割一覧の取得に失敗しました"
                onRetry={() => {
                  void refetch();
                }}
              />
            )
          ) : (
            <DataTable
              columns={columns}
              data={optionDiscounts}
              isLoading={isLoading}
              isFetching={isFetching}
              variant="simple"
              className="rounded-none border-x-0 border-b-0"
              containerClassName="max-h-[calc(100vh-320px)]"
              emptyContent={
                hasActiveFilters ? (
                  <Empty variant="filtered" entityLabel="セット割" onAction={clearFilters} />
                ) : (
                  <Empty variant="empty" entityLabel="セット割" />
                )
              }
              tableOptions={{
                onSortingChange: handleSortingChange,
                manualSorting: true,
                state: { sorting },
              }}
              onRowClick={(row) => {
                if (isRightAfterMenuAction()) return;
                router.push(withReturnTo(navigate('/option-discount/[id]', row.id)));
              }}
            />
          )}

          {totalOptionDiscounts > 0 && !isError && (
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              total={totalOptionDiscounts}
              limit={limit}
              onPageChange={setCurrentPage}
              isLoading={isLoading}
              showPageNumbers={false}
              showTotalPrefix
            />
          )}
        </Card>
      </div>
    </div>
  );
}

export default function OptionDiscountPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OptionDiscountPageContent />
    </Suspense>
  );
}
