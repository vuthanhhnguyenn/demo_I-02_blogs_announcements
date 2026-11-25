'use client';

import { useParams } from 'next/navigation';

import { MemberSuspensionHistoryStrip } from '@/app/(private)/members/[id]/_components/tabs/contracts-tab/member-suspension-history-strip';
import { MemberHeadupCard } from '@/app/(private)/members/_components/member-headup-card';
import { useQuery } from '@tanstack/react-query';
import { parseAsStringEnum, useQueryState } from 'nuqs';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminMemberControllerDetailOptions,
  adminSuspensionWithdrawalControllerSuspensionDetailOptions,
  adminSuspensionWithdrawalControllerWithdrawalDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { memberTypeLabel } from '../../_constants/constants';
import { FeeAdjustmentBadge } from '../_components/fee-adjustment-badge';
import {
  LEAVE_STATUS_CLASSES,
  LEAVE_STATUS_LABELS,
  LeaveStatus,
  LeaveType,
  memberDisplayName,
  toDetailStatus,
} from '../_constants/constants';
import {
  LeaveApprovalFlow,
  LeaveDetailInfo,
  LeaveProxyInfo,
  LeaveRelatedInfo,
} from './_components/leave-detail-info';
import { LeaveDetailSkeleton } from './_components/leave-detail-skeleton';
import { LeaveStatusAction } from './_components/leave-status-action';

const LEAVE_TYPES = Object.values(LeaveType);

export default function LeaveDetailPage() {
  const { id } = useParams<{ id: string }>();

  /**
   * The detail is split by application type (qa-160). The list hands the type over in the
   * URL; a link without it (bookmark, older link) tries 休会 first and falls through to 退会
   * on a 404, since an id only ever resolves on its own type's endpoint.
   */
  const [type] = useQueryState('type', parseAsStringEnum(LEAVE_TYPES));

  const suspensionQuery = useQuery({
    ...adminSuspensionWithdrawalControllerSuspensionDetailOptions({
      path: { suspensionApplicationId: id },
    }),
    enabled: type !== LeaveType.WITHDRAWAL,
  });
  const isWithdrawal =
    type === LeaveType.WITHDRAWAL ||
    (type === null && getApiErrorStatus(suspensionQuery.error) === 404);
  const withdrawalQuery = useQuery({
    ...adminSuspensionWithdrawalControllerWithdrawalDetailOptions({
      path: { withdrawalApplicationId: id },
    }),
    enabled: isWithdrawal,
  });

  const {
    data: leave,
    isPending,
    isError,
    error,
    refetch,
  } = isWithdrawal ? withdrawalQuery : suspensionQuery;

  /**
   * 旧No / カナ / 会員種別 / 主契約 / photo belong to the member record (A-01), not to the
   * application — the same call as A-02 transfer detail (QA #158). A failed lookup only
   * leaves those fields blank; it must not take the application screen down.
   */
  const { data: member } = useQuery({
    ...adminMemberControllerDetailOptions({ path: { memberId: leave?.member.memberId ?? '' } }),
    enabled: !!leave?.member.memberId,
  });

  // FR-083 — an unknown or out-of-scope id is a not-found, not a permission error:
  // the detail handler answers 404 for both so the two are indistinguishable here.
  const errorStatus = getApiErrorStatus(error);
  // A malformed id is answered 400 by the API; for the operator it is the same dead end as an unknown id.
  const isNotFound = errorStatus === 404 || errorStatus === 400;

  if (isPending || isError || !leave) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader
          breadcrumb={
            <BackToListLink label="休会・退会管理に戻る" listPath={navigate('/members/leaves')} />
          }
          title="休会・退会申請"
        />
        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          <DataStateBoundary
            isLoading={isPending}
            isError={isError && !isNotFound}
            isEmpty={isNotFound || (!isPending && !isError && !leave)}
            onRetry={() => void refetch()}
            skeleton={<LeaveDetailSkeleton />}
            errorTitle="申請情報の取得に失敗しました"
            emptyTitle="対象の申請が見つかりません"
            emptyDescription="削除されたか、参照できる権限がない可能性があります。"
          />
        </div>
      </div>
    );
  }

  const status = toDetailStatus(leave);
  const memberName = memberDisplayName(leave.member);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        breadcrumb={
          <BackToListLink label="休会・退会管理に戻る" listPath={navigate('/members/leaves')} />
        }
        title={`${memberName} さんの${leave.applicationType === LeaveType.SUSPENSION ? '休会' : '退会'}申請`}
        badge={
          <>
            {status === null ? null : status === LeaveStatus.COMPLETED ||
              status === LeaveStatus.CANCELLED ? (
              <Badge variant="secondary" className="text-xs font-medium">
                {LEAVE_STATUS_LABELS[status]}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className={`gap-1 text-xs font-medium ${LEAVE_STATUS_CLASSES[status].badge}`}
              >
                <span className={`size-1.5 rounded-full ${LEAVE_STATUS_CLASSES[status].dot}`} />
                {LEAVE_STATUS_LABELS[status]}
              </Badge>
            )}
            {/* The detail DTO has no flag; the member's main contract carries the same rule. */}
            {member?.currentMainContract?.activeFeeAdjustment && <FeeAdjustmentBadge withTip />}
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        <MemberHeadupCard
          memberId={leave.member.memberId}
          // FR-059 — identifiers use the member number, never the internal record id.
          memberNumber={leave.member.memberNumber ?? '—'}
          name={memberName}
          nameKana={
            [member?.personalInfo.lastNameKana, member?.personalInfo.firstNameKana]
              .filter(Boolean)
              .join(' ') || null
          }
          legacyMemberCode={member?.legacyMemberCode}
          memberTypeLabel={memberTypeLabel(member?.memberType)}
          contractName={member?.currentMainContract?.plan?.name}
          storeName={leave.store?.name ?? '—'}
          storeLabel="主契約店舗"
          facePhotoUrl={member?.personalInfo.facePhotoUrl}
        />

        {/* 申請情報はタブなしで直接表示（Q-14） */}
        <div className="flex gap-4">
          {/* Left column — 60% */}
          <div className="flex w-[60%] flex-col gap-4">
            <LeaveDetailInfo leave={leave} />
            <LeaveApprovalFlow leave={leave} />
            <LeaveProxyInfo leave={leave} />
            <LeaveRelatedInfo leave={leave} />
            {/* The member's full 休会・退会 history — the same strip and source as A-01-01. */}
            <MemberSuspensionHistoryStrip
              memberId={leave.member.memberId}
              viewApplicationsLabel="他の申請一覧を見る"
            />
          </div>

          {/* Right column — 40%, sticky */}
          <div className="w-[40%]">
            <LeaveStatusAction leave={leave} status={status} />
          </div>
        </div>
      </div>
    </div>
  );
}
