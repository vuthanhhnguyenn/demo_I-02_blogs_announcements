'use client';

import { useMemo, useState } from 'react';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { History } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { DataTable } from '@/components/common/data-table';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card } from '@/components/ui/card';

import { adminBrandControllerHistoryOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { BrandDetailDto } from '@/lib/api-real/types.gen';

import { type BrandHistoryRow, buildHistoryRows } from '../_utils/brand-history.util';

const WRAP_CLASS = 'whitespace-normal [overflow-wrap:anywhere] break-words';

/**
 * 変更項目 / 変更前 / 変更後 share one table column whose header and cells use this same grid, so
 * each change of an entry is one line aligned across the three sub-columns even when a value wraps.
 * `minmax(0, …fr)` lets a long unbroken value shrink its track instead of widening the table.
 */
const CHANGE_GRID_CLASS = 'grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,3fr)] gap-x-2';

const historyTableColumns: ColumnDef<BrandHistoryRow>[] = [
  {
    accessorKey: 'changedAt',
    header: '変更日時',
    meta: { className: `w-[120px] ${WRAP_CLASS}` },
    cell: ({ row }) => (
      <span className="text-muted-foreground block text-xs">{row.original.changedAt}</span>
    ),
  },
  {
    accessorKey: 'changedBy',
    header: '変更者',
    meta: { className: `w-[96px] ${WRAP_CLASS}` },
    cell: ({ row }) => <span className="block text-xs">{row.original.changedBy}</span>,
  },
  {
    accessorKey: 'targetDisplayName',
    header: '対象',
    meta: { className: `w-[120px] ${WRAP_CLASS}` },
    cell: ({ row }) => (
      <span className="text-muted-foreground block text-xs">{row.original.targetDisplayName}</span>
    ),
  },
  {
    id: 'changes',
    header: () => (
      <div className={CHANGE_GRID_CLASS}>
        <span>変更項目</span>
        <span>変更前</span>
        <span>変更後</span>
      </div>
    ),
    meta: { className: WRAP_CLASS },
    cell: ({ row }) => (
      <ul className="divide-border divide-y">
        {row.original.changes.map((change, index) => (
          <li
            // A change has no id of its own; its position within the entry is stable.
            key={index}
            className={`${CHANGE_GRID_CLASS} py-1.5 text-xs first:pt-0 last:pb-0`}
          >
            <span className="font-medium">{change.changedField}</span>
            <span className="text-muted-foreground">{change.beforeValue}</span>
            <span className="font-medium">{change.afterValue}</span>
          </li>
        ))}
      </ul>
    ),
  },
];

export const HISTORY_DEFAULT_PAGE_SIZE = 50;

interface HistoryTabProps {
  brandGroup: BrandDetailDto['brandGroup'];
  /** 対象 for brand-level rows (`brand_name_update`), which carry no sub-brand. */
  brandName: string;
}

export function HistoryTab({ brandGroup, brandName }: HistoryTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(HISTORY_DEFAULT_PAGE_SIZE);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    ...adminBrandControllerHistoryOptions({
      path: { brandGroup },
      query: { page, limit: pageSize },
    }),
    placeholderData: keepPreviousData,
  });

  // One row per audit entry (its changed fields grouped inside), so the rows on a page match the
  // badge and the paging range, which both count entries (`pagination.totalItems`).
  const rows = useMemo(
    () => buildHistoryRows(data?.items ?? [], brandName),
    [data?.items, brandName],
  );
  // On a failed page fetch `data` is undefined (placeholderData only covers the pending state), so
  // remember the last known total to keep the paging footer — and page 1 — reachable.
  const [lastTotal, setLastTotal] = useState(0);
  const fetchedTotal = data?.pagination.totalItems;
  if (fetchedTotal !== undefined && fetchedTotal !== lastTotal) setLastTotal(fetchedTotal);
  const total = fetchedTotal ?? lastTotal;

  return (
    <Card className="gap-0 overflow-hidden rounded-lg border p-0">
      <div className="flex items-center gap-2 border-b px-4 pt-4 pb-3">
        <History className="size-4" />
        <h2 className="text-sm font-semibold">変更履歴</h2>
      </div>

      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={rows.length === 0}
        onRetry={() => refetch()}
        emptyTitle="変更履歴がありません"
      >
        {/* Fixed layout + per-column widths keep every column inside the card; long values wrap.
            Cells align to the top so an entry's date / staff / target sit beside its first change. */}
        <DataTable
          columns={historyTableColumns}
          data={rows}
          isFetching={isFetching}
          variant="simple"
          className="rounded-none border-x-0 border-b-0 [&_table]:table-fixed [&_td]:align-top"
        />
      </DataStateBoundary>
      {/* Outside the boundary so a failed page keeps page navigation (retry re-requests that page).
          The prototype's short trail shows no footer, so it appears only once there is a 2nd page. */}
      {!isLoading && (
        <TablePaginationWithSize
          total={total}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          }}
          alwaysShowFooter={false}
        />
      )}
    </Card>
  );
}
