import type { RoutineListItemDto } from '@/lib/api-real/types.gen';

export type RoutinePublishStatus = RoutineListItemDto['publishStatus'];

// Real API `limit` max is 100.
export const ROUTINE_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export const ROUTINE_DEFAULT_PAGE_SIZE = 50;

// ルーティン名の上限: Y-09 に定義がないため管理 API（AdminCreate/UpdateRoutineDto.name maxLength 200）に揃える。
// 入力欄では切り詰めず、超過時はスキーマのエラーを入力欄に表示する（Bug No.5）。
export const ROUTINE_NAME_MAX_LENGTH = 200;
export const ROUTINE_NAME_MAX_LENGTH_MESSAGE = `ルーティン名は${ROUTINE_NAME_MAX_LENGTH}文字以内で入力してください`;

export const ROUTINE_PUBLISH_STATUS_LABELS: Record<RoutinePublishStatus, string> = {
  published: '公開',
  unpublished: '非公開',
};

// セット追加時の共通デフォルト値（FR-008: Rep数:10 / 時間:90秒 / RPE:0）。
// 重量は器具別最低重量（下の ROUTINE_MIN_WEIGHT_BY_TOOL_CODE）。
export const ROUTINE_SET_DEFAULTS = {
  reps: '10',
  time: '90',
  rpe: '0',
} as const;

// FR-008 器具別最低重量（Phase 1 はシステム定数 — Y-09 261020_v3）。キーは Y-08 器具種別の
// `toolCode`（mst_tools.code）。ここにない器具種別（スミスマシン・ケトルベル・TRX・その他など）は
// 重量欄を空欄のままにする。
export const ROUTINE_MIN_WEIGHT_BY_TOOL_CODE: Readonly<Record<string, string>> = {
  barbell: '20',
  dumbbell: '5',
  machine: '10',
  cable: '10',
  none: '0', // なし（自重）
};

export function getRoutineMinWeight(toolCode: string | null | undefined): string {
  return (toolCode && ROUTINE_MIN_WEIGHT_BY_TOOL_CODE[toolCode]) || '';
}

// FR-009 異常系: 推奨Rep数・推奨重量は0以上（E-RTN-005 とメッセージを揃える）
export const ROUTINE_SET_VALIDATION_MESSAGE = '推奨Rep数・重量は0以上の数値のみ許可されています';

// 上限: 会員側 API-021 の契約（Rep ≤ 999 / 重量 ≤ 999.99 / 時間 ≤ 86400）と DB の桁数
// （target_distance_m Decimal(8,2)）。管理 API には上限がなく、超えると 500 になる（BE_REQUEST）。
export const ROUTINE_SET_MAX = {
  reps: 999,
  weight: 999.99,
  time: 86400,
  distance: 999999.99,
} as const;

export const ROUTINE_SET_MAX_MESSAGE = `Rep数は${ROUTINE_SET_MAX.reps}回、重量は${ROUTINE_SET_MAX.weight}kg、時間は${ROUTINE_SET_MAX.time}秒、距離は${ROUTINE_SET_MAX.distance}m以下で入力してください`;

// サーバー側 UpsertRoutineSetInputSchema の targetRpe: min(0).max(10) と揃える
export const ROUTINE_RPE_VALIDATION_MESSAGE = 'RPEは0〜10の範囲で入力してください';

// サーバー側 targetReps / targetDurationSeconds / targetRpe は int（小数は 400 E-VAL-001）
export const ROUTINE_SET_INTEGER_MESSAGE = 'Rep数・時間・RPEは整数で入力してください';

// 件数上限: Y-09 には定義がないが、管理 API の zod が exercises ≤ 100・sets ≤ 50（エクササイズ毎）で
// 400 E-VAL-001 を返すため、FE で事前に止める（spec 未定義 — BA 確認待ち）。
export const ROUTINE_MAX_EXERCISES = 100;
export const ROUTINE_MAX_SETS_PER_EXERCISE = 50;
export const ROUTINE_MAX_EXERCISES_MESSAGE = `エクササイズは最大${ROUTINE_MAX_EXERCISES}件まで登録できます`;
export const ROUTINE_MAX_SETS_MESSAGE = `セットは1エクササイズにつき最大${ROUTINE_MAX_SETS_PER_EXERCISE}件まで登録できます`;

// サーバー側 E-VAL-001 とメッセージを揃える
export const ROUTINE_DUPLICATE_EXERCISE_MESSAGE =
  '同じエクササイズを重複して追加することはできません';

// 編集中にエクササイズを0件にしても公開トグルは自動変更せず、保存時にこのエラーで止める
export const ROUTINE_PUBLISH_REQUIRES_EXERCISE_MESSAGE =
  '公開するにはエクササイズを1件以上登録してください';

export function getRoutinePublishStatusBadgeClass(status: RoutinePublishStatus): string {
  return status === 'published'
    ? 'bg-success/15 text-success border-success/20'
    : 'bg-muted text-muted-foreground border-muted-foreground/20';
}

export function getRoutinePublishStatusDotClass(status: RoutinePublishStatus): string {
  return status === 'published' ? 'bg-success' : 'bg-muted-foreground';
}
