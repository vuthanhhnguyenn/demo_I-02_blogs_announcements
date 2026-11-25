'use client';

import { Info } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { LockerContractDetailDto } from '@/lib/api-real/types.gen';

import { formatLockerFee } from '../../_utils/locker-fee.util';

type LockerContractContractInfoSectionProps = {
  contract: LockerContractDetailDto;
};

/**
 * Contract info (display only). FR-005: the slot's option is applied automatically, so 契約種類 is
 * read-only. The start / end dates are not on the edit form: API-101 §14 TBD-E01-SLOT-MOVE (period
 * edit) was closed as not adopted. 契約開始日 / 解約日 show on the contract detail.
 */
export function LockerContractContractInfoSection({
  contract,
}: LockerContractContractInfoSectionProps) {
  const fee =
    contract.feeMonthly !== null
      ? `${formatLockerFee({ feeMonthly: contract.feeMonthly })} / 月（税込）`
      : '—';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">契約情報</CardTitle>
      </CardHeader>
      <CardContent className="px-6">
        <div className="bg-muted/30 rounded-lg border px-4 py-4">
          <p className="mb-3 text-xs font-medium">契約種類</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <p className="text-muted-foreground mb-1 text-xs">契約種類</p>
              <p className="text-sm font-medium">{contract.optionName ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">適用料金（月額）</p>
              <p className="text-sm font-medium">{fee}</p>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 border-t pt-3">
            <Info className="text-muted-foreground mt-0.5 size-3 shrink-0" />
            <p className="text-muted-foreground text-xs">
              契約種類と料金はスロットに設定された契約形態コードから自動適用されます。
              スロットに個別設定がある場合はその契約種類、ない場合はロッカー設備の契約形態コードが適用されます。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
