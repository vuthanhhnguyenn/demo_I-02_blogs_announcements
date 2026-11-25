'use client';

import { useState } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Pencil, XCircle } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { isRecordNotFoundError } from '@/lib/api-error.util';
import { adminLockerContractsControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import {
  LOCKER_OPTION_STATUS_BADGE_CLASSES,
  LOCKER_OPTION_STATUS_DOT_CLASSES,
  LOCKER_OPTION_STATUS_LABELS,
  LOCKER_RELEASABLE_OPTION_STATUSES,
  formatLockerSlotLabel,
} from '../../_constants/locker-enum-labels.constants';
import { isDialLockContract } from '../_utils/locker-contract-form.util';
import { ContractInfoTab } from './_components/contract-info-tab';
import { HistoryTab } from './_components/history-tab';
import { LockerContractDetailSkeleton } from './_components/locker-contract-detail-skeleton';
import { LockerContractTerminateDialog } from './_components/locker-contract-terminate-dialog';

export default function LockerContractDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/lockers/contracts'));
  const withReturnTo = useWithReturnTo();

  const contractId = params.id as string;
  const activeTab = searchParams.get('tab') ?? 'contract';
  const [terminateOpen, setTerminateOpen] = useState(false);

  const {
    data: contract,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminLockerContractsControllerDetailOptions({ path: { optionContractId: contractId } }),
    enabled: Boolean(contractId),
  });

  if (isLoading) return <LockerContractDetailSkeleton />;

  // Unknown and out-of-scope contracts both answer 404 E-LOC-016; a malformed id answers 400 —
  // a not-found with a way back, not the network-error retry
  const isNotFound = isError && isRecordNotFoundError(error, 'optionContractId');
  if (!contract || (isError && !isNotFound)) {
    return (
      <DataStateBoundary
        isLoading={false}
        isError={isError && !isNotFound}
        isEmpty={!contract}
        onRetry={() => refetch()}
        emptyState={{
          title: 'ロッカー契約が見つかりません',
          description: '存在しないか、閲覧できない店舗の契約です。',
          actionLabel: '契約一覧に戻る',
          onAction: () => router.push(backToListHref),
        }}
      />
    );
  }

  const handleTabChange = (tab: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', tab);
    router.replace(`?${sp.toString()}`, { scroll: false });
  };

  const optionStatus = contract.optionStatus;
  // API-101 §6.2 #2: 解約 only for active / pending_start (an active row inside the fee period is
  // still refused by the BE with 422 E-LOC-015 — its userMessage is shown by the shared toast)
  const canTerminate =
    optionStatus !== null && LOCKER_RELEASABLE_OPTION_STATUSES.includes(optionStatus);
  // The edit page changes only the dial-lock PIN (FR-009); other locks have nothing to edit
  const canEdit = isDialLockContract(contract);
  const slotLabel = formatLockerSlotLabel(contract.slot.locationCode, contract.slotCode);
  const memberLabel = contract.memberName ?? '—';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        breadcrumb={<BackLink label="ロッカー管理に戻る" href={backToListHref} />}
        title={`ロッカー契約 ${contractId.slice(0, 8)}`}
        subtitle={`${memberLabel}（${contract.memberNumber ?? '—'}）— ロッカー ${slotLabel}`}
        badge={
          optionStatus ? (
            <Badge
              variant="outline"
              className={`gap-1 text-xs font-medium ${LOCKER_OPTION_STATUS_BADGE_CLASSES[optionStatus]}`}
            >
              <span
                className={`size-1.5 rounded-full ${LOCKER_OPTION_STATUS_DOT_CLASSES[optionStatus]}`}
              />
              {LOCKER_OPTION_STATUS_LABELS[optionStatus]}
            </Badge>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <RoleGatedButton
              requiredPermission={Permission.LockersContractsEdit}
              variant="outline"
              size="sm"
              className="gap-1"
              denyTooltip="編集権限がありません"
              disabled={!canEdit}
              tooltip={canEdit ? undefined : 'ダイヤル錠以外のため編集できる項目はありません'}
              onClick={() =>
                router.push(
                  withReturnTo(
                    navigate('/lockers/contracts/[id]/edit', contractId),
                    backToListHref,
                  ),
                )
              }
            >
              <Pencil className="size-4" />
              編集
            </RoleGatedButton>

            {canTerminate && (
              <RoleGatedButton
                requiredPermission={Permission.LockersContractsEdit}
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive gap-1"
                denyTooltip="解約操作の権限がありません"
                onClick={() => setTerminateOpen(true)}
              >
                <XCircle className="size-4" />
                解約する
              </RoleGatedButton>
            )}
          </div>
        }
      />

      <LockerContractTerminateDialog
        contract={contract}
        slotLabel={slotLabel}
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
        onSuccess={() => setTerminateOpen(false)}
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="contract">契約情報</TabsTrigger>
            <TabsTrigger value="history">変更履歴</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="contract" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <ContractInfoTab contract={contract} slotLabel={slotLabel} />
        </TabsContent>

        <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <HistoryTab slotId={contract.slotId} contractId={contract.contractId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
