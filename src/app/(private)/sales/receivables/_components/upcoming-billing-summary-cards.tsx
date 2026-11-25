import { SummaryCard } from '@/components/common/summary-card';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import type { UpcomingSummaryDto } from '@/lib/api-real/types.gen';

import type { SalesPaymentMethod } from '../../_constants/sales-labels.constant';

/** FR-002-b: SBPS / JACCS cards from `summary.byPaymentMethod` (API-117 §6.2) */
const SBPS_METHODS: readonly SalesPaymentMethod[] = ['sbps_credit', 'sbps_link'];
const JACCS_METHODS: readonly SalesPaymentMethod[] = ['jaccs_bank'];

export function sumByPaymentMethod(
  summary: UpcomingSummaryDto,
  methods: readonly SalesPaymentMethod[],
): { count: number; amount: number } {
  return summary.byPaymentMethod
    .filter((entry) => methods.includes(entry.paymentMethod))
    .reduce(
      (acc, entry) => ({
        count: acc.count + entry.billingCount,
        amount: acc.amount + entry.totalAmount,
      }),
      { count: 0, amount: 0 },
    );
}

export function getSbpsJaccsBreakdown(summary: UpcomingSummaryDto) {
  return {
    sbps: sumByPaymentMethod(summary, SBPS_METHODS),
    jaccs: sumByPaymentMethod(summary, JACCS_METHODS),
  };
}

/** `targetMonth` (YYYY-MM) → 「YYYY年M月分」 */
export function formatTargetMonth(targetMonth: string): string {
  const [year, month] = targetMonth.split('-');
  return year && month ? `${year}年${Number(month)}月分` : targetMonth;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('ja-JP');
}

interface UpcomingBillingSummaryCardsProps {
  summary: UpcomingSummaryDto | undefined;
  isLoading: boolean;
}

export function UpcomingBillingSummaryCards({
  summary,
  isLoading,
}: Readonly<UpcomingBillingSummaryCardsProps>) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
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

  const { sbps, jaccs } = getSbpsJaccsBreakdown(summary);

  return (
    <div className="grid grid-cols-4 gap-4">
      <SummaryCard
        title="請求予定総額"
        value={formatAmount(summary.totalAmount)}
        prefix="¥"
        subValue={formatTargetMonth(summary.targetMonth)}
      />
      <SummaryCard title="請求予定件数" value={`${summary.billingCount}`} suffix="件" />
      <SummaryCard
        title="SBPS請求予定"
        value={formatAmount(sbps.amount)}
        prefix="¥"
        subValue={`${sbps.count}件`}
      />
      <SummaryCard
        title="JACCS請求予定"
        value={formatAmount(jaccs.amount)}
        prefix="¥"
        subValue={`${jaccs.count}件`}
      />
    </div>
  );
}
