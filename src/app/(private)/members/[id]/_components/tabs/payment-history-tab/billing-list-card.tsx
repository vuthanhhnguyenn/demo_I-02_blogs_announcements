'use client';

import { useState } from 'react';

import { PAGE_SIZE } from '@/constants/app.constants';
import { formatBillingDate, formatBillingMonth, toBillingBadgeStatus } from '@/utils/billing.util';
import { formatYen } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
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

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import { adminMemberFinancialControllerBillingsOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

import { useLastDefined } from '../../../_hooks/use-last-defined';
import { BillingStatusBadge } from './billing-status-badge';

interface BillingListCardProps {
  readonly memberId: string;
}

export function BillingListCard({ memberId }: BillingListCardProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    ...adminMemberFinancialControllerBillingsOptions({
      path: { memberId: memberId },
      query: { page, limit: PAGE_SIZE },
    }),
    // Keep the previous page's rows so paging does not flash back to the skeleton
    placeholderData: keepPreviousData,
  });

  // The card header and the pagination live outside the boundary so they stay usable while
  // Loading/Error. `isEmpty` is derived from the whole query being absent (`!data`), not from
  // row count, so a page with 0 rows shows the table's own empty row. See DataStateBoundary docs.
  const isEmpty = !data;
  // The last pagination that loaded, so a failed page keeps the way back instead of a 0-count footer
  const pagination = useLastDefined(data?.pagination);
  const total = pagination?.totalItems ?? 0;
  const limit = pagination?.limit ?? PAGE_SIZE;
  const totalPages = Math.ceil(total / limit);
  // Dim the previous page's rows while the next one loads (tabs FR-006).
  const showOverlay = isFetching && !isLoading;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base font-semibold">請求一覧</CardTitle>
      </CardHeader>
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        onRetry={refetch}
        errorDescription={isError ? resolveApiErrorMessage(error) : undefined}
        emptyTitle="請求履歴はありません"
        errorTitle="請求一覧の取得に失敗しました"
        skeleton={
          <div className="space-y-3 px-4 pb-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`billing-list-row-${index}`} className="h-9 w-full" />
            ))}
          </div>
        }
      >
        <div className="relative">
          {showOverlay && (
            <div className="bg-background/40 pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <LoaderCircle className="text-muted-foreground size-6 animate-spin" />
            </div>
          )}
          <Table size="md">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">請求月</TableHead>
                <TableHead className="text-xs font-semibold">請求種別</TableHead>
                <TableHead className="text-right text-xs font-semibold">金額</TableHead>
                <TableHead className="text-xs font-semibold">ステータス</TableHead>
                <TableHead className="text-xs font-semibold">請求日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              className={cn('transition-opacity', showOverlay && 'opacity-50')}
              aria-busy={showOverlay}
            >
              {data?.items && data.items.length > 0 ? (
                data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm font-medium">
                      {formatBillingMonth(item.billingMonth)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.billingType === 'monthly' ? 'default' : 'outline'}
                        className="text-[10px]"
                      >
                        {item.billingType === 'monthly' ? '月次' : '都度'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatYen(item.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <BillingStatusBadge status={toBillingBadgeStatus(item)} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatBillingDate(item)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    請求履歴はありません
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DataStateBoundary>
      {pagination && (
        <CardContent className="px-0 py-0">
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            isLoading={isFetching}
            onPageChange={setPage}
          />
        </CardContent>
      )}
    </Card>
  );
}
