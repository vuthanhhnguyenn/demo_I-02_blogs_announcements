'use client';

import { useCallback } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { canRoleReadStoreMaster } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';

import {
  adminHolidayControllerListQueryKey,
  adminStoreControllerGetBusinessHoursOptions,
  adminStoreControllerListExceptionsQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { AdminNationalHolidaysApi083, AdminStoreMasterApi083 } from '@/lib/api-real/sdk.gen';

import { allPagesQueryOptions } from '../../_utils/lesson-schedule-api.util';

/** Why a date is a holiday-chain date (API-112 §6.6.1, same names as the backend). */
export type HolidayChainHit =
  /** a `closed` business exception (臨時休業日) */
  | 'temporary_closure'
  /** a national holiday on which the store's `holiday` row is closed (祝日休業) */
  | 'holiday_closure'
  /** the store's regular weekly closed day (定休日) */
  | 'regular_closure'
  /** a national holiday while the store calendar could not be read */
  | 'national_holiday';

/** A hit from the store's own calendar — what the form warns about as 店舗休業日. */
export function isStoreClosure(hit: HolidayChainHit | null): boolean {
  return hit === 'temporary_closure' || hit === 'holiday_closure' || hit === 'regular_closure';
}

const DAY_OF_WEEK = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/**
 * The store's holiday chain over `[from, to]`, mirroring the backend's `holidayChain()` so the
 * form's 休業日 warnings and skipped dates match what `POST /lesson-schedule-recurrences` will
 * generate (the API has no dry run):
 *
 *  1. a `closed` exception → closure; a `short_hours` exception → open;
 *  2. a national holiday → the store's `holiday` row decides (closed → closure, open → open);
 *     with no `holiday` row it follows its weekday row (API-112 §6.6.1 v0.9.2, Y-02 FR-005 —
 *     backend MR !645);
 *  3. the weekday's row closed → closure.
 *
 * Without the store calendar (no store yet, or a Trainer / Observer, who may not read the store
 * master — API-083 403, so it is not even asked: CRM UT D-01 No2) the preview degrades to national
 * holidays alone. The backend itself refuses to create a recurrence when it cannot read the
 * calendar (E-SYS-001, MR !645).
 */
export function useHolidayChain(storeId: string | undefined, from: string, to: string) {
  const hasWindow = !!from && !!to && from <= to;
  const { user } = useAuthUser();
  const canReadCalendar = !!storeId && canRoleReadStoreMaster(user?.role);

  // Every page of both date lists — an unlimited / long rule spans more rows than one page
  const window = { fromDate: from, toDate: to };
  const holidaysQuery = useQuery({
    ...allPagesQueryOptions(
      adminHolidayControllerListQueryKey({ query: window }),
      async (paging, signal) =>
        (
          await AdminNationalHolidaysApi083.adminHolidayControllerList({
            query: { ...window, ...paging },
            signal,
            throwOnError: true,
          })
        ).data,
    ),
    enabled: hasWindow,
  });

  const businessHoursQuery = useQuery({
    ...adminStoreControllerGetBusinessHoursOptions({ path: { id: storeId ?? '' } }),
    enabled: canReadCalendar,
    retry: false,
  });

  const exceptionsPath = { id: storeId ?? '' };
  const exceptionsQuery = useQuery({
    ...allPagesQueryOptions(
      adminStoreControllerListExceptionsQueryKey({ path: exceptionsPath, query: window }),
      async (paging, signal) =>
        (
          await AdminStoreMasterApi083.adminStoreControllerListExceptions({
            path: exceptionsPath,
            query: { ...window, ...paging },
            signal,
            throwOnError: true,
          })
        ).data,
    ),
    enabled: canReadCalendar && hasWindow,
    retry: false,
  });

  const holidays = holidaysQuery.data;
  const businessHours = businessHoursQuery.data?.items;
  const exceptions = exceptionsQuery.data;

  const chainHit = useCallback(
    (day: string): HolidayChainHit | null => {
      const national = (holidays ?? []).some((h) => h.date === day);
      if (!businessHours) return national ? 'national_holiday' : null;

      const exception = (exceptions ?? []).find((e) => e.date === day);
      if (exception?.exceptionType === 'closed') return 'temporary_closure';
      if (exception?.exceptionType === 'short_hours') return null;

      const weekday = DAY_OF_WEEK[new Date(`${day}T00:00:00Z`).getUTCDay()];
      const weekdayClosed = businessHours.some((h) => h.dayOfWeek === weekday && h.isClosed);
      if (national) {
        const holidayRow = businessHours.find((h) => h.dayOfWeek === 'holiday');
        if (holidayRow) return holidayRow.isClosed ? 'holiday_closure' : null;
      }
      return weekdayClosed ? 'regular_closure' : null;
    },
    [holidays, businessHours, exceptions],
  );

  return {
    chainHit,
    /** False while the store calendar could not be read (warnings cover national holidays only) */
    hasStoreCalendar: !!businessHours,
    isLoading: holidaysQuery.isLoading || businessHoursQuery.isLoading || exceptionsQuery.isLoading,
    // The holiday / closure lists failing would leave the preview unadjusted — an error, not an
    // all-open calendar. (`business-hours` refused is the documented degrade above, not an error.)
    isError: holidaysQuery.isError || exceptionsQuery.isError,
    refetch: () => {
      if (holidaysQuery.isError) void holidaysQuery.refetch();
      if (exceptionsQuery.isError) void exceptionsQuery.refetch();
    },
  };
}
