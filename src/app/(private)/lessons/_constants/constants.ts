import { PAGE_SIZE } from '@/constants/app.constants';

/**
 * Lesson Content Management — shared constants for the `/lessons` feature.
 * User-visible labels are Japanese; identifiers/keys are English (snake_case to
 * match the mock query/response conventions used across `crm/*`).
 */

export const LESSONS_PAGE_SIZE = PAGE_SIZE;

/** 予約制限 — 主契約 / オプション candidates per page, searched on the server and read on scroll */
export const RESTRICTION_CANDIDATE_PAGE_SIZE = PAGE_SIZE;
/** 全件表示 Sheet — 個別スケジュール, read page by page as the sheet scrolls (API-112 default 50) */
export const SHEET_SCHEDULE_PAGE_SIZE = 50;
/**
 * 全件表示 Sheet — the 繰り返し設定, read whole at the endpoint's `limit` maximum
 * (`GET /admin/lesson-schedule-recurrences`, max 200; above it 400 E-VAL-001)
 */
export const RECURRENCE_PAGE_SIZE = 200;

/**
 * Quill formats of the レッスン内容説明 — the form's editor writes them and the detail card renders
 * them. One list for both: Quill drops any markup outside its `formats`, so a format missing on
 * either side is lost on an edit round trip.
 */
export const LESSON_DESCRIPTION_QUILL_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
];

export type LessonTab = 'studio' | 'personal' | 'bodycare';

export const LESSON_TABS: { value: LessonTab; label: string }[] = [
  { value: 'studio', label: 'スタジオレッスン' },
  { value: 'personal', label: 'パーソナルトレーニング' },
  { value: 'bodycare', label: 'ボディケア' },
];

/** Which lesson-contents subset (Studio vs Body care) a tab maps to. */
export const TAB_TO_KIND: Record<Exclude<LessonTab, 'personal'>, 'studio' | 'bodycare'> = {
  studio: 'studio',
  bodycare: 'bodycare',
};

export type LessonBrand = 'joyfit' | 'fit365';
export type LessonStatus = 'active' | 'inactive';
export type LessonPricingType = 'included' | 'monthly' | 'per_use';
export type LessonGenderRestriction = 'none' | 'male' | 'female';

export const LESSON_BRAND_LABELS: Record<LessonBrand, string> = {
  joyfit: 'JOYFIT',
  fit365: 'FIT365',
};

export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  active: '有効',
  inactive: '無効',
};

/**
 * The list's status filter. It opens on active masters only (API-111 D-13), so 全ステータス is an
 * explicit `all` in the URL (`?status=all`) rather than an absent param.
 */
export type LessonStatusFilter = LessonStatus | 'all';
export const LESSON_STATUS_FILTER_VALUES: LessonStatusFilter[] = ['all', 'active', 'inactive'];
export const DEFAULT_LESSON_STATUS_FILTER: LessonStatusFilter = 'active';

export const LESSON_STATUS_CLASSES: Record<LessonStatus, string> = {
  active: 'bg-success/15 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

export const LESSON_PRICING_TYPE_LABELS: Record<LessonPricingType, string> = {
  included: '会費内',
  monthly: '有料（月払）',
  per_use: '都度有料',
};

export const LESSON_GENDER_RESTRICTION_LABELS: Record<LessonGenderRestriction, string> = {
  none: '制限なし',
  male: '男性限定',
  female: '女性限定',
};

export const LESSON_GENDER_RESTRICTION_CLASSES: Record<LessonGenderRestriction, string> = {
  none: 'text-muted-foreground',
  male: 'text-gender-male',
  female: 'text-gender-female',
};

/** Sortable column keys per table (must match the mock route `sort_by` enums). */
export const LESSON_CONTENT_SORT_KEYS = ['id', 'name', 'duration', 'status', 'brand'] as const;
export const PERSONAL_PLAN_SORT_KEYS = ['id', 'name', 'category', 'duration', 'price'] as const;

export type LessonContentSortKey = (typeof LESSON_CONTENT_SORT_KEYS)[number];
export type PersonalPlanSortKey = (typeof PERSONAL_PLAN_SORT_KEYS)[number];
