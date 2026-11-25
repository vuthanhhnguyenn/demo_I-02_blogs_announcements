import type { CreateAdminExerciseDto, ExerciseDetailDto } from '@/lib/api-real/types.gen';

/** 両手使用区分 — keyed by the real `limbUsage` enum (GAP-85). */
export type ExerciseHandUsage = ExerciseDetailDto['limbUsage'];

/**
 * Spec レベル (FR-003, ビギナー / エキスパート) — sent and read as `isBeginnerVisible` (D27,
 * `_utils/exercise-level.util.ts`).
 */
export type ExerciseLevel = 'beginner' | 'expert';

/** The single 公開/非公開 flag the screen shows (FR-007), derived from the per-sub-brand links (D18). */
export type ExerciseStatus = 'public' | 'private';

export type ExerciseSubBrand = NonNullable<CreateAdminExerciseDto['brandEnums']>[number];

/**
 * Every sub-brand (G-01 L52: JOYFIT ⊃ Joyfit / Joyfit24 / JoyfitYoga / JoyfitPlus, and Fit365).
 * The API stores publish state per sub-brand; Y-08 has one brand-common status, so create and
 * every publish/unpublish targets all of them (decision D18).
 */
export const EXERCISE_SUB_BRANDS = [
  'Joyfit',
  'Joyfit24',
  'JoyfitYoga',
  'JoyfitPlus',
  'Fit365',
] as const satisfies readonly ExerciseSubBrand[];

type MissingSubBrand = Exclude<ExerciseSubBrand, (typeof EXERCISE_SUB_BRANDS)[number]>;
/** Fails `tsc` when the BE adds a sub-brand this screen does not publish to. */
const SUB_BRAND_DRIFT_CHECK: MissingSubBrand extends never ? true : MissingSubBrand = true;
void SUB_BRAND_DRIFT_CHECK;

export const EXERCISE_LEVEL_OPTIONS = [
  { value: 'beginner', label: 'ビギナー' },
  { value: 'expert', label: 'エキスパート' },
] as const satisfies readonly { value: ExerciseLevel; label: string }[];

export const EXERCISE_HAND_USAGE_OPTIONS = [
  { value: 'both_hands', label: '両手' },
  { value: 'single_hand', label: '片手' },
  { value: 'both_feet', label: '両足' },
  { value: 'single_foot', label: '片足' },
] as const satisfies readonly { value: ExerciseHandUsage; label: string }[];

type MissingHandUsage = Exclude<
  ExerciseHandUsage,
  (typeof EXERCISE_HAND_USAGE_OPTIONS)[number]['value']
>;
/** Fails `tsc` when the BE adds a `limbUsage` value without a label here. */
const HAND_USAGE_DRIFT_CHECK: MissingHandUsage extends never ? true : MissingHandUsage = true;
void HAND_USAGE_DRIFT_CHECK;

export const EXERCISE_STATUS_OPTIONS = [
  { value: 'public', label: '公開' },
  { value: 'private', label: '非公開' },
] as const satisfies readonly { value: ExerciseStatus; label: string }[];

export const EXERCISE_STATUS_LABELS: Record<ExerciseStatus, string> = {
  public: '公開',
  private: '非公開',
};

export const EXERCISE_STATUS_BADGE_CLASSES: Record<ExerciseStatus, string> = {
  public: 'bg-success/15 text-success border-success/20',
  private: 'bg-muted text-muted-foreground border-border',
};

export const EXERCISE_STATUS_DOT_CLASSES: Record<ExerciseStatus, string> = {
  public: 'bg-success',
  private: 'bg-muted-foreground',
};

export const EXERCISE_LEVEL_LABELS: Record<ExerciseLevel, string> = {
  beginner: 'ビギナー',
  expert: 'エキスパート',
};

export const EXERCISE_LEVEL_BADGE_CLASSES: Record<ExerciseLevel, string> = {
  beginner: 'bg-success/15 text-success border-success/20',
  expert: 'bg-destructive/15 text-destructive border-destructive/20',
};

export const EXERCISE_CATEGORY_BADGE_CLASSES = 'border-border bg-muted/70 text-foreground';

export const EXERCISE_HAND_USAGE_LABELS: Record<ExerciseHandUsage, string> = {
  both_hands: '両手',
  single_hand: '片手',
  both_feet: '両足',
  single_foot: '片足',
};

/** Shown where the API cannot supply a spec'd value yet (B2 / B3 / B8). */
export const EXERCISE_VALUE_UNAVAILABLE = '—';

/** Step 0–4 (FR-009) ↔ the real `descriptions.{ja,en}` field that stores it. */
export const EXERCISE_STEP_LABELS = [
  { step: 0, label: '0: トレーニングポイント', field: 'trainingPoint' },
  { step: 1, label: '1: 開始姿勢', field: 'startPosition' },
  { step: 2, label: '2: 動作説明', field: 'movement' },
  { step: 3, label: '3: 最終姿勢', field: 'finalPosition' },
  { step: 4, label: '4: 戻し動作', field: 'returnMotion' },
] as const;

export type ExerciseStepField = (typeof EXERCISE_STEP_LABELS)[number]['field'];

/**
 * Form label of the EN step field. The prototype reads 「英語版（自動生成）」; phase 1 has no machine
 * translation (PO 2026-10-20, D25) — TODO(round3) R304 restores 「（自動生成）」.
 */
export const EXERCISE_STEP_TRANSLATION_LABEL = '英語版';
/** Detail label of the EN step sub-block (prototype 「英語（自動生成）」; see above). */
export const EXERCISE_STEP_TRANSLATION_DETAIL_LABEL = '英語';
/** Display label of the 器具種別 「なし（自重）」 (`mst_tools` code `none`). */
export const EXERCISE_BODYWEIGHT_TOOL_LABEL = 'なし（自重）';
export const EXERCISE_STEP_TRANSLATION_HELP = 'English translation auto-generated';

/** Thumbnail cap (spec 補足: 5枚上限). The API allows 20. */
export const EXERCISE_IMAGE_MAX_COUNT = 5;

/** Page size of the master option queries — the real API caps `limit` at 100; every page is loaded. */
export const EXERCISE_OPTION_QUERY_LIMIT = 100;

/** Page size of the 協働筋 chips — further pages load as the chip area scrolls. */
export const EXERCISE_SECONDARY_MUSCLE_PAGE_SIZE = 30;

/** Page size of the infinite-scroll candidate lists (機材紐づけ / 関連エクササイズ). */
export const EXERCISE_CANDIDATE_PAGE_SIZE = 20;

/** Error codes the screen reacts to specifically (decisions D7 / D10 / D16). */
export const EXERCISE_ERROR_CODE = {
  /** 409 — delete refused while published */
  published: 'E-EXM-002',
  /** 409 — delete refused while a routine uses the exercise */
  usedByRoutine: 'E-EXM-003',
  /** 422 — related-exercise rule (≤3, no self, no duplicates) */
  relatedRule: 'E-EXM-005',
  /** 409 — reference-master code already exists */
  masterCodeExists: 'E-EXM-008',
  /** 409 — reference master is still referenced */
  masterInUse: 'E-EXM-009',
} as const;

export const EXERCISE_DELETE_BLOCKED_MESSAGES = {
  published: '公開中のエクササイズは削除できません。先に非公開に変更してください。',
  usedByRoutine: '使用中のため削除できません',
} as const;

export type ExerciseDeleteBlockReason = keyof typeof EXERCISE_DELETE_BLOCKED_MESSAGES;

export function getExercisePublishActionLabel(status: ExerciseStatus) {
  return status === 'private' ? '公開にする' : '非公開にする';
}

export function findExerciseOptionLabel(
  options: readonly { id: string; label: string }[],
  id: string,
) {
  return options.find((item) => item.id === id)?.label ?? id;
}
