'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateMonthDayJP } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';

import { adminLessonBookingControllerMemberProfileLimitedOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonBookingListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { BOOKING_ERROR_CODE, getBookingErrorCode } from '../_utils/booking-api.util';
import {
  BodyDataGrid,
  LessonHistoryList,
  ProfileAvatar,
  VisitStats,
  formatAgeSex,
} from './limited-profile-sections';
import {
  ReservationStatusBadge,
  formatPlanLabel,
  hasZeroRemaining,
  isMonthlyPlanBooking,
} from './reservation-list-columns';

interface MemberLimitedProfilePopoverProps {
  booking: LessonBookingListItemDto;
  children: React.ReactNode;
}

export function MemberLimitedProfilePopover({
  booking,
  children,
}: MemberLimitedProfilePopoverProps) {
  const router = useRouter();
  const { hasPermission } = useAuthUser();
  // FR-015 L454 — 会員詳細 opens only for roles that may view members (Trainer has no MembersView).
  const canViewMember = hasPermission(Permission.MembersView);
  const [open, setOpen] = useState(false);

  // Decision D12 — the limited profile is fetched only while the popover is open.
  const profileQuery = useQuery({
    ...adminLessonBookingControllerMemberProfileLimitedOptions({
      path: { bookingId: booking.id },
    }),
    enabled: open,
  });
  const profile = profileQuery.data;
  const isForbidden =
    profileQuery.isError &&
    getBookingErrorCode(profileQuery.error) === BOOKING_ERROR_CODE.forbidden;

  const memberName = booking.memberDisplayName ?? '—';
  const memberNumber = booking.memberNumber;
  const hasPenalty = booking.hasActivePenalty;
  const zeroRemaining = hasZeroRemaining(booking);
  const ageSex = profile ? formatAgeSex(profile) : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger nativeButton={false} render={<span className="inline-flex max-w-full" />}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="space-y-3 p-3">
          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            <ProfileAvatar
              profile={profile}
              fallbackName={memberName}
              className="size-10 rounded-full text-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">{memberName}</p>
                {hasPenalty && (
                  <Badge
                    variant="secondary"
                    className="bg-destructive/15 text-destructive px-1 py-0 text-[10px]"
                  >
                    ペナルティ中
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                {memberNumber && <>会員ID: {memberNumber}</>}
                {memberNumber && ageSex ? ' ・ ' : null}
                {ageSex}
              </p>
            </div>
          </div>

          {/* Plan */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground text-[10px]">プラン</p>
              <p className="text-xs font-medium">{formatPlanLabel(booking)}</p>
            </div>
            {isMonthlyPlanBooking(booking) && (
              <div className="bg-muted/50 rounded p-2">
                <p className="text-muted-foreground text-[10px]">残回数</p>
                <p className={`text-xs font-medium ${zeroRemaining ? 'text-destructive' : ''}`}>
                  {zeroRemaining ? '0回（不足）' : `${booking.remainingCount ?? '—'}回`}
                </p>
              </div>
            )}
          </div>

          {/* Penalty info */}
          {hasPenalty && booking.activePenaltyEndAt && (
            <div className="bg-destructive/10 border-destructive/20 rounded border p-2">
              <p className="text-destructive text-xs">
                ペナルティ期間中（{formatDateMonthDayJP(booking.activePenaltyEndAt)}まで）
              </p>
            </div>
          )}

          {/* Limited profile (FR-007 / API-113 §4.6) */}
          {profileQuery.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {isForbidden && <p className="text-muted-foreground text-xs">閲覧権限がありません</p>}
          {profileQuery.isError && !isForbidden && (
            <p className="text-destructive text-xs">プロフィールの取得に失敗しました</p>
          )}
          {profile && (
            <>
              <VisitStats profile={profile} />
              <LessonHistoryList profile={profile} />
              <BodyDataGrid profile={profile} />
            </>
          )}

          {/* Status */}
          <div className="flex items-center justify-between border-t pt-2 text-xs">
            <span className="text-muted-foreground">予約ステータス</span>
            <ReservationStatusBadge status={booking.status} />
          </div>

          <p className="text-muted-foreground/70 text-[10px]">
            住所・電話番号・メール・契約・支払・入退館情報はここには表示されません。
          </p>

          {canViewMember && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full text-xs"
              onClick={() => router.push(navigate('/members/[id]', booking.memberId))}
            >
              会員詳細を見る →
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
