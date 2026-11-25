'use client';

import { useState } from 'react';

import { PAGE_SIZE } from '@/constants/app.constants';
import { formatDateYYYYMM } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays } from 'date-fns';
import { Settings2 } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePagination } from '@/components/common/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  adminMemberContractOpsControllerListFeeAdjustmentsOptions,
  adminMemberContractOpsControllerMainContractOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { MemberFeeAdjustmentItemDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import { useLastDefined } from '../../../_hooks/use-last-defined';
import { FeeAdjustmentSheet } from './fee-adjustment-sheet';

type FeeAdjustment = MemberFeeAdjustmentItemDto;

// The real status set is `scheduled` / `active` / `expired` / `cancelled`; 終了 covers the last two.
const STATUS_META: Record<FeeAdjustment['status'], { label: string; className: string }> = {
  active: { label: '適用中', className: 'border-success/20 bg-success/15 text-success' },
  scheduled: { label: '適用予定', className: 'border-info/20 bg-info/15 text-info' },
  expired: { label: '終了', className: 'text-muted-foreground border-border bg-muted' },
  cancelled: { label: '取消済み', className: 'text-muted-foreground border-border bg-muted' },
};

/** Days until the end date (calendar-day basis; ending today = 0) */
function getDaysUntilEnd(endDate: string): number {
  return differenceInCalendarDays(new Date(endDate), new Date());
}

/**
 * `appliedBy` / `cancelledBy` are declared as free-form objects (`additionalProperties: true`), so
 * the staff name has to be read defensively: the API sends `{ staffId, staffName }` and documents
 * `staffName` as null when the staff master is unreachable.
 */
function getStaffName(staff: FeeAdjustment['appliedBy']): string | null {
  const name = staff?.staffName;
  return typeof name === 'string' && name.length > 0 ? name : null;
}

interface FeeAdjustmentCardProps {
  memberId: string;
  /** A withdrawn member keeps the history but accepts no new adjustment. */
  isWithdrawn: boolean;
}

export function FeeAdjustmentCard({ memberId, isWithdrawn }: Readonly<FeeAdjustmentCardProps>) {
  const [showSheet, setShowSheet] = useState(false);
  const [page, setPage] = useState(1);

  // The endpoint caps `limit` at 100, so a single call would drop the tail of a long history with
  // no error at all — the card pages through it instead.
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    ...adminMemberContractOpsControllerListFeeAdjustmentsOptions({
      path: { memberId: memberId },
      query: { page, limit: PAGE_SIZE },
    }),
    placeholderData: keepPreviousData,
  });
  const showOverlay = isFetching && !isLoading;
  // 個別会費調整 hangs off the contract, so the sheet needs its id. Same query key as
  // `main-contract-card`, so React Query serves this from cache rather than firing a second call.
  const { data: mainContractResponse } = useQuery(
    adminMemberContractOpsControllerMainContractOptions({ path: { memberId } }),
  );
  const mainContract = mainContractResponse?.mainContract;

  const items = data?.items ?? [];
  const pagination = useLastDefined(data?.pagination);
  const total = pagination?.totalItems ?? 0;
  const limit = pagination?.limit ?? PAGE_SIZE;
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Card className="gap-0 py-0">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">個別会費調整</CardTitle>
            <RoleGatedButton
              requiredPermission={Permission.SalesFeeAdjust}
              denyTooltip="本部・マネージャー権限が必要です"
              variant="outline"
              size="sm"
              disabled={isWithdrawn}
              onClick={() => setShowSheet(true)}
            >
              <Settings2 className="mr-1 size-4" />
              調整を追加
            </RoleGatedButton>
          </div>
        </CardHeader>
        <DataStateBoundary
          isLoading={isLoading}
          isError={isError}
          isEmpty={!data}
          onRetry={() => refetch()}
          errorTitle="個別会費調整の取得に失敗しました"
          skeleton={
            <div className="space-y-3 px-4 pb-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={`fee-adjustment-row-${index}`} className="h-9 w-full" />
              ))}
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">期間</TableHead>
                <TableHead className="text-right text-xs font-semibold">調整後金額</TableHead>
                <TableHead className="text-xs font-semibold">事由</TableHead>
                <TableHead className="text-xs font-semibold">設定者</TableHead>
                <TableHead className="text-xs font-semibold">状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              className={cn('transition-opacity', showOverlay && 'opacity-50')}
              aria-busy={showOverlay}
            >
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-6 text-center text-sm">
                    個別会費調整はありません
                  </TableCell>
                </TableRow>
              ) : (
                items.map((adj) => {
                  const daysLeft =
                    adj.status === 'active' && adj.periodTo ? getDaysUntilEnd(adj.periodTo) : null;
                  const status = STATUS_META[adj.status];
                  return (
                    <TableRow key={adj.feeAdjustmentId}>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {/* The period is month-based (prototype: 「2025/04 〜 2025/06」) */}
                        <div className="flex flex-col gap-0.5">
                          <span>{formatDateYYYYMM(adj.periodFrom)}</span>
                          <span className="text-[10px]">〜 {formatDateYYYYMM(adj.periodTo)}</span>
                        </div>
                        {daysLeft !== null && daysLeft <= 14 && daysLeft >= 0 && (
                          <Badge
                            variant="outline"
                            className="border-warning/20 bg-warning/15 text-warning mt-1 px-1 text-[9px]"
                          >
                            あと{daysLeft}日
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatYen(adj.adjustedAmount)}
                      </TableCell>
                      {/* Free-text reason: clamped to two lines, the full text on hover */}
                      <TableCell className="w-full max-w-0 text-xs whitespace-normal">
                        <span
                          className="line-clamp-2 wrap-anywhere"
                          title={adj.reason ?? undefined}
                        >
                          {adj.reason ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground min-w-20 text-xs wrap-anywhere whitespace-normal">
                        {getStaffName(adj.appliedBy) ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </DataStateBoundary>
        {/* Pagination stays outside the boundary (like 請求一覧): a page that renders 0 rows must
            still let the user go back to a previous page. It shows the last pagination that
            loaded, so a failed page keeps the way back instead of a 0-count footer. */}
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

      <FeeAdjustmentSheet
        open={showSheet}
        onOpenChange={setShowSheet}
        memberId={memberId}
        contractId={mainContract?.contractId}
      />
    </>
  );
}
