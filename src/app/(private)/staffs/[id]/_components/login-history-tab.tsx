'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { DataTable } from '@/components/common/data-table';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { adminStaffPermissionControllerStaffLoginHistoriesOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { StaffLoginHistoryItemDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { ActiveSessionsCard } from './active-sessions-card';

interface LoginHistoryTabProps {
  staffId: string;
}

type LoginHistoryEntry = StaffLoginHistoryItemDto;

// Typed as Partial on purpose: the generated DTO calls both fields non-nullable enums, but
// FR-M009 lets 認証方式 come back `null` ("null when not captured") and the BE may add a lane
// before the UI knows it — an unmapped value must read 「—」 like the IP/UA cells, not blank.
const AUTH_PROVIDER_LABEL: Partial<Record<LoginHistoryEntry['authProvider'], string>> = {
  google: 'Google SSO',
  cognito: 'IDaaS',
  magic_link: 'マジックリンク',
};

const LOGIN_RESULT_LABEL: Partial<Record<LoginHistoryEntry['result'], string>> = {
  success: '成功',
  failure: '失敗',
  lock: 'ロック',
};

const LOGIN_RESULT_BADGE_CLASS: Record<LoginHistoryEntry['result'], string> = {
  success: 'bg-success/15 text-success border-success/20',
  failure: 'bg-destructive/15 text-destructive border-destructive/20',
  lock: 'bg-warning/15 text-warning border-warning/20',
};

const DEFAULT_PAGE_SIZE = 10;
// 表示件数 options for this tab: 10 is not in the app-wide API_PAGE_SIZE_OPTIONS, so pass the
// full list explicitly — otherwise 10件 only appears while it is the selected value (Bug No.20).
const LOGIN_HISTORY_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const columns: ColumnDef<LoginHistoryEntry>[] = [
  {
    id: 'loggedInAt',
    header: '日時',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {formatDateYYYYMMDD_HHMM(row.original.loggedInAt)}
      </span>
    ),
  },
  {
    id: 'authProvider',
    header: '認証方式',
    cell: ({ row }) => (
      <span className="text-sm">{AUTH_PROVIDER_LABEL[row.original.authProvider] ?? '—'}</span>
    ),
  },
  {
    id: 'result',
    header: '結果',
    cell: ({ row }) => {
      const { result, failureReason } = row.original;
      return (
        <Badge
          variant="outline"
          className={cn('text-xs font-medium', LOGIN_RESULT_BADGE_CLASS[result])}
          title={failureReason ?? undefined}
        >
          {LOGIN_RESULT_LABEL[result] ?? '—'}
        </Badge>
      );
    },
  },
  {
    id: 'ipAddress',
    header: 'IPアドレス',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs tabular-nums">
        {row.original.ipAddress ?? '—'}
      </span>
    ),
  },
  {
    id: 'userAgent',
    header: 'ユーザーエージェント',
    cell: ({ row }) => (
      <span
        className="text-muted-foreground block max-w-xs truncate text-sm"
        title={row.original.userAgent ?? undefined}
      >
        {row.original.userAgent ?? '—'}
      </span>
    ),
  },
];

/**
 * ログイン履歴 tab — アクティブセッション card + 日時/認証方式/結果/IPアドレス/ユーザーエージェント
 * table, newest first, server-paginated via DataTable + TablePaginationWithSize (same pattern
 * as staffs/page.tsx). 結果 badge title surfaces `failureReason` (E-AUTH-033/034, E-DMN-007,
 * E-AUTH-030) on 失敗 rows.
 * src: staff-detail.tsx L412-461, L463-472, L478-484,
 * L485-496 (adjusted — see checklists/parity.md)
 */
export function LoginHistoryTab({ staffId }: LoginHistoryTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminStaffPermissionControllerStaffLoginHistoriesOptions({
      path: { id: staffId },
      query: { page: currentPage, limit: pageSize },
    }),
  });
  const history: LoginHistoryEntry[] = data?.items ?? [];
  const total = data?.pagination.totalItems ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <ActiveSessionsCard staffId={staffId} />

      <Card className="gap-0 overflow-hidden rounded-xl border py-0">
        <DataTable
          columns={columns}
          data={history}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          errorTitle="ログイン履歴の取得に失敗しました"
          variant="simple"
          className="rounded-none border-x-0 border-b-0"
          emptyContent={<Empty variant="empty" entityLabel="ログイン履歴" />}
        />

        {/*
          `alwaysShowFooter`: this tab shows 全 N 件 even for a single page (or none at all), the
          way the sibling 変更履歴 tab does — an operator auditing an account needs the count.
        */}
        <TablePaginationWithSize
          total={total}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={LOGIN_HISTORY_PAGE_SIZE_OPTIONS}
          alwaysShowFooter
        />
      </Card>

      {/* Y-13 FR-M009 記録項目 — retention window, verbatim from the requirement. */}
      <p className="text-muted-foreground text-xs">ログ保持期間: 1年間</p>
    </div>
  );
}
