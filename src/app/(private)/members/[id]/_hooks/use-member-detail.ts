'use client';

import { useMemo } from 'react';

import { useQueries } from '@tanstack/react-query';

import {
  adminLessonBookingControllerListPenaltiesOptions,
  adminMemberControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonPenaltyDto, MemberDetailDto } from '@/lib/api-real/types.gen';

/**
 * Values the member-detail screen shows that `GET /admin/members/{memberId}` does not return.
 *
 * They are *derived*, not translated — the real DTO is passed around as-is everywhere else. All
 * but one are pure functions of fields the detail response already carries; the reservation ban
 * comes from the endpoint that owns it (API-113).
 */
export interface MemberDerivedFacts {
  /** FR-023 blocker; the real DTO dropped the mock's `constraints.hasUnpaidFee`. */
  hasUnpaidFee: boolean;
  /** FR-023 blocker: inside the current main contract's cancellation-fee window. */
  inCancellationPeriod: boolean;
  /** 主契約 name for the head-up card. */
  contractName: string | undefined;
  /** 入会キャンペーン name for the 基本情報 tab. */
  enrollmentCampaignName: string | undefined;
  /** Active reservation ban — owned by API-113, not by the member record. */
  activePenalty: LessonPenaltyDto | undefined;
}

/**
 * Member-detail data for one member, composed from the endpoints that own it.
 *
 * The 来館回数 cells (今月 / 累計 / 直近30日) that used to hang off the mock 利用状況 endpoint are
 * gone: the prototype dropped all three with the 2026-09-17 design update, so the hook no longer
 * touches a mock endpoint at all.
 */
export function useMemberDetail(memberId: string) {
  const [detailQuery, penaltyQuery] = useQueries({
    queries: [
      adminMemberControllerDetailOptions({ path: { memberId } }),
      adminLessonBookingControllerListPenaltiesOptions({
        query: { memberId, status: ['active'] },
      }),
    ],
  });

  // Stable across a render pass so every date comparison below agrees with itself.
  const now = useMemo(() => new Date(), []);

  const member: MemberDetailDto | undefined = detailQuery.data;
  const firstPenalty = penaltyQuery.data?.items[0];

  const derived = useMemo<MemberDerivedFacts>(() => {
    const contract = member?.currentMainContract;
    const cancellationFeeUntil = contract?.cancellationFeeUntil;

    return {
      hasUnpaidFee: (member?.unpaidAmount ?? 0) > 0,
      inCancellationPeriod: cancellationFeeUntil
        ? new Date(cancellationFeeUntil).getTime() > now.getTime()
        : false,
      contractName: contract?.plan?.name ?? undefined,
      enrollmentCampaignName: contract?.campaign?.name ?? undefined,
      activePenalty: firstPenalty,
    };
  }, [member, now, firstPenalty]);

  return {
    member,
    derived,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    refetch: detailQuery.refetch,
  };
}
