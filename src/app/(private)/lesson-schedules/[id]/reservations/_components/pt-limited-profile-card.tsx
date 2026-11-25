'use client';

import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { adminLessonBookingControllerMemberProfileLimitedOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonBookingListItemDto } from '@/lib/api-real/types.gen';

import { BOOKING_ERROR_CODE, getBookingErrorCode } from '../_utils/booking-api.util';
import {
  BodyDataGrid,
  LessonHistoryList,
  ProfileAvatar,
  VisitStats,
  formatAgeSex,
} from './limited-profile-sections';

interface PtLimitedProfileCardProps {
  booking: LessonBookingListItemDto | null;
}

/** FR-007 L310 / FR-015 — Trainer-facing limited profile shown instead of the space grid + stats for PT sessions. */
export function PtLimitedProfileCard({ booking }: PtLimitedProfileCardProps) {
  const profileQuery = useQuery({
    ...adminLessonBookingControllerMemberProfileLimitedOptions({
      path: { bookingId: booking?.id ?? '' },
    }),
    enabled: booking !== null,
  });
  const profile = profileQuery.data;
  const isForbidden =
    profileQuery.isError &&
    getBookingErrorCode(profileQuery.error) === BOOKING_ERROR_CODE.forbidden;

  if (!booking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">予約者の限定プロフィール</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-6 text-center text-xs">予約者はいません</p>
        </CardContent>
      </Card>
    );
  }

  const memberName = booking.memberDisplayName ?? '—';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">予約者の限定プロフィール</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            Trainer向け限定表示
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar + name + basic */}
        <div className="flex items-center gap-3">
          <ProfileAvatar
            profile={profile}
            fallbackName={memberName}
            className="size-12 rounded-full text-base"
          />
          <div>
            <p className="text-sm font-bold">{memberName}</p>
            <p className="text-muted-foreground text-xs">
              {profile ? formatAgeSex(profile) || '—' : '—'}
            </p>
          </div>
        </div>

        {profileQuery.isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
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
            <div>
              <p className="text-muted-foreground mb-1 text-[10px]">ボディデータ</p>
              <BodyDataGrid profile={profile} />
            </div>
          </>
        )}

        <p className="text-muted-foreground/70 border-t pt-2 text-[10px]">
          住所・電話番号・メール・契約・支払・入退館情報はここには表示されません。
        </p>
      </CardContent>
    </Card>
  );
}
