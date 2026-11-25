'use client';

import { useEffect, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { useCurrentStore } from '@/contexts/current-store.context';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Error as ErrorState } from '@/components/common/data-state-boundary/error';
import { DataTable } from '@/components/common/data-table';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card } from '@/components/ui/card';

import { adminApplicationControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { EnrollmentApplicationListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { DEFAULT_DATE_RANGE_DAYS, PAGE_SIZE_OPTIONS } from '../_constants/constants';
import { useMembershipApplicationsFiltersContext } from '../_contexts/membership-applications-filters-context';
import { isBlacklistFlagged } from '../_utils/application-dto.util';
import { getMembershipApplicationsColumns } from './membership-applications-table-columns';

export function MembershipApplicationsTable() {
  const {
    showFilters,
    queryParams,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sorting,
    setSorting,
    hasActiveFilters,
    clearFilters,
    setShowFilters,
  } = useMembershipApplicationsFiltersContext();
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  // See page.tsx's isStoreScopeLoading comment — same guard so this independent query
  // doesn't fire against the pre-resolution "all stores" scope either.
  const { isLoading: isStoreScopeLoading } = useCurrentStore();
  const { data, isLoading, isError, refetch } = useQuery({
    ...adminApplicationControllerListOptions({ query: queryParams }),
    enabled: !isStoreScopeLoading,
    placeholderData: keepPreviousData,
  });

  const columns = useMemo(() => getMembershipApplicationsColumns(), []);

  const applications = data?.items ?? [];
  const pagination = data?.pagination;

  // A page past the end (stale deep link, rows filtered away) moves to the last page with
  // rows instead of showing an empty table under a 「101-125」 footer (BUG-A-07).
  const lastPage = pagination?.totalPages;
  useEffect(() => {
    if (lastPage && currentPage > lastPage) setCurrentPage(lastPage);
  }, [lastPage, currentPage, setCurrentPage]);

  function renderEmptyContent() {
    if (isLoading || isStoreScopeLoading) return undefined;
    // A failed fetch is an error with a retry, never an empty list (BUG-A-12).
    if (isError) {
      return <ErrorState title="入会申請を読み込めませんでした" onRetry={() => void refetch()} />;
    }
    if (applications.length > 0) return undefined;
    if (hasActiveFilters) {
      return <Empty variant="filtered" entityLabel="入会申請" onAction={clearFilters} />;
    }
    // Nothing in the default 7-day range while older applications exist — do not claim
    // there are none (BUG-A-13).
    if ((pagination?.totalAllItems ?? 0) > 0) {
      return (
        <Empty
          variant="filtered"
          title={`直近${DEFAULT_DATE_RANGE_DAYS}日間の入会申請はありません`}
          description="申請日の期間を変更すると、それ以前の入会申請を表示できます。"
          actionLabel="期間を変更"
          onAction={() => setShowFilters(true)}
        />
      );
    }
    return <Empty variant="empty" entityLabel="入会申請" />;
  }

  const getRowClassName = (row: EnrollmentApplicationListItemDto) =>
    isBlacklistFlagged(row.blacklistMatchResult)
      ? 'bg-destructive/5 hover:bg-destructive/10'
      : 'hover:bg-muted/50';

  const containerClassName = showFilters
    ? 'max-h-[calc(100vh-370px)]'
    : 'max-h-[calc(100vh-320px)]';

  return (
    <Card className="gap-0 rounded-t-none py-0">
      <DataTable
        columns={columns}
        data={applications}
        variant="simple"
        isLoading={isLoading || isStoreScopeLoading}
        isError={isError}
        onRetry={() => void refetch()}
        errorTitle="入会申請を読み込めませんでした"
        onRowClick={(row) =>
          router.push(withReturnTo(navigate('/membership-applications/[id]', row.applicationId)))
        }
        getRowClassName={getRowClassName}
        tableOptions={{ manualSorting: true, onSortingChange: setSorting, state: { sorting } }}
        className="rounded-none! border-none!"
        containerClassName={containerClassName}
        emptyContent={renderEmptyContent()}
      />

      {pagination && !isError && (
        <TablePaginationWithSize
          total={pagination.totalItems}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          className="border-t-0!"
        />
      )}
    </Card>
  );
}
