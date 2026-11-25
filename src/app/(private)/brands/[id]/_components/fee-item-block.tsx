import { CalendarClock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import type { BrandFeeItem } from '../_types/brand-fee.type';
import { formatYen, toCircledNumeral } from '../_utils/brand-fee.util';

const EMPTY_VALUE = '—';

export function FeeItemBlock({
  feeItem,
  itemNumber,
}: {
  feeItem: BrandFeeItem;
  itemNumber: number;
}) {
  return (
    <div className="border-t pt-4 first:border-t-0 first:pt-0">
      <p className="text-muted-foreground mb-2 text-xs font-medium wrap-break-word">
        費用項目{toCircledNumeral(itemNumber)}: {feeItem.itemName}
      </p>

      <p className="text-muted-foreground mb-2 text-xs">現行設定</p>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        <div>
          {/* Y-07 FR-002 / G-05: amounts are managed tax-included. */}
          <p className="text-muted-foreground mb-1 text-xs">定価（税込）</p>
          <p className="text-sm font-bold">
            {feeItem.currentValueIncludingTaxYen === null
              ? EMPTY_VALUE
              : formatYen(feeItem.currentValueIncludingTaxYen)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1 text-xs">有効開始日</p>
          <p className="text-sm font-medium">{feeItem.effectiveStartDate ?? EMPTY_VALUE}</p>
        </div>
      </div>

      {/* Y-07 FR-002 pairs the maintenance fee with its charge cadence（入会3ヶ月目・1年ごと）. */}
      {feeItem.note && <p className="text-muted-foreground mt-2 text-xs">{feeItem.note}</p>}

      {feeItem.scheduledChanges.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2">
            <CalendarClock className="text-muted-foreground size-3" />
            <p className="text-muted-foreground text-xs font-medium">予約中の改定</p>
            <Badge variant="secondary" className="px-1 text-[10px]">
              {feeItem.scheduledChanges.length}件
            </Badge>
          </div>

          {/* Fill only, no border — the prototype avoids a third nested frame inside the section. */}
          <div className="flex flex-col gap-2">
            {feeItem.scheduledChanges.map((change) => (
              <div key={change.feeId} className="bg-muted/40 rounded-md px-3 py-2">
                <div className="mb-1 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-1 text-[10px]">
                      予約
                    </Badge>
                    <p className="text-xs font-medium">有効開始日 {change.effectiveStartDate}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold">
                    {formatYen(change.valueIncludingTaxYen)}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">
                  登録: {change.registeredAt} / {change.registeredBy}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
