'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  adminLessonScheduleControllerListTemplatesQueryKey,
  adminStudioControllerListQueryKey,
  adminTrainerControllerLookupOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import {
  AdminLessonScheduleManagementApi112,
  AdminStudioManagementApi110,
} from '@/lib/api-real/sdk.gen';

import { allPagesQueryOptions, withPaging } from '../../_utils/lesson-schedule-api.util';
import { TRAINER_LOOKUP_LIMIT } from '../_constants/constants';

/**
 * The option lists of the registration form. One store's studios and templates are read whole
 * (every page — a store has few); the trainer master grows with the company, so its picker
 * searches on the server. The store picker is the shared `StoreSelectInput` (same approach).
 */

/** The store's active studio-type rooms — also read by 読込 of a template (same cache). */
export function studioListQueryOptions(storeId: string) {
  const query = { storeId, isActive: true, studioType: 'studio' as const };
  return allPagesQueryOptions(
    adminStudioControllerListQueryKey({ query }),
    async (paging, signal) =>
      (
        await AdminStudioManagementApi110.adminStudioControllerList({
          query: withPaging(query, paging),
          signal,
          throwOnError: true,
        })
      ).data,
  );
}

export function useStudioList(storeId: string | undefined, enabled: boolean) {
  return useQuery({
    ...studioListQueryOptions(storeId ?? ''),
    enabled: enabled && !!storeId,
  });
}

/** The store's active schedule templates (logically deleted ones are never listed). */
export function useTemplateList(storeId: string | undefined) {
  const query = { storeId, isActive: true };
  return useQuery({
    ...allPagesQueryOptions(
      adminLessonScheduleControllerListTemplatesQueryKey({ query }),
      async (paging, signal) =>
        (
          await AdminLessonScheduleManagementApi112.adminLessonScheduleControllerListTemplates({
            query: { ...query, ...paging },
            signal,
            throwOnError: true,
          })
        ).data,
    ),
    enabled: !!storeId,
  });
}

/**
 * Active trainers holding `coachType`, matching `search` (name / nickname, on the server) —
 * `GET /admin/trainers/lookup` (API-109 #10), the endpoint the API names for this picker. The
 * trainer list (`GET /trainers`) is store-scoped and paged, and the coach type was filtered here
 * over the pages read, so a trainer registered in D-04 could be missing (CRM UT D-04 No13).
 * Fetches only while `enabled` (the picker is open).
 */
export function useTrainerSearch(
  search: string,
  coachType: 'trainer' | 'instructor',
  enabled: boolean,
) {
  const trainersQuery = useQuery({
    ...adminTrainerControllerLookupOptions({
      query: { q: search || undefined, coachTypes: coachType, limit: TRAINER_LOOKUP_LIMIT },
    }),
    enabled,
  });
  const trainers = useMemo(() => trainersQuery.data?.items ?? [], [trainersQuery.data]);
  return { ...trainersQuery, trainers };
}
