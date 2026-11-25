'use client';

import { useMemo, useState } from 'react';

import { useCurrentStore } from '@/contexts/current-store.context';
import { formatJapaneseDate } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { parseISO } from 'date-fns';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card } from '@/components/ui/card';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminAccessLogControllerListOptions,
  adminStoreControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import {
  HISTORY_SORT_CLEARED,
  useEntryExitHistoryFilters,
} from '../_hooks/use-entry-exit-history-filters.hook';
import { EntryExitHistoryCsvExportButton } from './entry-exit-history-csv-export-button';
import { EntryExitHistoryFilters } from './entry-exit-history-filters';
import {
  type HistoryVisitRow,
  entryExitHistoryTableColumns,
} from './entry-exit-history-table-columns';

export function EntryExitHistoryContent() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filtersHook = useEntryExitHistoryFilters();
  const { filters, setFilters, queryParams, currentPage, setCurrentPage, pageSize, setPageSize } =
    filtersHook;

  // Avoid firing the query with the default "all stores" scope before the caller's
  // real, role-resolved store scope is known — matching entry-exit-section.tsx's
  // (feature 013) enabled/isStoreScopeLoading pattern (research.md R6).
  const { isLoading: isStoreScopeLoading } = useCurrentStore();

  const { data, error, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminAccessLogControllerListOptions({
      // 「全N件中」 is the unfiltered baseline (`pagination.totalAllItems`); asked for only while
      // a filter is on, otherwise it equals `totalItems` and the extra COUNT is wasted.
      query: { ...queryParams, includeTotalAll: filtersHook.hasActiveFilters || undefined },
    }),
    enabled: !isStoreScopeLoading,
    // Keep the current rows (under DataTable's overlay) while search / filter / page / sort change.
    placeholderData: keepPreviousData,
  });

  const { data: filterStore, isLoading: isFilterStoreLoading } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: filters.store_id ?? '' } }),
    enabled: filtersHook.isStoreFilterActive,
  });
  const formatDateShort = (value: string) => formatJapaneseDate(parseISO(value));

  /**
   * The list error's way out, by cause (as on the member list):
   * - 403: no action — retrying or clearing cannot grant access.
   * - 400 / 422: the API rejected the conditions (range > 92 days, future date, keyword too long),
   *   so retrying fails the same way — offer to clear them instead.
   * - anything else (outage, network): a GET, worth retrying.
   */
  const errorStatus = getApiErrorStatus(error);
  const listErrorAction: { onAction?: () => void; actionLabel?: string } =
    errorStatus === 403
      ? {}
      : errorStatus === 400 || errorStatus === 422
        ? { onAction: filtersHook.resetRejectedConditions, actionLabel: '条件をクリア' }
        : { onAction: () => void refetch(), actionLabel: '再試行' };

  const history = data?.items ?? [];
  const pagination = data?.pagination;
  const total = pagination?.totalItems ?? 0;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  const sorting: SortingState =
    filters.sort_by === HISTORY_SORT_CLEARED
      ? []
      : [{ id: filters.sort_by, desc: filters.sort_order === 'desc' }];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (next.length === 0) {
      // The user cleared the sort: keep it cleared (no `sort` sent) rather than falling back to
      // the first-open 日時 default.
      setFilters({ sort_by: HISTORY_SORT_CLEARED, sort_order: null, page: 1 });
      return;
    }

    // Three-state cycle driven by the column header: a newly picked column starts ascending (日時,
    // `sortDescFirst`, starts newest-first), the second click flips it, the third clears it.
    setFilters({
      sort_by: next[0].id as typeof filters.sort_by,
      sort_order: next[0].desc ? 'desc' : 'asc',
      page: 1,
    });
  };

  const columns: ColumnDef<HistoryVisitRow>[] = useMemo(() => entryExitHistoryTableColumns(), []);

  return (
    <>
      <PageHeader
        title="入退館履歴"
        actions={<EntryExitHistoryCsvExportButton exportBody={filtersHook.exportBody} />}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 py-4">
        <Card className="gap-0 overflow-hidden rounded-xl border p-0">
          <EntryExitHistoryFilters
            isFilterOpen={isFilterOpen}
            onFilterOpenChange={setIsFilterOpen}
            filtersHook={filtersHook}
          />

          {/* Hidden on error: 「0件を抽出中」 would be a claim about the data, not the failure. The
              error state in the table body offers 条件をクリア when the conditions were rejected. */}
          <FilterResultBanner
            show={filtersHook.hasActiveFilters && !isError}
            totalCount={pagination?.totalAllItems ?? null}
            filteredCount={total}
            filterSummary={[
              filtersHook.isStoreFilterActive
                ? (filterStore?.name ?? (isFilterStoreLoading ? '読み込み中...' : ''))
                : '',
              filters.auth_method === 'qr'
                ? 'QRコード'
                : filters.auth_method === 'nfc'
                  ? 'NFCカード'
                  : '',
              filters.result === 'success' ? '成功' : filters.result === 'denied' ? '拒否' : '',
              filtersHook.isDateRangeChanged
                ? `${formatDateShort(filtersHook.dateFrom)}〜${formatDateShort(filtersHook.dateTo)}`
                : '',
            ]}
            onClear={filtersHook.clearFilters}
          />

          {/* The table stays mounted on error (header + sort kept); the failure is shown in its
              body with the BE's reason, as on the member list. */}
          <DataTable
            tableSize="md"
            columns={columns}
            data={history}
            isLoading={isLoading || isStoreScopeLoading}
            isFetching={isFetching}
            variant="simple"
            className="rounded-none border-x-0 border-b-0"
            containerClassName={
              isFilterOpen ? 'max-h-[calc(100vh-370px)]' : 'max-h-[calc(100vh-320px)]'
            }
            tableOptions={{
              onSortingChange: handleSortingChange,
              manualSorting: true,
              state: { sorting },
            }}
            emptyContent={
              isError ? (
                <Empty
                  title="入退館履歴の取得に失敗しました"
                  description={resolveApiErrorMessage(error)}
                  {...listErrorAction}
                />
              ) : (
                <Empty
                  variant={filtersHook.hasActiveFilters ? 'filtered' : 'empty'}
                  entityLabel="入退館履歴"
                  onAction={filtersHook.hasActiveFilters ? filtersHook.clearFilters : undefined}
                />
              )
            }
          />

          {/* No count until the list has loaded, and none after an error: a "全 0 件" footer
              would misreport the result (as in manual-notifications-table.tsx). A loaded empty
              result keeps its truthful 「全 0 件」. */}
          {!isLoading && !isStoreScopeLoading && !isError && (
            <TablePaginationWithSize
              total={total}
              currentPage={page}
              pageSize={limit}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>
    </>
  );
}
