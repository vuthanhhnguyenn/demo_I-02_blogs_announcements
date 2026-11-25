'use client';

import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { BillingListCard } from './billing-list-card';
import { PaymentLedgerCard } from './payment-ledger-card';
import type { PaymentPeriod, PaymentType } from './payment-period';
import { PaymentSummaryCard } from './payment-summary-card';

interface PaymentHistoryTabProps {
  readonly memberId: string;
}

export function PaymentHistoryTab({ memberId }: PaymentHistoryTabProps) {
  // The ledger's period filter also drives the payment summary's aggregation period
  const [period, setPeriod] = useState<PaymentPeriod>('all');
  // Likewise the 種別 select narrows the summary's totals, not just the ledger rows
  // Window picked under 期間指定; only read while the period is `custom`
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [type, setType] = useState<PaymentType>('all');

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {/* Left Column (60%) */}
      <div className="flex w-full flex-col gap-4 md:w-[60%]">
        <PaymentLedgerCard
          memberId={memberId}
          period={period}
          onPeriodChange={setPeriod}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          type={type}
          onTypeChange={setType}
        />
        <BillingListCard memberId={memberId} />
      </div>

      {/* Right Column (40%) — the sticky wrapper must sit here, outside the card's own
          state boundary, so it has the full column height to stick within */}
      <div className="w-full md:w-[40%]">
        <div className="sticky top-0">
          <PaymentSummaryCard
            memberId={memberId}
            period={period}
            customRange={customRange}
            type={type}
          />
        </div>
      </div>
    </div>
  );
}
