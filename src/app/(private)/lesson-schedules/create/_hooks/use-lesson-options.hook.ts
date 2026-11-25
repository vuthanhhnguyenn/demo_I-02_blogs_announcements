'use client';

import { useMemo } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { canRoleReadStoreMaster } from '@/contexts/current-store.context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  adminLessonControllerDetailOptions,
  adminLessonControllerListInfiniteOptions,
  adminStoreControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonListResponseDto } from '@/lib/api-real/types.gen';

import { getLessonScheduleErrorCode } from '../../_utils/lesson-schedule-api.util';
import { PICKER_PAGE_SIZE } from '../_constants/constants';
import { toApiLessonType } from '../_schemas/lesson-schedule-form.mapper';
import type { LessonScheduleFormValues } from '../_schemas/lesson-schedule-form.schema';

type FormLessonType = LessonScheduleFormValues['lesson_type'] | undefined;

/** 404 — the lesson is unknown, deleted or outside the caller's brand scope (API-111 §9) */
const LESSON_NOT_FOUND = 'E-LSM-001';

/**
 * The brand of the store a schedule is for — the API refuses a lesson of another brand (400
 * E-VAL-001 "lessonId is a lesson of brand X, not of the store brand Y"). `brand` is `undefined`
 * until a store is picked, and for Trainer / Observer: they cannot read the store master (API-083
 * → 403 E-AUTH-100, CRM UT D-01 No2), and the lesson list is already narrowed to their store's
 * brand on the server (API-111 §6.6). `settled` = the lesson list may be fetched.
 */
function useStoreBrand(storeId: string | undefined) {
  const { user } = useAuthUser();
  const canRead = canRoleReadStoreMaster(user?.role);
  const query = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: storeId ?? '' } }),
    enabled: !!storeId && canRead,
    retry: false,
    select: (store) => store.brandEnum,
  });
  return {
    brand: query.data,
    settled: !storeId || !canRead || query.isSuccess,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * The lesson masters a schedule at this store may run — active, of the chosen kind and of the
 * store's brand — matching `search` (lesson name, on the server), a page at a time: the picker
 * reads the next page as it scrolls. Until a store is picked the list is not narrowed by brand.
 * Fetches only while `enabled` (the picker is open).
 */
export function useLessonSearch(
  lessonType: FormLessonType,
  storeId: string | undefined,
  search: string,
  enabled: boolean,
) {
  const brandQuery = useStoreBrand(storeId);
  const lessonsQuery = useInfiniteQuery({
    ...adminLessonControllerListInfiniteOptions({
      query: {
        lessonType: toApiLessonType(lessonType ?? 'studio'),
        brand: brandQuery.brand,
        isActive: true,
        q: search || undefined,
        sort: 'name',
        order: 'asc',
        limit: PICKER_PAGE_SIZE,
      },
    }),
    // Wait for the store's brand so an off-brand lesson is never offered
    enabled: enabled && brandQuery.settled,
    initialPageParam: 1,
    getNextPageParam: (lastPage: LessonListResponseDto) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
  });
  const lessons = useMemo(
    () => lessonsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [lessonsQuery.data],
  );

  return {
    lessons,
    /** The first page of the current search (or the store's brand) */
    isLoading:
      brandQuery.isLoading || (lessonsQuery.isFetching && !lessonsQuery.isFetchingNextPage),
    // The store read failing leaves the brand unknown — an error, not a list of every brand
    isError: brandQuery.isError || (lessonsQuery.isError && !lessonsQuery.isFetchNextPageError),
    isFetchNextPageError: lessonsQuery.isFetchNextPageError,
    hasNextPage: lessonsQuery.hasNextPage,
    isFetchingNextPage: lessonsQuery.isFetchingNextPage,
    fetchNextPage: () => void lessonsQuery.fetchNextPage(),
    refetch: () => void (brandQuery.isError ? brandQuery.refetch() : lessonsQuery.refetch()),
  };
}

/**
 * The chosen lesson (API-111 detail) — its name and length for the form, whichever page of the
 * picker it came from, and whether it still suits the kind and the store's brand.
 */
export function useSelectedLesson(
  lessonId: string | undefined,
  lessonType: FormLessonType,
  storeId: string | undefined,
) {
  const brandQuery = useStoreBrand(storeId);
  const lessonQuery = useQuery({
    ...adminLessonControllerDetailOptions({ path: { lessonId: lessonId ?? '' } }),
    enabled: !!lessonId,
    retry: false,
  });
  const lesson = lessonQuery.data;
  const isGone = getLessonScheduleErrorCode(lessonQuery.error) === LESSON_NOT_FOUND;
  // Known once the lesson (and the store's brand, when a store is picked) is read; a lesson that
  // no longer exists is not allowed, a failed read decides nothing
  let isAllowed: boolean | undefined;
  if (isGone) isAllowed = false;
  else if (lesson !== undefined && brandQuery.settled) {
    isAllowed =
      lesson.isActive &&
      lesson.lessonType === toApiLessonType(lessonType ?? 'studio') &&
      (brandQuery.brand === undefined || lesson.brand === brandQuery.brand);
  }

  return { lesson, isAllowed };
}
