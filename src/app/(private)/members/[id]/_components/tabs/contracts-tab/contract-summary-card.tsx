'use client';

import { formatDate, formatYen } from '@/utils/format.util';
import { useQuery } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import {
  adminMemberContractOpsControllerContractSummaryOptions,
  adminMemberControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { getPaymentMethodLabel } from '../../../_constants/payment-method';

interface ContractSummaryCardProps {
  memberId: string;
  /** 未納金額 from the member record — the contract summary does not carry it. */
  unpaidAmount: number;
}

export function ContractSummaryCard({ memberId, unpaidAmount }: ContractSummaryCardProps) {
  const { data, isLoading, isError, refetch } = useQuery(
    adminMemberContractOpsControllerContractSummaryOptions({
      path: { memberId: memberId },
    }),
  );

  const { data: memberData } = useQuery(adminMemberControllerDetailOptions({ path: { memberId } }));

  // 未納金額 belongs to the member record, not the contract summary — the page passes it down.
  const hasUnpaidFee = unpaidAmount > 0;
  const main = data?.mainContract;
  // `billing` is null when billing-svc could not be read — distinct from a present block whose
  // fields are null, which means "read fine, nothing scheduled". Both render 「—」 here.
  const billing = main?.billing;
  // 月額合計 = the running main fee (the 休会費 while suspended) plus every option that is not
  // cancelled, all tax-included like the 月額 columns of the cards next to it.
  const isSuspended = main?.contractStatus === 'suspended';
  const suspensionFee = memberData?.currentMainContract?.activeSuspension?.fee;
  const mainMonthlyFee = main
    ? isSuspended && suspensionFee != null
      ? suspensionFee
      : (main.plan?.monthlyFee ?? 0)
    : undefined;
  const totalMonthlyFee =
    mainMonthlyFee === undefined
      ? undefined
      : mainMonthlyFee +
        (data?.optionContracts ?? [])
          .filter((oc) => oc.contractStatus !== 'cancelled')
          .reduce((sum, oc) => sum + (oc.monthlyFee ?? 0), 0);

  return (
    <DataStateBoundary
      isLoading={isLoading}
      isError={isError}
      isEmpty={!data}
      onRetry={() => refetch()}
      errorTitle="契約サマリーの取得に失敗しました"
      emptyTitle="契約サマリーはありません"
      skeleton={<Skeleton className="h-48 w-full rounded-lg" />}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">契約サマリー</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground mb-1 text-xs">主契約名</p>
              <p className="text-sm font-medium wrap-anywhere">{main?.plan?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">月額合計</p>
              <p className="text-lg font-semibold">
                {totalMonthlyFee === undefined ? '—' : formatYen(totalMonthlyFee)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">次回請求日</p>
              <p className="text-sm font-medium">{formatDate(billing?.nextBillingDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">決済方法</p>
              <div className="flex items-center gap-1">
                <CreditCard className="text-muted-foreground size-4" />
                <p className="text-sm font-medium">
                  {getPaymentMethodLabel(billing?.paymentMethod)}
                </p>
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground mb-1 text-xs">未納金額</p>
              <p
                className={`text-sm font-medium ${
                  hasUnpaidFee ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {formatYen(unpaidAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DataStateBoundary>
  );
}
