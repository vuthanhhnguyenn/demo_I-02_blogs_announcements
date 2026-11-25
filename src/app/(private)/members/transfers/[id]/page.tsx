'use client';

import { useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { MemberHeadupCard } from '@/components/common/member-headup-card';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminMemberControllerDetailOptions,
  adminTransferControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { memberTypeLabel } from '../../_constants/constants';
import { TransferApplicationStatusBadge } from '../_components/transfer-status-badge';
import { getTransferMemberName } from '../_components/transfer-table-columns';
import {
  TRANSFER_APPLICATION_STATUS,
  getCancellationFeeRemainingDays,
} from '../_constants/constants';
import { useTransferActScope } from '../_hooks/use-transfer-act-scope';
import { TransferApprovalFlow } from './_components/transfer-approval-flow';
import { TransferDetailInfo } from './_components/transfer-detail-info';
import { TransferDetailSkeleton } from './_components/transfer-detail-skeleton';
import { TransferExclusionAlert } from './_components/transfer-exclusion-alert';
import { TransferStatusAction } from './_components/transfer-status-action';

// The detail endpoint answers 500 (not 404) for an id that is not a UUID, so a malformed URL is
// recognised here and shown as not-found without calling it.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const getBlockedReason = useTransferActScope();
  // Captured once so the remaining-days figure does not shift between renders.
  const [today] = useState(() => new Date());

  const isValidId = UUID_PATTERN.test(id);
  const {
    data: transfer,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminTransferControllerDetailOptions({ path: { transferApplicationId: id } }),
    enabled: isValidId,
  });
  // An unknown id is a not-found, not a system failure — it must not read as a network error.
  const isNotFound = !isValidId || getApiErrorStatus(error) === 404;

  // 会員種別 / 旧会員番号 / 契約名 / kana belong to the member record (A-01), not to the transfer
  // (QA #158), so the head-up card reads them from the member detail. A failed lookup only leaves
  // those fields blank — it must not take the transfer screen down.
  const { data: member } = useQuery({
    ...adminMemberControllerDetailOptions({
      path: { memberId: transfer?.member.memberId ?? '' },
    }),
    enabled: !!transfer?.member.memberId,
  });

  const memberName = transfer ? getTransferMemberName(transfer) : '';
  const nameKana = [member?.personalInfo.lastNameKana, member?.personalInfo.firstNameKana]
    .filter(Boolean)
    .join(' ');
  const campaignLockRemainingDays = getCancellationFeeRemainingDays(
    transfer?.autoTransfer?.cancellationFeeUntil,
    today,
  );

  const backLink = (
    <BackToListLink label="移籍管理に戻る" listPath={navigate('/members/transfers')} />
  );

  // The skeleton draws its own header placeholder.
  if (isValidId && isPending) return <TransferDetailSkeleton />;

  // A failed or unknown id keeps the real header, so the way back to the list stays on screen.
  if (isNotFound || isError || !transfer) {
    return (
      <>
        <PageHeader breadcrumb={backLink} title="移籍申請詳細" />
        <div className="p-6">
          <DataStateBoundary
            isLoading={false}
            isError={isError && !isNotFound}
            isEmpty={isNotFound || !transfer}
            onRetry={() => void refetch()}
            errorTitle="移籍申請の取得に失敗しました"
            emptyTitle="移籍申請が見つかりません"
            emptyDescription="指定された移籍申請は存在しないか、参照できる権限がない可能性があります。"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb={backLink}
        title={`${memberName} さんの移籍申請`}
        badge={<TransferApplicationStatusBadge status={transfer.status} className="text-xs" />}
      />

      <div className="flex flex-col gap-4 p-6">
        <MemberHeadupCard
          memberId={transfer.member.memberNumber ?? '—'}
          oldMemberNo={member?.legacyMemberCode}
          name={memberName}
          nameKana={nameKana || null}
          memberType={memberTypeLabel(member?.memberType)}
          contractName={member?.currentMainContract?.plan?.name}
          // The prototype labels the origin store as 主契約店舗: the member is transferring
          // away from the store their main contract is signed with. Once the transfer is 完了
          // the contract has moved, so the destination is the main contract store.
          contractStoreName={
            transfer.status === TRANSFER_APPLICATION_STATUS.COMPLETED
              ? transfer.toStore.name
              : transfer.fromStore.name
          }
          asideContent={
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1"
              onClick={() => router.push(navigate('/members/[id]', transfer.member.memberId))}
            >
              会員詳細を開く
              <ArrowUpRight className="size-4" />
            </Button>
          }
        />

        <TransferExclusionAlert
          transfer={transfer}
          campaignLockRemainingDays={campaignLockRemainingDays}
          blockedReason={getBlockedReason(transfer)}
        />

        <div className="flex gap-4">
          {/* Left column — 60% */}
          <div className="flex w-[60%] flex-col gap-4">
            <TransferDetailInfo transfer={transfer} />
            <TransferApprovalFlow transfer={transfer} />
          </div>

          {/* Right column — 40%, sticky */}
          <div className="w-[40%]">
            <TransferStatusAction transfer={transfer} blockedReason={getBlockedReason(transfer)} />
          </div>
        </div>
      </div>
    </>
  );
}
