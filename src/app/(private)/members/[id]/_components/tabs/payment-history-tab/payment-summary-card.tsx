'use client';

import type { DateRange } from 'react-day-picker';

import { formatDate, formatYen } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminMemberContractOpsControllerContractSummaryOptions,
  adminMemberFinancialControllerPaymentsOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

import { getPaymentMethodShortLabel } from '../../../_constants/payment-method';
import {
  type PaymentPeriod,
  type PaymentType,
  getPeriodLabel,
  periodToRange,
} from './payment-period';

interface PaymentSummaryCardProps {
  readonly memberId: string;
  /** Period filter shared with the ledger; switches the aggregation period */
  readonly period: PaymentPeriod;
  readonly customRange?: DateRange;
  /** 種別 filter shared with the ledger; the totals narrow with it */
  readonly type: PaymentType;
}

export function PaymentSummaryCard({
  memberId,
  period,
  customRange,
  type,
}: PaymentSummaryCardProps) {
  // The totals ride on the ledger endpoint behind `includeSummary`, scoped to the same `from`/`to`
  // window and 種別 as the ledger. `limit: 1` because only the `summary` block is read here — the
  // rows are the ledger's.
  const { data, isLoading, isError, error, isPlaceholderData, refetch } = useQuery({
    ...adminMemberFinancialControllerPaymentsOptions({
      path: { memberId: memberId },
      query: {
        includeSummary: true,
        limit: 1,
        transactionType: type,
        ...periodToRange(period, customRange),
      },
    }),
    // Keep the previous period's figures so changing the period does not flash back to the skeleton
    placeholderData: keepPreviousData,
  });

  // 決済方法 is the contract's billing method, not a property of any one ledger row.
  // Its own query: while it loads the row shows a placeholder, and a failure leaves 「—」.
  const { data: contractSummary, isLoading: isContractSummaryLoading } = useQuery(
    adminMemberContractOpsControllerContractSummaryOptions({ path: { memberId: memberId } }),
  );

  const summary = data?.summary;
  const periodLabel = getPeriodLabel(period, customRange);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">支払いサマリー（{periodLabel}）</CardTitle>
      </CardHeader>
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={false}
        onRetry={refetch}
        errorDescription={isError ? resolveApiErrorMessage(error) : undefined}
        errorTitle="支払いサマリーの取得に失敗しました"
        skeleton={
          <CardContent className="px-4">
            <div className="flex flex-col gap-4">
              <div>
                <Skeleton className="mb-2 h-3 w-20" />
                <Skeleton className="h-8 w-40" />
              </div>
              <div className="flex flex-col gap-3 border-t pt-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`payment-summary-row-${index}`}
                    className="flex items-center justify-between"
                  >
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        }
      >
        {/* The title already names the new period while the figures are still the previous one's */}
        <CardContent
          className={cn('px-4 transition-opacity', isPlaceholderData && 'opacity-50')}
          aria-busy={isPlaceholderData}
        >
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-muted-foreground mb-1 text-xs">売上合計</p>
              <p className="text-2xl font-bold">{formatYen(summary?.salesTotal ?? 0)}</p>
            </div>
            <div className="flex flex-col gap-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">返金合計</span>
                <span
                  className={cn(
                    'text-sm font-medium',
                    summary?.refundTotal ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {/* `refundTotal` arrives positive; the minus sign belongs to the card */}
                  {summary?.refundTotal ? `-${formatYen(summary.refundTotal)}` : '¥0'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">差引合計</span>
                <span className="text-sm font-medium">{formatYen(summary?.netTotal ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">最終入金日</span>
                <span className="text-sm font-medium">{formatDate(summary?.lastPaidAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">決済方法</span>
                <div className="flex items-center gap-1">
                  <CreditCard className="text-muted-foreground size-4" />
                  {isContractSummaryLoading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    <span className="text-sm font-medium">
                      {getPaymentMethodShortLabel(
                        contractSummary?.mainContract?.billing?.paymentMethod,
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </DataStateBoundary>
    </Card>
  );
}
