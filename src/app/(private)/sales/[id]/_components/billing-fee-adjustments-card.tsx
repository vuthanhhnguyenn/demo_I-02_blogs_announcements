'use client';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';

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

import { adminBillingRunControllerListAdjustmentsOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import { formatYen } from '../../_constants/sales-labels.constant';
import {
  type BillingHeader,
  FEE_ADJUSTMENT_PATTERN_LABELS,
  formatFeeAdjustmentValue,
  getFeeAdjustmentStatusBadgeClass,
  getFeeAdjustmentStatusLabel,
} from '../_utils/billing-detail-api.util';
import { BillingFeeAdjustmentDialog } from './billing-fee-adjustment-dialog';

/** API-115 §11.1 `limit` max */
const FEE_ADJUSTMENT_LIMIT = 100;

function formatSignedYen(amount: number): string {
  if (amount > 0) return `+${formatYen(amount)}`;
  if (amount < 0) return `-${formatYen(-amount)}`;
  return formatYen(0);
}

interface BillingFeeAdjustmentsCardProps {
  header: BillingHeader;
}

/**
 * 会費調整カード — FR-012 8 columns from API-115 §11 at the billing's `contractId` (015 D11,
 * API-114 §6.9). A billing without a contract (manual billing with no main contract) has none.
 */
export function BillingFeeAdjustmentsCard({ header }: Readonly<BillingFeeAdjustmentsCardProps>) {
  const { contractId, memberId } = header;

  const { data, isLoading, isError } = useQuery({
    ...adminBillingRunControllerListAdjustmentsOptions({
      query: { memberId, contractId: contractId ?? undefined, limit: FEE_ADJUSTMENT_LIMIT },
    }),
    enabled: Boolean(contractId),
  });
  const feeAdjustments = data?.items ?? [];

  const renderBody = () => {
    if (!contractId) {
      return (
        <p className="text-muted-foreground py-8 text-center text-sm">
          契約に紐づかない請求のため、会費調整はありません
        </p>
      );
    }
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
        <p className="text-destructive py-8 text-center text-sm">会費調整を取得できませんでした</p>
      );
    }
    if (feeAdjustments.length === 0) {
      return (
        <p className="text-muted-foreground py-8 text-center text-sm">会費調整履歴はありません</p>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">調整対象</TableHead>
            <TableHead className="text-right text-xs font-semibold">調整前</TableHead>
            <TableHead className="text-xs font-semibold">調整</TableHead>
            <TableHead className="text-right text-xs font-semibold">調整後</TableHead>
            <TableHead className="text-xs font-semibold">事由</TableHead>
            <TableHead className="text-xs font-semibold">状態</TableHead>
            <TableHead className="text-xs font-semibold">適用者</TableHead>
            <TableHead className="text-xs font-semibold">登録日時</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feeAdjustments.map((item) => (
            <TableRow key={item.adjustmentId}>
              <TableCell className="text-xs font-medium">
                {item.contractName}
                <p className="text-muted-foreground text-[10px]">{item.appliedMonth} 適用</p>
              </TableCell>
              <TableCell className="text-muted-foreground text-right text-xs tabular-nums">
                {formatYen(item.baseAmount)}
              </TableCell>
              <TableCell className="text-xs">
                <span className="font-medium tabular-nums">
                  {formatSignedYen(item.adjustmentAmount)}
                </span>
                <p className="text-muted-foreground text-[10px]">
                  {FEE_ADJUSTMENT_PATTERN_LABELS[item.adjustmentPattern].replace('指定', '')}{' '}
                  {formatFeeAdjustmentValue(item.adjustmentPattern, item.value)}
                </p>
              </TableCell>
              <TableCell className="text-right text-xs font-medium tabular-nums">
                {formatYen(item.adjustedAmount)}
              </TableCell>
              {/* Up to 500 chars: clamped to 3 lines, full reason on hover */}
              <TableCell className="text-muted-foreground text-xs whitespace-normal">
                <p className="line-clamp-3 w-32 wrap-anywhere" title={item.reason}>
                  {item.reason}
                </p>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`px-1 py-0 text-[10px] font-normal ${getFeeAdjustmentStatusBadgeClass(item)}`}
                >
                  {getFeeAdjustmentStatusLabel(item)}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{item.appliedBy.staffName ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground text-xs whitespace-normal">
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
        <CardTitle className="text-sm font-medium">会費調整</CardTitle>
        <BillingFeeAdjustmentDialog
          header={header}
          contractName={feeAdjustments[0]?.contractName ?? null}
        />
      </CardHeader>
      <CardContent className="p-0">{renderBody()}</CardContent>
    </Card>
  );
}
