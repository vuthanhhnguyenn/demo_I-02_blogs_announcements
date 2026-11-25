'use client';

import { useParams } from 'next/navigation';

import { MemberHeadupCard } from '@/app/(private)/members/_components/member-headup-card';
import { useQuery } from '@tanstack/react-query';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminMemberControllerDetailOptions,
  adminMemberControllerGetBlacklistOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { memberTypeLabel } from '../../_constants/constants';
import { BlacklistSourceBadge } from '../_components/blacklist-source-badge';
import { BlacklistDetailInfo } from './_components/blacklist-detail-info';
import { BlacklistDetailSkeleton } from './_components/blacklist-detail-skeleton';
import { BlacklistReleaseAction } from './_components/blacklist-release-action';
import { BlacklistUnpaidCard } from './_components/blacklist-unpaid-card';

export default function BlacklistDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    data: blacklist,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminMemberControllerGetBlacklistOptions({ path: { blacklistId: id } }),
  });

  const member = blacklist?.member ?? null;

  /**
   * FR-055 — the face photo is the one head-up field the entry's `member{}` does not carry,
   * so it is read from the member detail. Best-effort: a failure leaves the avatar on its
   * initials and must not take the blacklist screen down.
   */
  const { data: memberDetail } = useQuery({
    ...adminMemberControllerDetailOptions({ path: { memberId: member?.memberId ?? '' } }),
    enabled: !!member?.memberId,
  });

  // FR-053 — an unknown id is a not-found, not a system failure: the detail handler
  // answers 404 for a missing entry, so it must not read as "取得に失敗しました".
  const isNotFound = getApiErrorStatus(error) === 404;

  /**
   * FR-071 — the header stays mounted through every state, so a failed load still offers
   * the way back to the list. Only the data region swaps, and the error state carries a
   * retry rather than dead-ending the operator.
   */
  if (isPending || isError || !blacklist) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader
          breadcrumb={
            <BackToListLink
              label="ブラックリスト管理に戻る"
              listPath={navigate('/members/blacklist')}
            />
          }
          title="ブラックリスト詳細"
        />
        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          <DataStateBoundary
            isLoading={isPending}
            isError={isError && !isNotFound}
            isEmpty={isNotFound || (!isPending && !isError && !blacklist)}
            onRetry={() => void refetch()}
            skeleton={<BlacklistDetailSkeleton />}
            errorTitle="ブラックリスト情報の取得に失敗しました"
            emptyTitle="対象のブラックリスト登録が見つかりません"
            emptyDescription="削除されたか、参照できる権限がない可能性があります。"
          />
        </div>
      </div>
    );
  }

  const memberName = [member?.lastName, member?.firstName].filter(Boolean).join(' ') || '—';
  const memberNameKana =
    [member?.lastNameKana, member?.firstNameKana].filter(Boolean).join(' ') || null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* FR-053 / FR-054 — back link, name as the title, then the registration-path
          badge, all in the shared sticky header (V0 does the same). */}
      <PageHeader
        breadcrumb={
          <BackToListLink
            label="ブラックリスト管理に戻る"
            listPath={navigate('/members/blacklist')}
          />
        }
        title={memberName}
        badge={<BlacklistSourceBadge source={blacklist.source} />}
      />

      <div className="px-6 py-4">
        {/* FR-055 — the shared member head-up card. `member` is null for an entry with no
            member link, so there is no identity to show. */}
        {member && (
          <MemberHeadupCard
            memberId={member.memberId}
            memberNumber={member.memberNumber ?? '—'}
            name={memberName}
            nameKana={memberNameKana}
            legacyMemberCode={member.legacyMemberCode}
            memberTypeLabel={memberTypeLabel(member.memberType)}
            contractName={member.currentMainContract?.plan?.name}
            storeName={member.primaryStore?.name ?? '—'}
            facePhotoUrl={memberDetail?.personalInfo.facePhotoUrl}
          />
        )}

        {/* FR-056 — 60 / 40, right column sticky */}
        <div className="flex gap-4">
          {/**
           * FR-057 — two cards. V0 renders a third, 照合条件, which is **not** built:
           * its four flags have no counterpart anywhere in the contract, and the same
           * FR-024 mechanism was ruled out of scope for the list column by the client
           * on 2026-07-29 (spec Q-02).
           */}
          <div className="flex w-[60%] min-w-0 flex-col gap-4">
            <BlacklistDetailInfo blacklist={blacklist} />
            <BlacklistUnpaidCard unpaidAmount={blacklist.unpaidAmount} />
          </div>

          <div className="w-[40%] min-w-0">
            <div className="sticky top-30">
              <BlacklistReleaseAction blacklist={blacklist} memberName={memberName} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
