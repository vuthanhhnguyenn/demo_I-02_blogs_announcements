'use client';

import { useState } from 'react';

import { PAGE_SIZE } from '@/constants/app.constants';
import { formatDateTime } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, TriangleAlert } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { TablePagination } from '@/components/common/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminMemberRelationsControllerChangeHistoryOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { MemberChangeHistoryEntryDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { getMemberStatusClassByLabel } from '../../../../_constants/constants';
import { useLastDefined } from '../../../_hooks/use-last-defined';
import { formatMemberFieldValue, isDisplayedMemberField, memberFieldLabel } from './field-display';

/**
 * One row as the table needs it. `snapshot` has a different shape per `source`: on `member` its
 * `after` carries only the fields that moved, so `fieldChanges` diffs it against `before`.
 * The other four sources carry a status or raw row with no field-level diff; those rows render
 * `changeDescription` on its own instead.
 */
type ChangeHistoryItem = {
  id: string;
  changedAt: string;
  description: string;
  operatorName: string;
  changes: Array<{ field: string; fieldCode: string; before: string | null; after: string | null }>;
};

/**
 * 動作確認用アカウント set / release rows carry a boolean snapshot and a raw code as their
 * description; they read as a single field change, the way the prototype lists them.
 */
const TEST_ACCOUNT_CHANGES: Record<string, ChangeHistoryItem['changes'][number]> = {
  test_account_enabled: {
    field: '動作確認用アカウント',
    fieldCode: 'testAccount',
    before: null,
    after: '設定',
  },
  test_account_disabled: {
    field: '動作確認用アカウント',
    fieldCode: 'testAccount',
    before: '設定',
    after: '解除',
  },
};

/** The member's creation reads as a single 新規作成 row, as in the prototype. */
const CREATION_CHANGE: ChangeHistoryItem['changes'][number] = {
  field: '',
  fieldCode: 'creation',
  before: null,
  after: '新規作成',
};

type HistorySnapshot = {
  before?: unknown;
  after?: unknown;
  fromStatus?: unknown;
  toStatus?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A status change arrives in one of two shapes: staff-driven ones put the two statuses straight
 * into `before` / `after`, system transitions use `fromStatus` / `toStatus`.
 */
function statusChange(snapshot: HistorySnapshot): ChangeHistoryItem['changes'][number] | null {
  const from = typeof snapshot.before === 'string' ? snapshot.before : snapshot.fromStatus;
  const to = typeof snapshot.after === 'string' ? snapshot.after : snapshot.toStatus;
  if (typeof to !== 'string') return null;
  return {
    field: memberFieldLabel('memberStatus'),
    fieldCode: 'memberStatus',
    before: formatMemberFieldValue('memberStatus', from),
    after: formatMemberFieldValue('memberStatus', to),
  };
}

function fieldChanges(entry: MemberChangeHistoryEntryDto): ChangeHistoryItem['changes'] {
  const testAccountChange = TEST_ACCOUNT_CHANGES[entry.changeAction];
  if (testAccountChange) return [testAccountChange];
  if (entry.changeAction === 'create') return [CREATION_CHANGE];

  const snapshot = (entry.snapshot ?? {}) as HistorySnapshot;
  const change = entry.changeAction === 'status_changed' ? statusChange(snapshot) : null;
  if (change) return [change];

  const before = isRecord(snapshot.before) ? snapshot.before : {};
  const after = isRecord(snapshot.after) ? snapshot.after : {};
  return Object.keys(after)
    .filter(isDisplayedMemberField)
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({
      field: memberFieldLabel(key),
      fieldCode: key,
      before: formatMemberFieldValue(key, before[key]),
      after: formatMemberFieldValue(key, after[key]),
    }));
}

function toChangeHistoryItem(entry: MemberChangeHistoryEntryDto): ChangeHistoryItem {
  const changes = fieldChanges(entry);
  return {
    id: entry.id,
    changedAt: entry.changedAt,
    description: entry.changeDescription,
    // `changedBy` is now `{ staffId, displayName }`; `displayName` is null when the staff row is
    // gone, and the object itself is null for a system-driven change.
    operatorName:
      entry.changedByType === 'system'
        ? 'システム'
        : ((entry.changedBy as { displayName?: string | null } | null)?.displayName ?? '—'),
    changes,
  };
}
type FieldChange = ChangeHistoryItem['changes'][number];

function renderValue(value: string | null, isStatusAfter: boolean, isCreation = false) {
  if (value === null || value === '') {
    return <span className="text-muted-foreground">&mdash;</span>;
  }
  if (isCreation) {
    return (
      <Badge variant="outline" className="bg-info/15 text-info border-info/20 text-xs font-medium">
        {value}
      </Badge>
    );
  }
  if (isStatusAfter) {
    return (
      <Badge
        variant="outline"
        className={`gap-1 text-xs font-medium ${getMemberStatusClassByLabel(value)}`}
      >
        <span className="size-1.5 rounded-full bg-current" />
        {value}
      </Badge>
    );
  }
  return value;
}

function ChangeRow({
  item,
  change,
  changeIndex,
}: {
  item: ChangeHistoryItem;
  change: FieldChange;
  changeIndex: number;
}) {
  const isStatus = change.fieldCode === 'memberStatus';
  return (
    <TableRow>
      {changeIndex === 0 ? (
        <>
          <TableCell className="align-top text-sm" rowSpan={item.changes.length}>
            {formatDateTime(item.changedAt)}
          </TableCell>
          <TableCell
            className="min-w-24 align-top text-sm wrap-anywhere whitespace-normal"
            rowSpan={item.changes.length}
          >
            {item.operatorName}
          </TableCell>
        </>
      ) : null}
      <TableCell className="text-sm font-medium">
        {change.field || <span className="text-muted-foreground">&mdash;</span>}
      </TableCell>
      {/* Values are free text (address, memo…): wrap them in full rather than cut them off */}
      <TableCell className="min-w-32 text-sm wrap-anywhere whitespace-normal">
        {renderValue(change.before, false)}
      </TableCell>
      <TableCell className="text-center">
        <ArrowRight className="text-muted-foreground inline size-4" />
      </TableCell>
      <TableCell className="min-w-32 text-sm wrap-anywhere whitespace-normal">
        {renderValue(change.after, isStatus, change.fieldCode === 'creation')}
      </TableCell>
    </TableRow>
  );
}

export function ChangeHistoryTab({ memberId }: { memberId: string }) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    ...adminMemberRelationsControllerChangeHistoryOptions({
      path: { memberId: memberId },
      query: { page, limit: PAGE_SIZE },
    }),
    placeholderData: keepPreviousData,
  });

  const items = (data?.items ?? []).map(toChangeHistoryItem);
  const pagination = useLastDefined(data?.pagination);
  const total = pagination?.totalItems ?? 0;
  const limit = pagination?.limit ?? PAGE_SIZE;
  const totalPages = Math.ceil(total / limit);
  // `keepPreviousData` keeps the old page on screen while the next one loads; dim it meanwhile
  const showOverlay = isFetching && !isLoading;

  return (
    <div className="flex flex-col gap-2">
      {/* The list is a union of several sources; say so when one of them could not be read */}
      {data && data.sourcesUnavailable.length > 0 && (
        <div className="bg-warning/10 border-warning/20 text-warning flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
          <TriangleAlert className="size-4 shrink-0" />
          <p>一部の履歴を取得できませんでした</p>
        </div>
      )}
      <Card className="gap-0 py-0">
        <DataStateBoundary
          isLoading={isLoading}
          isError={isError}
          isEmpty={!data}
          onRetry={() => refetch()}
          skeleton={
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={`history-row-${index}`} className="h-9 w-full" />
              ))}
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">更新日時</TableHead>
                <TableHead className="text-xs font-semibold">操作者</TableHead>
                <TableHead className="text-xs font-semibold">変更フィールド</TableHead>
                <TableHead className="text-xs font-semibold">変更前</TableHead>
                <TableHead className="w-12 text-center text-xs font-semibold" />
                <TableHead className="text-xs font-semibold">変更後</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              className={cn('transition-opacity', showOverlay && 'opacity-50')}
              aria-busy={showOverlay}
            >
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    変更履歴はありません
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) =>
                  item.changes.length === 0 ? (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">{formatDateTime(item.changedAt)}</TableCell>
                      <TableCell className="min-w-24 text-sm wrap-anywhere whitespace-normal">
                        {item.operatorName}
                      </TableCell>
                      <TableCell
                        className="text-muted-foreground text-sm wrap-anywhere whitespace-normal"
                        colSpan={4}
                      >
                        {item.description || <span>&mdash;</span>}
                      </TableCell>
                    </TableRow>
                  ) : (
                    item.changes.map((change, changeIndex) => (
                      <ChangeRow
                        key={`${item.id}-${changeIndex}`}
                        item={item}
                        change={change}
                        changeIndex={changeIndex}
                      />
                    ))
                  ),
                )
              )}
            </TableBody>
          </Table>
        </DataStateBoundary>
        {/* Pagination stays outside the boundary: a failed page must still offer the way back */}
        {pagination && (
          <CardContent className="px-0 py-0">
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              isLoading={isFetching}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
