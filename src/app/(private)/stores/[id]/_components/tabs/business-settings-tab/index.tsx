'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Card } from '@/components/ui/card';

import { AdminStoreMasterApi083 } from '@/lib/api-real';
import {
  adminStoreControllerGetBusinessHoursOptions,
  adminStoreControllerListExceptionsQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { BusinessCalendar } from './business-calendar';
import { BusinessHoursSettings } from './business-hours-settings';
import type { BusinessException, WeeklyHours } from './business-hours-shared';
import { BusinessSettingsTabSkeleton } from './business-settings-tab-skeleton';
import { ExceptionHoursSettings } from './exception-hours-settings';
import { TemporaryClosureDaysSettings } from './temporary-closure-days-settings';

type Props = { storeId: string };

/** The API caps `limit` at 100 — the largest page, so the fewest requests. */
const EXCEPTION_PAGE_LIMIT = 100;

/**
 * Every calendar exception of the store, past ones included. The list endpoint is paginated, but
 * both the calendar and the two settings sections need the whole set — a date left on an unread
 * page would silently drop off both. Reads page 1 for the page count, then the rest in parallel.
 */
async function fetchAllExceptions(storeId: string, signal: AbortSignal) {
  const fetchPage = async (page: number) => {
    const { data } = await AdminStoreMasterApi083.adminStoreControllerListExceptions({
      path: { id: storeId },
      query: { page, limit: EXCEPTION_PAGE_LIMIT },
      signal,
      throwOnError: true,
    });
    return data;
  };

  const first = await fetchPage(1);
  const restPages = Array.from(
    { length: Math.max(first.pagination.totalPages - 1, 0) },
    (_, i) => i + 2,
  );
  const rest = await Promise.all(restPages.map(fetchPage));
  return [first, ...rest].flatMap((page) => page.items);
}

// Stable fallbacks, so the calendar's memoised lookups are not rebuilt on every render
const EMPTY_HOURS: WeeklyHours = [];
const EMPTY_EXCEPTIONS: BusinessException[] = [];

export function BusinessSettingsTab({ storeId }: Props) {
  const [monthDate, setMonthDate] = useState(new Date());

  const {
    data: hoursData,
    isLoading: isHoursLoading,
    isError: isHoursError,
    refetch: refetchHours,
  } = useQuery({
    ...adminStoreControllerGetBusinessHoursOptions({ path: { id: storeId } }),
    enabled: Boolean(storeId),
  });

  // D10 — 特別営業日 and 臨時休業 are one resource on the real API; the calendar and the two
  // sections read this single query, and the sections split it on `exceptionType`. The key stays
  // under the generated one, so the dialogs' path-only invalidation still matches it.
  const {
    data: exceptionsData,
    isLoading: isExceptionsLoading,
    isError: isExceptionsError,
    refetch: refetchExceptions,
  } = useQuery({
    queryKey: adminStoreControllerListExceptionsQueryKey({
      path: { id: storeId },
      query: { limit: EXCEPTION_PAGE_LIMIT },
    }),
    queryFn: ({ signal }) => fetchAllExceptions(storeId, signal),
    enabled: Boolean(storeId),
  });

  const serverHours = hoursData?.items ?? EMPTY_HOURS;
  const exceptions = exceptionsData ?? EMPTY_EXCEPTIONS;

  if (isHoursLoading || isExceptionsLoading) {
    return <BusinessSettingsTabSkeleton />;
  }

  // Errors are per section: the weekly hours and the exception days come from two requests
  const exceptionsError = isExceptionsError ? (
    <DataStateBoundary
      isLoading={false}
      isError
      isEmpty={false}
      onRetry={() => void refetchExceptions()}
      errorTitle="特別営業日・臨時休業日の取得に失敗しました"
    />
  ) : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="w-full lg:w-3/5">
        {isHoursError ? (
          <DataStateBoundary
            isLoading={false}
            isError
            isEmpty={false}
            onRetry={() => void refetchHours()}
            errorTitle="営業時間情報の取得に失敗しました"
          />
        ) : exceptionsError ? (
          exceptionsError
        ) : (
          <BusinessCalendar
            monthDate={monthDate}
            onMonthDateChange={setMonthDate}
            weeklyHours={serverHours}
            exceptions={exceptions}
          />
        )}
      </div>

      <div className="w-full lg:w-2/5">
        <Card className="sticky top-6 gap-4 py-4">
          {isHoursError ? (
            <div className="px-4">
              <DataStateBoundary
                isLoading={false}
                isError
                isEmpty={false}
                onRetry={() => void refetchHours()}
                errorTitle="営業時間情報の取得に失敗しました"
              />
            </div>
          ) : (
            <BusinessHoursSettings storeId={storeId} serverHours={serverHours} />
          )}
          {exceptionsError ? (
            <div className="border-t px-4 pt-4">{exceptionsError}</div>
          ) : (
            <>
              <ExceptionHoursSettings storeId={storeId} exceptions={exceptions} />
              <TemporaryClosureDaysSettings storeId={storeId} exceptions={exceptions} />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
