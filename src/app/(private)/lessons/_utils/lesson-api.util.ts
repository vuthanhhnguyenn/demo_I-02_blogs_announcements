import type { QueryClient } from '@tanstack/react-query';

import {
  adminLessonControllerDetailQueryKey,
  adminLessonControllerHistoryQueryKey,
  adminLessonControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonListItemDto } from '@/lib/api-real/types.gen';
import { lazyQueryIds } from '@/lib/query-id.util';

import type { LessonTab } from '../_constants/constants';

/**
 * Lesson master (API-111) — the one hand-written seam between the `/lessons` screens and the
 * real API: enum maps, labels, error codes and cache invalidation.
 */

export type ApiLessonType = LessonListItemDto['lessonType'];
export type ApiLessonBrand = LessonListItemDto['brand'];
export type ApiFeeType = LessonListItemDto['feeType'];
export type ApiGenderRestriction = LessonListItemDto['genderRestriction'];

/** The screen's tabs / form kinds ↔ the API's `lessonType` */
export const LESSON_TYPE_BY_TAB: Record<LessonTab, ApiLessonType> = {
  studio: 'studio',
  personal: 'personal_training',
  bodycare: 'body_care',
};

export const TAB_BY_LESSON_TYPE: Record<ApiLessonType, LessonTab> = {
  studio: 'studio',
  personal_training: 'personal',
  body_care: 'bodycare',
};

/** The 5 sub-brands (the mock had joyfit / fit365 only) — same vocabulary as the contracts screens */
export const LESSON_BRAND_OPTIONS: { value: ApiLessonBrand; label: string }[] = [
  { value: 'Joyfit', label: 'JOYFIT' },
  { value: 'Joyfit24', label: 'JOYFIT24' },
  { value: 'JoyfitYoga', label: 'JOYFIT YOGA' },
  { value: 'JoyfitPlus', label: 'JOYFIT+' },
  { value: 'Fit365', label: 'FIT365' },
];

export const LESSON_BRAND_LABELS = Object.fromEntries(
  LESSON_BRAND_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ApiLessonBrand, string>;

export const LESSON_BRAND_BADGE_CLASSES: Record<ApiLessonBrand, string> = {
  Joyfit: 'bg-primary/15 text-primary border-primary/20',
  Fit365: 'bg-destructive/15 text-destructive border-destructive/20',
  Joyfit24: 'bg-info/15 text-info border-info/20',
  JoyfitYoga: 'bg-success/15 text-success border-success/20',
  JoyfitPlus: 'bg-warning/15 text-warning border-warning/20',
};

/** 料金種別 — the API's `feeType` (the mock's `included` is `free`) */
export const FEE_TYPE_LABELS: Record<ApiFeeType, string> = {
  free: '会費内',
  monthly_plan: '有料（月払）',
  per_use: '都度有料',
};

/** The form's 料金種別 keys ↔ `feeType` */
export const FEE_TYPE_BY_PRICING: Record<'free' | 'monthly' | 'per_use', ApiFeeType> = {
  free: 'free',
  monthly: 'monthly_plan',
  per_use: 'per_use',
};

export const PRICING_BY_FEE_TYPE: Record<ApiFeeType, 'free' | 'monthly' | 'per_use'> = {
  free: 'free',
  monthly_plan: 'monthly',
  per_use: 'per_use',
};

/** 性別制限 — the API has none / female_only (male_only is a pending Q&A, TBD-D02-GENDER-VALUES) */
export const GENDER_RESTRICTION_LABELS: Record<ApiGenderRestriction, string> = {
  none: '制限なし',
  female_only: '女性限定',
};

export const GENDER_RESTRICTION_CLASSES: Record<ApiGenderRestriction, string> = {
  none: 'text-muted-foreground',
  female_only: 'text-gender-female',
};

/** 所要時間 the API accepts (API-111 `durationMinutes` enum) */
export const LESSON_DURATION_OPTIONS = [15, 30, 45, 50, 60, 90, 120] as const;

/** Lesson-master error codes the UI reacts to specifically (API-111 §9) */
export const LESSON_ERROR_CODE = {
  /** 404 — unknown lesson, or outside the caller's brand scope */
  notFound: 'E-LSM-001',
  /** 409 — `expectedUpdatedAt` is older than the row */
  staleUpdate: 'E-LSM-005',
  /** 422 — a per_use lesson needs a fee (and only it may carry one) */
  feeMismatch: 'E-LSM-006',
  /** 403 — writes and history are HQ-only */
  forbidden: 'E-LSM-101',
} as const;

export interface ListPaging {
  page: number;
  limit: number;
}

/**
 * Every page of a short list the screen shows whole (the 繰り返し設定 of the schedule sheet — a
 * lesson's rules in one store) at `limit` rows a page, up to the last page: reading one page
 * silently dropped the rest. A failed page fails the whole read rather than returning part of the
 * list. Lists that can grow without bound (pickers) search on the server and page on scroll
 * instead.
 */
export async function fetchAllPages<T>(
  limit: number,
  fetchPage: (paging: ListPaging) => Promise<{ items: T[]; pagination: { totalPages: number } }>,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const data = await fetchPage({ page, limit });
    items.push(...data.items);
    if (page >= data.pagination.totalPages) return items;
  }
}

const parameterisedLessonQueryIds = lazyQueryIds(() => [
  adminLessonControllerDetailQueryKey({ path: { lessonId: '' } }),
  adminLessonControllerHistoryQueryKey({ path: { lessonId: '' } }),
]);

/**
 * Everything a lesson write can change on screen: every list (including the lesson pickers of
 * the schedule screens) and the detail / history of any lesson.
 */
export function invalidateLessonQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: adminLessonControllerListQueryKey() });
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const [key] = query.queryKey as [{ _id?: unknown } | undefined];
      return typeof key?._id === 'string' && parameterisedLessonQueryIds().has(key._id);
    },
  });
}
