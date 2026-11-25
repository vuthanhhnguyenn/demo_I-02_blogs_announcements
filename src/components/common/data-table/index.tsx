'use client';

import React from 'react';

import {
  FetchNextPageOptions,
  FetchPreviousPageOptions,
  RefetchOptions,
} from '@tanstack/react-query';
import {
  ColumnDef,
  Table as TableInstance,
  TableOptions,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { AlertTriangle, LoaderCircle, RefreshCcw } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { cn } from '@/lib/utils';

import { Button } from '../../ui/button';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  variant?: 'default' | 'simple'; // 'default' = infinite scroll, 'simple' = standard table
  isFetching?: boolean;
  isLoading?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: (options?: FetchNextPageOptions | undefined) => Promise<unknown>;
  fetchPreviousPage?: (options?: FetchPreviousPageOptions | undefined) => Promise<unknown>;
  refetch?: (options?: RefetchOptions | undefined) => void;
  totalRows?: number;
  filterRows?: number;
  totalRowsFetched?: number;
  className?: string;
  /** Rows are clickable; a column with `meta: { stopRowClick: true }` (e.g. row actions) opts its whole cell out. */
  onRowClick?: (row: TData) => void;
  onTableReady?: (table: TableInstance<TData>) => void;
  /**
   * Additional options passed to TanStack `useReactTable`.
   * Note: `data` and `columns` are controlled by `DataTable` props.
   */
  tableOptions?: Omit<Partial<TableOptions<TData>>, 'data' | 'columns'>;
  containerClassName?: string;
  tableSize?: 'default' | 'md';
  getRowClassName?: (row: TData) => string | undefined;
  /**
   * Rendered inside the table body when there are no rows. Keeps the header
   * and any surrounding filters/toolbar mounted (unlike an outer boundary that
   * would unmount them). Prefer this over `DataStateBoundary` for empty state.
   */
  emptyContent?: React.ReactNode;
  /**
   * The query backing `data` failed. With rows still on screen (keepPreviousData / cached data
   * from an earlier success) the table prepends a stale-data error row with a retry button, so a
   * failed refetch is never silent. With no rows, `emptyContent` stays in charge of the error.
   */
  isError?: boolean;
  /** Retry handler for the stale-data error row (usually the query's `refetch`). */
  onRetry?: () => void;
  /** Overrides the stale-data error row's title (default 「データの取得に失敗しました」). */
  errorTitle?: string;
}

/**
 * Columns opt in with `meta: { stopRowClick: true }` when the whole cell (padding included)
 * must not trigger `onRowClick` — e.g. selection / action cells of a clickable row.
 */
function stopRowClickHandler(meta: unknown) {
  if (!(meta as Record<string, unknown> | undefined)?.stopRowClick) return undefined;
  return (e: React.MouseEvent) => e.stopPropagation();
}

/**
 * State ownership: DataTable handles LOADING (`isLoading` -> skeleton rows) and
 * EMPTY (`emptyContent`, rendered in the table body so filters stay mounted).
 *
 * Convention: when using DataTable, do NOT wrap it in a `DataStateBoundary`.
 * DataTable covers loading + empty on its own. For query errors pass `isError` + `onRetry`:
 * with no rows, render the error inside `emptyContent`; with rows still on screen (a failed
 * refetch under keepPreviousData), DataTable prepends a stale-data error row with 再試行 itself —
 * no boundary, no full-region error swap that would hide the filters/toolbar.
 */

export function DataTable<TData, TValue>({
  columns,
  data,
  variant = 'default',
  isFetching,
  isLoading,
  fetchNextPage,
  hasNextPage,
  // fetchPreviousPage,
  // refetch,
  totalRows = 0,
  filterRows = 0,
  totalRowsFetched = 0,
  className,
  onRowClick,
  onTableReady,
  tableOptions,
  containerClassName,
  tableSize = 'default',
  getRowClassName,
  emptyContent,
  isError,
  onRetry,
  errorTitle = 'データの取得に失敗しました',
}: Readonly<DataTableProps<TData, TValue>>) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...tableOptions,
  });
  const tableRef = React.useRef<HTMLTableElement>(null);
  // React bubbles events through portals along the component tree, so a click on a dialog,
  // its backdrop or a dropdown portaled out of a cell would still reach this row. Only
  // navigate when the click actually landed inside the row's DOM.
  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>, row: TData) => {
    if (!event.currentTarget.contains(event.target as Node)) return;
    onRowClick?.(row);
  };
  const onScroll = React.useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
      const onPageBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 5;

      if (onPageBottom && !isFetching && hasNextPage) {
        fetchNextPage?.();
      }
    },
    [fetchNextPage, isFetching, hasNextPage],
  );

  React.useEffect(() => {
    if (onTableReady) {
      onTableReady(table);
    }
  }, [table, onTableReady]);

  // Simple (paged) tables: a new result set (filter / sort / page change) starts at the top instead of
  // inheriting the previous scroll offset. `data` only changes identity once the new result arrives.
  React.useEffect(() => {
    if (variant === 'simple') tableRef.current?.parentElement?.scrollTo({ top: 0 });
  }, [data, variant]);

  const renderEmptyState = () => (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns.length} className={cn(emptyContent ? 'p-0' : 'h-24 text-center')}>
        {emptyContent ?? 'データがありません'}
      </TableCell>
    </TableRow>
  );

  const showStaleErrorRow = Boolean(isError) && !isLoading && table.getRowModel().rows.length > 0;
  const renderStaleErrorRow = () => (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns.length} className="p-0">
        <div
          role="alert"
          className="bg-destructive/5 flex items-center gap-3 px-4 py-2.5 whitespace-normal"
        >
          <AlertTriangle className="text-destructive size-4 shrink-0" />
          <div className="min-w-0 flex-1 text-left">
            <p className="text-destructive text-sm font-medium">{errorTitle}</p>
            <p className="text-muted-foreground text-xs">
              表示中のデータは最新ではない可能性があります。時間をおいて再度お試しください。
            </p>
          </div>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 text-xs"
              disabled={isFetching}
              onClick={(event) => {
                event.stopPropagation();
                onRetry();
              }}
            >
              <RefreshCcw className="size-3.5" />
              再試行
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  // Simple table mode (no pagination)
  if (variant === 'simple') {
    // Overlay while refetching (search/filter/page change) when we STILL have the
    // previous data thanks to `keepPreviousData`. Not used on the first load
    // (isLoading -> skeleton), so the table doesn't flash back to the skeleton on
    // every search.
    const showOverlay = Boolean(isFetching) && !isLoading;
    return (
      <div className={cn('relative overflow-hidden rounded-md border', className)}>
        {showOverlay && (
          <div className="bg-background/40 pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <LoaderCircle className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        )}
        <Table
          ref={tableRef}
          size={tableSize}
          containerClassName={cn('overflow-y-auto', containerClassName)}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as Record<string, unknown> | undefined;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'bg-muted sticky top-0 z-10 text-xs font-semibold',
                        meta?.className as string,
                        meta?.headerClassName as string,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={cn('transition-opacity', showOverlay && 'opacity-50')}>
            {showStaleErrorRow && renderStaleErrorRow()}
            {isLoading
              ? Array.from({ length: 20 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {columns.map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : table.getRowModel().rows?.length
                ? table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      onClick={(event) => handleRowClick(event, row.original)}
                      className={cn(
                        onRowClick ? 'cursor-pointer' : '',
                        getRowClassName?.(row.original) ?? '',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            (cell.column.columnDef.meta as Record<string, unknown> | undefined)
                              ?.className as string,
                            (cell.column.columnDef.meta as Record<string, unknown> | undefined)
                              ?.cellClassName as string,
                          )}
                          onClick={stopRowClickHandler(cell.column.columnDef.meta)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : renderEmptyState()}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Default mode (infinite scroll)
  return (
    <div className={cn('overflow-hidden', className)}>
      <Table
        ref={tableRef}
        onScroll={onScroll}
        size={tableSize}
        containerClassName={cn('rounded-md border overflow-y-auto', containerClassName)}
      >
        <TableHeader className="z-20">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className={cn('bg-neutral-100 hover:bg-neutral-200', '[&>*]:border-b')}
            >
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'text-xs font-semibold',
                      (header.column.columnDef.meta as Record<string, unknown> | undefined)
                        ?.className as string,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 20 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {columns.map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <>
              {showStaleErrorRow && renderStaleErrorRow()}
              {table.getRowModel().rows?.length
                ? table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      onClick={(event) => handleRowClick(event, row.original)}
                      className={cn(
                        onRowClick ? 'cursor-pointer' : '',
                        getRowClassName?.(row.original) ?? '',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            (cell.column.columnDef.meta as Record<string, unknown> | undefined)
                              ?.className as string,
                          )}
                          onClick={stopRowClickHandler(cell.column.columnDef.meta)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : renderEmptyState()}
              <TableRow className="hover:bg-transparent data-[state=selected]:bg-transparent">
                <TableCell colSpan={columns.length} className="py-3 text-center">
                  {isFetching ? (
                    <LoaderCircle className="text-muted-foreground mx-auto h-5 w-5 animate-spin" />
                  ) : hasNextPage ? (
                    <Button onClick={() => fetchNextPage?.()} size="sm" variant="outline">
                      もっと見る
                    </Button>
                  ) : totalRowsFetched > 50 && table.getRowModel().rows.length > 0 ? (
                    <p className="text-muted-foreground text-sm">
                      これ以上のデータはありません ({' '}
                      <span className="font-mono font-medium">{filterRows}</span> 件中{' '}
                      <span className="font-mono font-medium">{totalRows}</span> 件)
                    </p>
                  ) : null}
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
