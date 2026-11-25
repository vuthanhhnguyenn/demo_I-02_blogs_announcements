'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD_HHMMSS } from '@/utils/date.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  adminFcCompanyControllerDetailOptions,
  adminStoreControllerChangeHistoryOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreHistoryEntryDto } from '@/lib/api-real/types.gen';

import { STORE_CHANGE_ACTION_LABELS } from '../../../../_constants/constants';
import {
  HISTORY_EMPTY_VALUE,
  STORE_HISTORY_FIELD_LABELS,
  formatStoreHistoryValue,
} from '../../../../_utils/store-history.util';

/**
 * Y-02 FR-008 history is append-only — this feature never creates, updates or deletes rows.
 *
 * 10 rows keeps the card the size of the other detail tabs; the 表示件数 select offers the
 * app-wide 25 / 50 / 100 on top of it (the sibling ログイン履歴 tab is set up the same way).
 */
const DEFAULT_PAGE_SIZE = 10;

/** Direct management — a `null` `fcCompanyId` (same label as the basic-info tab) */
const DIRECT_MANAGEMENT_LABEL = '直営';

/**
 * 変更項目 / 変更前 / 変更後 share one table column whose header and cells use this same grid (as on
 * the brand history tab), so each change of an entry is one line aligned across the three
 * sub-columns even when a value wraps. `minmax(0, …fr)` lets a long unbroken value shrink its
 * track instead of widening the table.
 */
const CHANGE_GRID_CLASS = 'grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,3fr)] gap-x-2';

/**
 * Long free text (1000-char 備考, unbroken tokens) wraps anywhere inside a capped box with its own
 * scroll, so it never widens the table past the card (BUG-U3-09).
 */
const VALUE_BOX_CLASS = 'max-h-40 overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere]';

/** One field-level change, or the whole entry when it carries no diff (`field: null`) */
type HistoryChange = {
  field: string | null;
  before: unknown;
  after: unknown;
};

/**
 * The changes of one entry; the table shows one row per entry with these as lines inside it.
 * `changes[]` is empty for `create` and for the event/scope actions (hours, plans, options,
 * 1DayPass), so those keep one line labelled from `changeAction` with empty before/after — the
 * API documents them as rendered that way. `mutual_use_update` carries a diff of the mutual-use
 * settings (Y-02 Bug-No17); an allowed-store add/remove alone still comes back empty.
 */
function toHistoryChanges(entry: StoreHistoryEntryDto): HistoryChange[] {
  return entry.changes.length === 0
    ? [{ field: null, before: null, after: null }]
    : entry.changes.map(({ field, before, after }) => ({ field, before, after }));
}

/**
 * The operating company is diffed as its id. The name comes from the same FC-company detail query
 * the basic-info tab uses (cached per id); the raw id stays visible only if that lookup fails.
 */
function FcCompanyValue({ id }: { id: string }) {
  const { data } = useQuery({ ...adminFcCompanyControllerDetailOptions({ path: { id } }) });
  return <>{data?.displayName ?? data?.legalName ?? id}</>;
}

function HistoryValue({ field, value }: { field: string | null; value: unknown }) {
  if (field === null) return <>{HISTORY_EMPTY_VALUE}</>;
  if (field === 'fcCompanyId') {
    return typeof value === 'string' && value ? (
      <FcCompanyValue id={value} />
    ) : (
      <>{DIRECT_MANAGEMENT_LABEL}</>
    );
  }
  return <>{formatStoreHistoryValue(field, value)}</>;
}

/**
 * Tab 5 — change history (Y-02 FR-008, read-only).
 *
 * The tab itself is only mounted for System / Headquarter / Manager (FR-083).
 *
 * 変更者 is `changedByName` (empty when the staff row is gone). 変更項目 is the field label of each
 * `changes[]` item, or the FE-owned `changeAction` label (D8) for an entry without a diff, falling
 * back to the raw key so a new backend value degrades visibly.
 */
export function ChangeHistoryTab({ storeId }: { storeId: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminStoreControllerChangeHistoryOptions({
      path: { id: storeId },
      query: { page, limit: pageSize },
    }),
    enabled: Boolean(storeId),
    // Every store save (basic info, business hours, contract, access settings, map…) can append
    // a history row, so opening the tab always refetches instead of trusting the 2-minute
    // global staleTime. The tab remounts on each switch (Base UI unmounts inactive panels and
    // the ScrollArea is keyed by tab), so this fires every time 変更履歴 is opened.
    refetchOnMount: 'always',
    // Paging keeps the current page on screen instead of collapsing the card into the skeleton
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const total = data?.pagination.totalItems ?? 0;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-0 p-4 pb-3">
        <div className="flex items-center gap-2">
          <History className="text-muted-foreground size-4" aria-hidden />
          <CardTitle className="text-[15px] font-semibold tracking-tight">変更履歴</CardTitle>
        </div>
      </CardHeader>

      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={false}
        onRetry={() => refetch()}
        errorTitle="変更履歴の取得に失敗しました"
      >
        {/* Fixed layout + per-column widths keep every column inside the card; long values wrap.
            One row per entry (the rows match 全 N 件, which counts entries), its changes as lines
            inside the merged 変更項目 / 変更前 / 変更後 column — as on the brand history tab. */}
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-40 text-xs font-semibold first:pl-4">変更日時</TableHead>
              <TableHead className="w-32 text-xs font-semibold">変更者</TableHead>
              <TableHead className="text-xs font-semibold last:pr-4">
                <div className={CHANGE_GRID_CLASS}>
                  <span>変更項目</span>
                  <span>変更前</span>
                  <span>変更後</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground py-8 text-center text-xs">
                  変更履歴はまだありません。
                </TableCell>
              </TableRow>
            ) : (
              items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground align-top text-xs whitespace-nowrap first:pl-4">
                    {formatDateYYYYMMDD_HHMMSS(entry.changedAt)}
                  </TableCell>
                  <TableCell className="align-top text-xs [overflow-wrap:anywhere] whitespace-normal">
                    {entry.changedByName || HISTORY_EMPTY_VALUE}
                  </TableCell>
                  <TableCell className="align-top text-xs whitespace-normal last:pr-4">
                    <ul className="divide-border divide-y">
                      {toHistoryChanges(entry).map(({ field, before, after }, index) => (
                        <li
                          // A change has no id of its own; its position within the entry is stable.
                          key={index}
                          className={`${CHANGE_GRID_CLASS} py-1.5 first:pt-0 last:pb-0`}
                        >
                          <span className="font-medium [overflow-wrap:anywhere]">
                            {field === null
                              ? (STORE_CHANGE_ACTION_LABELS[entry.changeAction] ??
                                entry.changeAction)
                              : (STORE_HISTORY_FIELD_LABELS[field] ?? field)}
                          </span>
                          <div className={`text-muted-foreground ${VALUE_BOX_CLASS}`}>
                            <HistoryValue field={field} value={before} />
                          </div>
                          <div className={`font-medium ${VALUE_BOX_CLASS}`}>
                            <HistoryValue field={field} value={after} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataStateBoundary>

      {/* Outside the boundary, like 入退館履歴: a page that came back empty must still let the
          operator step back to a page that was not. `alwaysShowFooter` keeps 全 N 件 and the
          表示件数 select on screen when the whole history fits on one page. */}
      <TablePaginationWithSize
        total={total}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        alwaysShowFooter
      />
    </Card>
  );
}
