import { memo } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { formatYen } from '../../_constants/sales-labels.constant';
import type { BillingDetail } from '../_utils/billing-detail-api.util';
import { BillingBasicInfoCard } from './billing-basic-info-card';
import { BillingConfirmationStatusCard } from './billing-confirmation-status-card';
import { BillingFeeAdjustmentsCard } from './billing-fee-adjustments-card';
import { BillingLineItemsCard } from './billing-line-items-card';
import { BillingRefundHistoryCard } from './billing-refund-history-card';

interface BillingBasicTabProps {
  detail: BillingDetail;
}

function BillingBasicTabComponent({ detail }: Readonly<BillingBasicTabProps>) {
  const { header } = detail;
  return (
    <div className="space-y-4">
      <BillingConfirmationStatusCard header={header} />

      {/* Stacked below 1440: up to 1366 the side column squeezed the 8-column 会費調整 table */}
      <div className="flex flex-col gap-6 min-[1440px]:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <BillingLineItemsCard header={header} items={detail.items} />

          <BillingFeeAdjustmentsCard header={header} />

          <BillingRefundHistoryCard detail={detail} />
        </div>

        <div className="space-y-4 min-[1440px]:w-90 min-[1440px]:shrink-0">
          <BillingBasicInfoCard header={header} />

          {/* 請求集計カード — API-114 §6.9 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">請求集計</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4">
              <div className="grid grid-cols-2 gap-4">
                <SummaryItem label="請求総額" value={formatYen(header.totalAmount)} highlight />
                <SummaryItem
                  label="未納額"
                  value={formatYen(header.unpaidAmount)}
                  destructive={header.unpaidAmount > 0}
                />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <SummaryItem label="作成日時" value={formatDateYYYYMMDD_HHMM(header.createdAt)} />
                <SummaryItem label="更新日時" value={formatDateYYYYMMDD_HHMM(header.updatedAt)} />
                <SummaryItem label="最終更新者" value={header.updatedBy?.staffName ?? '—'} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const BillingBasicTab = memo(BillingBasicTabComponent);

function SummaryItem({
  label,
  value,
  highlight = false,
  destructive = false,
}: Readonly<{
  label: string;
  value: string;
  highlight?: boolean;
  destructive?: boolean;
}>) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <p
        className={`tabular-nums ${highlight ? 'text-sm font-bold' : 'text-sm font-semibold'} ${
          destructive ? 'text-destructive' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
