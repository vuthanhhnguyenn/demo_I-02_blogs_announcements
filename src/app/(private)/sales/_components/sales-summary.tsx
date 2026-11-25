'use client';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, parseISO } from 'date-fns';
import { AlertCircle, ArrowRight } from 'lucide-react';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { SummaryCard } from '@/components/common/summary-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import { adminSalesBillingControllerSummaryOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

function formatYen(amount: number): string {
  return amount.toLocaleString('ja-JP');
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="gap-0 py-4">
          <CardContent className="px-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-20" />
            <Skeleton className="mt-1 h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface SalesSummaryProps {
  billingMonth: string;
  storeId?: string;
  /** False while the header store scope is still resolving */
  enabled?: boolean;
}

export function SalesSummary({
  billingMonth,
  storeId,
  enabled = true,
}: Readonly<SalesSummaryProps>) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    ...adminSalesBillingControllerSummaryOptions({
      query: { month: billingMonth, storeIds: storeId ? [storeId] : undefined },
    }),
    enabled,
  });

  // Queries don't retry (`retry: false`) and fail without a toast, so a transient 503 (E-SYS-001,
  // BE: Redis blip in the auth / rate-limit check) would otherwise leave the skeleton up for good
  if (isError) {
    return (
      <Card className="py-4">
        <CardContent className="px-4">
          <Empty
            icon={AlertCircle}
            title="売上サマリーの取得に失敗しました"
            // A 4xx is about the request (e.g. a month the API refuses), not the network
            description={
              (getApiErrorStatus(error) ?? 500) < 500
                ? resolveApiErrorMessage(error)
                : '通信状況をご確認のうえ、再度お試しください。'
            }
            actionLabel="再読み込み"
            onAction={() => void refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return <SummarySkeleton />;
  }

  const { pending, unconfirmed, confirmed } = data.confirmStatusCounts;
  // `pending` (manual billing before its first confirm) and `unconfirmed` both read 未確定 (015 D8)
  const unconfirmedCount = pending + unconfirmed;
  const totalCount = confirmed + unconfirmedCount;

  return (
    <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
      <SummaryCard
        title="売上合計"
        // Otaki ⑥ (API-115 BR-BIL-109): may be negative — sign goes before ¥, as in 入出金明細
        value={formatYen(Math.abs(data.salesTotal))}
        prefix={data.salesTotal < 0 ? '-¥' : '¥'}
        tone={data.salesTotal < 0 ? 'destructive' : 'default'}
        subValue={`${totalCount}件（当月）`}
      />
      <SummaryCard
        title="入金合計"
        value={formatYen(data.paymentTotal)}
        prefix="¥"
        subValue={
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            {/* TODO(round3) R302: 入金N件 subtitle is not in FR-001 nor in API-114 summary — integrate in phase 2
            <span className="text-muted-foreground text-[11px]">
              入金{data.payment_count}件（当月）
            </span>
            */}
            <Button
              variant="link"
              size="sm"
              className="ml-auto h-auto gap-0.5 p-0 text-[11px]"
              nativeButton={false}
              render={
                <Link
                  // The transactions page reads its own `tf_*` keys: the month as a date range, 入金 only
                  href={navigate('/sales/transactions', {
                    tf_date_from: `${billingMonth}-01`,
                    tf_date_to: format(endOfMonth(parseISO(`${billingMonth}-01`)), 'yyyy-MM-dd'),
                    tf_transaction_type: 'payment',
                    tf_store_id: storeId,
                  })}
                />
              }
            >
              入出金明細
              <ArrowRight className="size-3" />
            </Button>
          </div>
        }
      />
      <SummaryCard
        title="未納合計"
        value={formatYen(data.receivableTotal)}
        prefix="¥"
        tone="warning"
        subValue={
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <span className="text-muted-foreground text-[11px]">
              未回収{data.receivableCount}件（当月）
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto gap-0.5 p-0 text-[11px]"
              nativeButton={false}
              render={
                <Link
                  // 未回収 tab filtered to this 未納月; the store follows the header scope there
                  href={navigate('/sales/receivables', {
                    rf_tab: 'receivable',
                    rf_month: billingMonth,
                  })}
                />
              }
            >
              請求・未回収管理
              <ArrowRight className="size-3" />
            </Button>
          </div>
        }
      />
      <SummaryCard
        title="返金合計"
        value={formatYen(data.refundTotal)}
        prefix="¥"
        tone="muted"
        // TODO(round3) R302: 返金N件 subtitle is not in FR-001 nor in API-114 summary — integrate in phase 2
        // subValue={`返金${data.refund_count}件（当月）`}
      />
      <SummaryCard
        title="請求確定状況"
        value={`${confirmed}/${totalCount}`}
        subValue={`未確定${unconfirmedCount}件・貸倒${data.recentWriteOffCount}件 ¥${formatYen(data.recentWriteOffAmount)}`}
      />
    </div>
  );
}
