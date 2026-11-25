'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

import { adminRefundControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  REFUND_DISPLAY_STATUS_BADGE_CLASS,
  REFUND_DISPLAY_STATUS_LABELS,
  formatYen,
} from '../../_constants/sales-labels.constant';
import type { BillingDetail } from '../_utils/billing-detail-api.util';
import { BillingRefundRequestDialog } from './billing-refund-request-dialog';

/** API-118 §3 `limit` max */
const REFUND_HISTORY_LIMIT = 100;

interface BillingRefundHistoryCardProps {
  detail: BillingDetail;
}

/**
 * 返金履歴 — every refund application touching this billing (API-118 `GET refund-applications
 * ?billingId`, v0.13), so pending ones show too; API-114 `refunds[]` is executed refunds only.
 */
export function BillingRefundHistoryCard({ detail }: Readonly<BillingRefundHistoryCardProps>) {
  const router = useRouter();
  const { billingId } = detail.header;

  const { data, isLoading, isError } = useQuery(
    adminRefundControllerListOptions({ query: { billingId, limit: REFUND_HISTORY_LIMIT } }),
  );
  const refundApplications = data?.items ?? [];

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="space-y-2 p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      );
    }
    if (isError) {
      return (
        <p className="text-destructive py-8 text-center text-sm">返金履歴を取得できませんでした</p>
      );
    }
    if (refundApplications.length === 0) {
      return <p className="text-muted-foreground py-8 text-center text-sm">返金申請はありません</p>;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">返金ID</TableHead>
            <TableHead className="text-xs font-semibold">返金額</TableHead>
            <TableHead className="text-xs font-semibold">種別</TableHead>
            <TableHead className="text-xs font-semibold">ステータス</TableHead>
            <TableHead className="text-xs font-semibold">申請者</TableHead>
            <TableHead className="text-xs font-semibold">申請日時</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {refundApplications.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer"
              onClick={() => router.push(navigate('/sales/refunds'))}
            >
              {/* No public refund id in the API — the UUID, shortened (full value on hover) */}
              <TableCell className="text-muted-foreground font-mono text-xs" title={item.id}>
                {item.id.slice(0, 8)}
              </TableCell>
              <TableCell className="text-xs font-medium tabular-nums">
                {formatYen(item.totalRefundAmount)}
              </TableCell>
              {/* API-118 v0.16 BR-REF-012: per application, not cumulative */}
              <TableCell className="text-xs">
                {item.refundType === 'full' ? '全額返金' : '部分返金'}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`px-1 py-0 text-[10px] ${REFUND_DISPLAY_STATUS_BADGE_CLASS[item.displayStatus]}`}
                >
                  {REFUND_DISPLAY_STATUS_LABELS[item.displayStatus]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{item.appliedByName || '—'}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatDateYYYYMMDD_HHMM(item.appliedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="bg-muted/50 flex items-center justify-between border-b px-4 py-3">
        <CardTitle className="text-sm font-medium">返金履歴</CardTitle>
        <div className="flex items-center gap-2">
          <Link href={navigate('/sales/refunds')}>
            <Button variant="ghost" size="sm" className="text-muted-foreground h-7 gap-1 text-xs">
              返金手続き一覧
              <ExternalLink className="size-3" />
            </Button>
          </Link>
          <BillingRefundRequestDialog detail={detail} />
        </div>
      </CardHeader>
      <CardContent className="p-0">{renderBody()}</CardContent>
    </Card>
  );
}
