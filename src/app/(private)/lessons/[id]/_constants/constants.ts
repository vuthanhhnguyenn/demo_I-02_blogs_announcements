import type { StatusTone } from '@/components/common/status-card';

/**
 * D-02 FR-003 — Detail-only label maps for the lesson content detail screen.
 * User-visible labels are Japanese; identifiers/keys are English.
 * View shapes come from the generated client; these are presentation maps only.
 */

export type LessonDetailType = 'studio' | 'personal' | 'bodycare';
export type LessonDetailStatus = 'active' | 'inactive';

/** Status badge / status-card tone + label (有効 / 無効). */
export const LESSON_DETAIL_STATUS_TONE: Record<LessonDetailStatus, StatusTone> = {
  active: 'success',
  inactive: 'muted',
};

export const LESSON_DETAIL_STATUS_LABELS: Record<LessonDetailStatus, string> = {
  active: '有効',
  inactive: '無効',
};

/** Lesson-type badge label + token-based style (studio / personal / bodycare). */
export const LESSON_TYPE_BADGE_LABELS: Record<LessonDetailType, string> = {
  studio: 'スタジオレッスン',
  personal: 'パーソナルトレーニング',
  bodycare: 'ボディケア',
};

export const LESSON_TYPE_BADGE_CLASSES: Record<LessonDetailType, string> = {
  studio: 'bg-info/15 text-info border-info/20',
  personal: 'bg-success/15 text-success border-success/20',
  bodycare: 'bg-warning/15 text-warning border-warning/20',
};

/**
 * Time-row label differs by lesson type: 実施時間 for studio/bodycare,
 * セッション時間 for personal (FR-003-P1-03).
 */
export function getTimeRowLabel(lessonType: LessonDetailType): string {
  return lessonType === 'personal' ? 'セッション時間' : '実施時間';
}

/**
 * Change-history 変更内容 wording for the lesson fields a plain edit (PATCH) can change — the same
 * names the detail cards and the form use. Keys are `snapshot.lesson` (API-111 §5.1) field names.
 */
export const HISTORY_FIELD_LABELS = {
  name: 'レッスン名',
  storeId: '店舗',
  lessonType: 'レッスン種別',
  durationMinutes: '実施時間',
  feeType: '料金種別',
  fee: '都度利用料金',
  genderRestriction: '性別制限',
  description: 'レッスン内容説明',
  note: '内部メモ・備考',
} as const;

/** 変更内容 of an image / restriction write, by `snapshot.meta.action` (`count` = restriction ids). */
export const HISTORY_META_ACTION_DETAILS: Record<string, (count: number | null) => string> = {
  image_added: () => '画像を追加',
  image_removed: () => '画像を削除',
  images_reordered: () => '画像の並び順を変更',
  plan_restrictions_replaced: (count) =>
    count ? `制限主契約を変更（${count}件）` : '制限主契約を解除',
  option_restrictions_replaced: (count) =>
    count ? `制限オプション契約を変更（${count}件）` : '制限オプション契約を解除',
};

/** Change-history action → badge styling (read-only history tab). */
export const HISTORY_ACTION_CLASSES: Record<string, string> = {
  作成: 'bg-info/15 text-info border-info/20',
  編集: 'bg-muted text-muted-foreground border-border',
  更新: 'bg-muted text-muted-foreground border-border',
  有効化: 'bg-success/15 text-success border-success/20',
  無効化: 'bg-warning/15 text-warning border-warning/20',
  削除: 'bg-destructive/15 text-destructive border-destructive/20',
};

/**
 * Capacity tone helper for schedule rows (FR-003-P1-09 / research D6):
 * full → destructive, ≥80% → warning, >0 → success, 0 → muted.
 */
export function getCapacityToneClass(booked: number, capacity: number): string {
  if (capacity > 0 && booked >= capacity) return 'text-destructive';
  const ratio = capacity > 0 ? booked / capacity : 0;
  if (ratio >= 0.8) return 'text-warning';
  if (booked > 0) return 'text-success';
  return 'text-muted-foreground';
}

/** Recurrence cadence prefix of the 繰り返し設定 day badge (API-112 `recurrenceType`). */
export const RECURRENCE_TYPE_LABELS: Record<'weekly' | 'biweekly' | 'monthly', string> = {
  weekly: '毎週',
  biweekly: '隔週',
  monthly: '毎月',
};

/** Weekday labels indexed by the API's `daysOfWeek` value (0 = Sunday). */
export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** Display order of weekdays in the day badge — Monday first. */
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
