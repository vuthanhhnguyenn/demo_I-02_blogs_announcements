'use client';

/**
 * Suspension / withdrawal history strip for the member detail (contract operations tab).
 * Fetches history from the API, converts it into per-month records, and renders it with
 * the shared `SuspensionHistoryStrip` (members/_components).
 */
import { useEffect } from 'react';

import {
  type SuspensionHistoryCell,
  SuspensionHistoryStrip,
  type SuspensionStatus,
} from '@/app/(private)/members/_components/suspension-history-strip';
import { useInfiniteQuery } from '@tanstack/react-query';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Skeleton } from '@/components/ui/skeleton';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import { adminMemberContractOpsControllerListSuspensionsInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  MemberSuspensionHistoryItemDto,
  MemberSuspensionHistoryListDto,
} from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  diffYearMonths,
  currentYearMonth as getCurrentYearMonth,
  shiftYearMonth,
  toYearMonth,
} from '../../../_utils/month-range';

/**
 * What the strip needs from one 休会/退会 application. The real API names these differently
 * (`applicationId` / `applicationType` / `startDate` / `endDate` / `scheduledDate`) and uses a
 * five-value status,
 * so `toStripItem` below narrows it to the shape the strip logic was written against.
 */
type SuspensionHistoryItem = {
  /**
   * The short application number printed under the month (`SUS-2026-0001`), not the UUID — the
   * strip cell is a 12px-wide label, and leave-detail feeds the same slot from
   * `suspension_history[].application_number`.
   */
  applicationNumber: string | null;
  type: 'suspension' | 'withdrawal_scheduled';
  status: 'active' | 'pending' | 'cancelled' | 'ended';
  /** `YYYY/MM` — the strip is keyed by month, see `toYearMonth` */
  startMonth: string;
  /** `YYYY/MM`, or `null` for an open-ended application */
  endMonth: string | null;
};

function toStripItem(item: MemberSuspensionHistoryItemDto): SuspensionHistoryItem {
  const status =
    item.status === 'active'
      ? 'active'
      : item.status === 'cancelled'
        ? 'cancelled'
        : item.status === 'completed'
          ? 'ended'
          : 'pending';
  const isWithdrawal = item.applicationType === 'withdrawal';
  // A withdrawal row carries no period: it is a single 退会予定日 in `scheduledDate`, and the
  // prototype paints exactly the month that date falls in (`member-detail.tsx:645`).
  const startMonth = toYearMonth(isWithdrawal ? item.scheduledDate : item.startDate) ?? '';
  return {
    applicationNumber: item.applicationNumber,
    type: isWithdrawal ? 'withdrawal_scheduled' : 'suspension',
    status,
    startMonth,
    endMonth: isWithdrawal ? startMonth : toYearMonth(item.endDate),
  };
}

/**
 * Map an API record onto a strip status.
 * `normal` means the record paints no month at all, and two kinds of record end up there:
 * - every `cancelled` application, of either type;
 * - a `withdrawal` application already carried out (`ended`). The strip has exactly three labels
 *   (休会中 / 休会予定 / 退会予定) and 退会予定 states an *intention*, so wearing it after the member
 *   has actually left would misreport them; the prototype defines no 退会済み label to use instead.
 *
 * An `ended` *suspension*, by contrast, keeps painting 休会中: it is part of the history the card is
 * named after, and its months are genuinely months the member was 休会中 (as in the prototype).
 *
 * A suspension whose 休会開始月 is still ahead of the current month is 休会予定 even when the API
 * reports `status: "active"` — the backend activates the application in the creation transaction
 * but pins the member to `pending_suspended` until the start date, and 休会予定 is the presentation
 * of `pending_suspended` everywhere else on this screen.
 */
function getStripStatus(item: SuspensionHistoryItem, currentYearMonth: string): SuspensionStatus {
  if (item.status === 'cancelled') return 'normal';
  if (item.type === 'withdrawal_scheduled') {
    return item.status === 'ended' ? 'normal' : 'pending-retire';
  }
  const startsAfterThisMonth = diffYearMonths(item.startMonth, currentYearMonth) > 0;
  // `pending` = not approved yet; both it and a not-yet-started suspension read as 休会予定
  return item.status === 'pending' || startsAfterThisMonth ? 'pending-leave' : 'active';
}

/** Convert API items into a per-month record */
function buildHistory(
  items: SuspensionHistoryItem[],
  currentYearMonth: string,
): Record<string, SuspensionHistoryCell> {
  const record: Record<string, SuspensionHistoryCell> = {};
  for (const item of items) {
    // `startDate` is nullable in the contract, and a record without one spans no month
    if (!item.startMonth) continue;
    const status = getStripStatus(item, currentYearMonth);
    // `normal` = a record that must not paint the strip at all (see `getStripStatus`)
    if (status === 'normal') continue;
    const start = item.startMonth;
    const end = item.endMonth ?? (item.status === 'active' ? currentYearMonth : start);
    const span = Math.max(0, diffYearMonths(end, start));
    for (let i = 0; i <= span; i++) {
      const ym = shiftYearMonth(start, i);
      // The API returns applications newest first, so the newest one keeps a month they overlap on
      if (record[ym]) continue;
      record[ym] = {
        status,
        applicationId: i === 0 ? (item.applicationNumber ?? undefined) : undefined,
      };
    }
  }
  return record;
}

/** Server caps `limit` at 100; the strip then pulls the remaining pages itself. */
const SUSPENSION_PAGE_SIZE = 100;

interface MemberSuspensionHistoryStripProps {
  memberId: string;
  /** The application detail (A-03) words its link 「他の申請一覧を見る」. */
  viewApplicationsLabel?: string;
}

export function MemberSuspensionHistoryStrip({
  memberId,
  viewApplicationsLabel = '申請一覧を見る',
}: Readonly<MemberSuspensionHistoryStripProps>) {
  const currentYearMonth = getCurrentYearMonth();

  // The strip paints every month it is given, so it needs the whole history — and the endpoint
  // caps `limit` at 100, so a single call would silently drop the oldest records. Read it page by
  // page instead. No status filter: 休会予定 / 休会中 / 処理完了 all paint a month, and `cancelled`
  // is dropped client-side by `getStripStatus`.
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...adminMemberContractOpsControllerListSuspensionsInfiniteOptions({
      path: { memberId },
      query: { limit: SUSPENSION_PAGE_SIZE },
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: MemberSuspensionHistoryListDto, allPages) => {
      const currentPage = allPages.length;
      return currentPage < (lastPage.pagination?.totalPages ?? 0) ? currentPage + 1 : undefined;
    },
  });
  useEffect(() => {
    // A failed page leaves `hasNextPage` true, so stop on error; the retry button refetches.
    if (hasNextPage && !isFetchingNextPage && !isError) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const history = buildHistory(items.map(toStripItem), currentYearMonth);

  // The card owns the period nav and legend, so only the strip body is swapped for Loading/Error
  const stripOverride =
    isLoading || isError || !data ? (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!data}
        onRetry={() => refetch()}
        errorTitle="休会・退会履歴の取得に失敗しました"
        errorDescription={resolveApiErrorMessage(error)}
        emptyTitle="休会・退会履歴はありません"
        skeleton={<Skeleton className="h-24 w-full rounded-md" />}
      />
    ) : undefined;

  return (
    <SuspensionHistoryStrip
      title="休会・退会履歴"
      history={history}
      currentYearMonth={currentYearMonth}
      stripOverride={stripOverride}
      viewApplicationsHref={navigate('/members/leaves', { member_id: memberId })}
      viewApplicationsLabel={viewApplicationsLabel}
    />
  );
}
