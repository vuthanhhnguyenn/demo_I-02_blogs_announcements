'use client';

import { use, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, useQueryState } from 'nuqs';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';

import {
  adminLessonBookingControllerBookingStatsOptions,
  adminLessonBookingControllerGetSessionMemoQueryKey,
  adminLessonBookingControllerListOptions,
  adminLessonScheduleControllerGetScheduleOptions,
  adminLessonScheduleControllerScheduleHistoryOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { AdminLessonBookingManagementApi113 } from '@/lib/api-real/sdk.gen';
import type {
  LessonScheduleHistoryEntryDto,
  SessionMemoResponseDto,
} from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { ReservationPageActions } from './_components/reservation-page-actions';
import { ReservationPageLayout } from './_components/reservation-page-layout';
import {
  LessonHeaderSkeleton,
  ReservationListSkeleton,
  ReservationStatsSkeleton,
  SpaceGridSkeleton,
} from './_components/reservation-page-skeletons';
import { BOOKING_LIST_PAGE_SIZE } from './_constants/booking-status.constants';
import { BOOKING_ERROR_CODE, getBookingErrorCode } from './_utils/booking-api.util';
import {
  formatScheduleDateLong,
  formatScheduleTimeRange,
  formatTrainerNames,
} from './_utils/schedule-datetime.util';
import { isScheduleScopeDenied } from './_utils/session-scope.util';

const CANCELLATION_EVENT_TYPES: ReadonlyArray<LessonScheduleHistoryEntryDto['eventType']> = [
  'cancelled',
  'cancelled_from_here',
];

export default function LessonReservationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: scheduleId } = use(params);
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const router = useRouter();
  const { user } = useAuthUser();

  // API-112 read — header, lesson / studio / trainer context, isCancelled, bookingSummary.
  const scheduleQuery = useQuery({
    ...adminLessonScheduleControllerGetScheduleOptions({ path: { scheduleId } }),
  });
  const schedule = scheduleQuery.data;

  // Decision D3 — the backend is the scope gate: a schedule outside the caller's stores
  // (Manager / Staff / Observer) or not assigned to them (Trainer) answers 404 E-LSC-001
  // (API-112 §6.10 #3), which this page maps to the existing /403 route (D-01 Bug-No9).
  const isScopeDenied =
    scheduleQuery.isError &&
    isScheduleScopeDenied(user?.role, getBookingErrorCode(scheduleQuery.error));

  useEffect(() => {
    if (isScopeDenied) router.replace(navigate('/403'));
  }, [isScopeDenied, router]);

  // Cancelled card 中止日時 / 担当者 come from the schedule history (API-112 §5.x).
  const historyQuery = useQuery({
    ...adminLessonScheduleControllerScheduleHistoryOptions({
      path: { scheduleId },
      query: { sort: 'changedAt', order: 'desc', limit: 50 },
    }),
    enabled: schedule?.isCancelled === true,
  });
  const cancellationEntry = useMemo(
    () =>
      historyQuery.data?.items.find((entry) =>
        CANCELLATION_EVENT_TYPES.includes(entry.eventType),
      ) ?? null,
    [historyQuery.data],
  );

  const bookingsQuery = useQuery({
    ...adminLessonBookingControllerListOptions({
      query: {
        scheduleId,
        page,
        limit: BOOKING_LIST_PAGE_SIZE,
        sort: 'createdAt',
        order: 'asc',
      },
    }),
  });

  const statsQuery = useQuery({
    ...adminLessonBookingControllerBookingStatsOptions({ path: { scheduleId } }),
  });

  // One memo per schedule; 404 E-LSB-030 is the "no memo yet" state, not a failure (D11).
  // Resolved to `null` inside the queryFn (not mapped from `isError`): a query left in the
  // error state drops back to `pending` on every refetch, which unmounted the whole layout —
  // and with it the memo draft — after each failed save (BUG-D01A-14).
  const memoQuery = useQuery({
    queryKey: adminLessonBookingControllerGetSessionMemoQueryKey({ path: { scheduleId } }),
    queryFn: async ({ signal }): Promise<SessionMemoResponseDto | null> => {
      try {
        const { data } =
          await AdminLessonBookingManagementApi113.adminLessonBookingControllerGetSessionMemo({
            path: { scheduleId },
            signal,
            throwOnError: true,
          });
        return data;
      } catch (error) {
        if (getBookingErrorCode(error) === BOOKING_ERROR_CODE.memoNotFound) return null;
        throw error;
      }
    },
  });
  const memo = memoQuery.data ?? null;
  const isMemoReady = memoQuery.isSuccess;
  const isMemoError = memoQuery.isError;

  const stats = statsQuery.data;
  const scheduleIsCancelled = schedule?.isCancelled ?? false;
  const scheduleCancellationKey = schedule ? `${schedule.id}:${schedule.isCancelled}` : null;
  const [cancellationOverride, setCancellationOverride] = useState<{
    scheduleKey: string;
    value: boolean;
  } | null>(null);

  const isCancelled =
    scheduleCancellationKey && cancellationOverride?.scheduleKey === scheduleCancellationKey
      ? cancellationOverride.value
      : scheduleIsCancelled;

  const handleIsCancelledChange = (cancelled: boolean) => {
    if (scheduleCancellationKey) {
      setCancellationOverride({ scheduleKey: scheduleCancellationKey, value: cancelled });
    }
  };

  const isAllReady =
    !!schedule &&
    !!bookingsQuery.data &&
    !!stats &&
    isMemoReady &&
    (!schedule.isCancelled || historyQuery.isSuccess || historyQuery.isError);

  if (isScopeDenied) return null;

  const trainerNames = schedule ? formatTrainerNames(schedule) : '';

  return (
    <>
      <PageHeader
        breadcrumb={
          <BackToListLink label="予約管理に戻る" listPath={navigate('/lesson-schedules')} />
        }
        title={schedule?.lesson?.name ?? '予約詳細'}
        subtitle={
          schedule
            ? [
                `${formatScheduleDateLong(schedule)} ${formatScheduleTimeRange(schedule)}`,
                schedule.studio?.name ?? null,
                trainerNames ? `担当: ${trainerNames}` : null,
                isCancelled ? '(中止済み)' : null,
              ]
                .filter(Boolean)
                .join(' | ')
            : undefined
        }
        badge={
          isCancelled ? (
            <Badge variant="destructive" className="text-xs">
              中止済み
            </Badge>
          ) : stats ? (
            <Badge variant="outline" className="text-xs">
              {stats.confirmed + stats.pending}/{stats.capacity} 予約済（残り{stats.available}席）
            </Badge>
          ) : undefined
        }
        actions={
          isAllReady ? (
            <ReservationPageActions
              scheduleId={scheduleId}
              schedule={schedule}
              isCancelled={isCancelled}
              onIsCancelledChange={handleIsCancelledChange}
            />
          ) : undefined
        }
      />

      {isAllReady ? (
        <ReservationPageLayout
          scheduleId={scheduleId}
          schedule={schedule}
          cancellationEntry={cancellationEntry}
          bookingsData={bookingsQuery.data}
          stats={stats}
          memo={memo}
          isCancelled={isCancelled}
        />
      ) : (
        <div className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Left column skeletons */}
            <div className="flex min-w-0 flex-3 flex-col gap-4">
              <DataStateBoundary
                isLoading={scheduleQuery.isLoading}
                isError={scheduleQuery.isError}
                isEmpty={!schedule}
                onRetry={() => scheduleQuery.refetch()}
                skeleton={<LessonHeaderSkeleton />}
                emptyTitle="レッスンが見つかりません"
                emptyDescription="スケジュールIDを確認してください"
                errorTitle="レッスン情報の取得に失敗しました"
              >
                {null}
              </DataStateBoundary>

              <DataStateBoundary
                isLoading={statsQuery.isLoading}
                isError={statsQuery.isError}
                isEmpty={false}
                onRetry={() => statsQuery.refetch()}
                skeleton={<SpaceGridSkeleton />}
                emptyTitle="スペース情報がありません"
                errorTitle="スペース情報の取得に失敗しました"
              >
                {null}
              </DataStateBoundary>

              <DataStateBoundary
                isLoading={bookingsQuery.isLoading}
                isError={bookingsQuery.isError}
                isEmpty={false}
                onRetry={() => bookingsQuery.refetch()}
                skeleton={<ReservationListSkeleton />}
                emptyTitle="予約者はいません"
                errorTitle="予約一覧の取得に失敗しました"
              >
                {null}
              </DataStateBoundary>
            </div>

            {/* Right column skeletons */}
            <div className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-0 lg:w-[40%] lg:self-start">
              <DataStateBoundary
                isLoading={memoQuery.isLoading}
                isError={isMemoError}
                isEmpty={false}
                onRetry={() => memoQuery.refetch()}
                skeleton={<ReservationStatsSkeleton />}
                emptyTitle="情報がありません"
                errorTitle="情報の取得に失敗しました"
              >
                {null}
              </DataStateBoundary>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
