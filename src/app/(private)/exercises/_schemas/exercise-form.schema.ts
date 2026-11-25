import { z } from 'zod';

import type { ExerciseDetailDto } from '@/lib/api-real/types.gen';

import { EXERCISE_IMAGE_MAX_COUNT, EXERCISE_STEP_LABELS } from '../_constants/constants';
import { exerciseImageSrc } from '../_utils/exercise-image-url.util';
import { toExerciseLevel } from '../_utils/exercise-level.util';
import { getExercisePublishStatus } from '../_utils/exercise-status.util';
import {
  EXERCISE_TRANSLATABLE_FIELDS,
  type ExerciseTranslatableField,
} from '../_utils/exercise-translation.util';

/** BE limits (`packages/zod-schemas/src/training/exercise-master.schema.ts`, decision D17). */
const NAME_MAX_LENGTH = 200;
const STEP_TEXT_MAX_LENGTH = 4000;
/** `videos[].videoUrl` (BE_REQUEST No.13). */
const VIDEO_URL_MAX_LENGTH = 2048;
/** 休憩時間: a whole number of seconds, at most 9 digits (TC assumption, BUG-Y08C-19). */
const REST_SECONDS_MAX_DIGITS = 9;

const HAND_USAGE_VALUES = ['both_hands', 'single_hand', 'both_feet', 'single_foot'] as const;

/** Full-width digits (「１２０」) are accepted as their half-width form. */
function toHalfWidthDigits(value: string) {
  return value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}

/**
 * FR-014 bookkeeping per translatable field (D22) — never sent as such.
 * - `baseJa`: the JP text the current EN belongs to; `null` = already out of date when loaded.
 * - `isManuallyEdited`: EN was typed by hand → 再翻訳 asks before overwriting.
 * - `isMachine`: EN is unedited machine output from this session → `machineTranslatedFields`.
 */
const TranslationMetaSchema = z.object({
  baseJa: z.string().nullable(),
  isManuallyEdited: z.boolean(),
  isMachine: z.boolean(),
});
export type ExerciseTranslationMeta = z.infer<typeof TranslationMetaSchema>;

export const ExerciseFormSchema = z.object({
  exerciseCode: z.string(),
  nameJa: z
    .string()
    .trim()
    .min(1, 'エクササイズ名（日本語）は必須です')
    .max(NAME_MAX_LENGTH, `エクササイズ名（日本語）は${NAME_MAX_LENGTH}文字以内で入力してください`),
  /** FR-014: typed by hand in phase 1 (D25); machine translation on save is phase 2 (R304). */
  nameEn: z
    .string()
    .trim()
    .max(NAME_MAX_LENGTH, `エクササイズ名（英語）は${NAME_MAX_LENGTH}文字以内で入力してください`),
  overviewJa: z.string().nullable(),
  overviewEn: z.string().nullable(),
  categoryId: z.string().min(1, 'カテゴリは必須です'),
  primaryMuscleId: z.string().min(1, '主働筋は必須です'),
  secondaryMuscleIds: z.array(z.string()).default([]),
  toolId: z.string().min(1, '器具種別は必須です'),
  exerciseTypeId: z.string().min(1, 'エクササイズタイプは必須です'),
  /** Starts empty on create (「選択してください」); a choice is required (FR-003). */
  handUsage: z
    .enum(HAND_USAGE_VALUES)
    .nullable()
    .transform((value, ctx) => {
      if (value === null) {
        ctx.addIssue({ code: 'custom', message: '両手使用区分は必須です' });
        return z.NEVER;
      }
      return value;
    }),
  /** Spec レベル (FR-003, required) — `isBeginnerVisible` on the API (D27). */
  level: z
    .enum(['beginner', 'expert'])
    .nullable()
    .refine((value) => value !== null, 'レベルは必須です'),
  /**
   * Typed as text so `1e3`, `-10` or `45.5` reach the check instead of being coerced by the
   * browser; empty = the BE default (90).
   */
  restSeconds: z
    .string()
    .transform((value) => toHalfWidthDigits(value.trim()))
    .refine((value) => /^\d*$/.test(value), '休憩時間は0以上の整数で入力してください')
    .refine(
      (value) => value.length <= REST_SECONDS_MAX_DIGITS,
      `休憩時間は${REST_SECONDS_MAX_DIGITS}桁以内で入力してください`,
    )
    .transform((value) => (value === '' ? undefined : Number(value))),
  publishStatus: z.enum(['public', 'private']).default('private'),
  videoUrl: z
    .string()
    .trim()
    .max(VIDEO_URL_MAX_LENGTH, `動画URLは${VIDEO_URL_MAX_LENGTH}文字以内で入力してください`)
    .nullable()
    .transform((value) => (value === '' ? null : value))
    .refine((value) => value === null || /^https?:\/\//.test(value), '動画URLの形式が不正です'),
  images: z
    .array(
      z.object({
        /** API-006 key returned by the presign upload. */
        s3Key: z.string().min(1),
        /** Preview only, never sent: a local object URL (fresh upload) or the signed `imageUrl`. */
        previewUrl: z.string().optional(),
        isPrimary: z.boolean(),
      }),
    )
    .max(EXERCISE_IMAGE_MAX_COUNT),
  explanationSteps: z
    .array(
      z.object({
        step: z.number().int().min(0).max(4),
        textJa: z
          .string()
          .max(
            STEP_TEXT_MAX_LENGTH,
            `解説ステップは${STEP_TEXT_MAX_LENGTH}文字以内で入力してください`,
          ),
        textEn: z
          .string()
          .max(
            STEP_TEXT_MAX_LENGTH,
            `解説ステップ（英語）は${STEP_TEXT_MAX_LENGTH}文字以内で入力してください`,
          ),
      }),
    )
    .length(EXERCISE_STEP_LABELS.length),
  linkedEquipmentIds: z.array(z.string()).default([]),
  relatedExerciseIds: z
    .array(z.string())
    .max(3, '関連エクササイズは最大3件まで設定できます')
    .default([]),
  enabledTagIds: z.array(z.string()).default([]),
  translation: z.record(z.enum(EXERCISE_TRANSLATABLE_FIELDS), TranslationMetaSchema),
});

export type ExerciseDetail = ExerciseDetailDto;
export type ExerciseFormInput = z.input<typeof ExerciseFormSchema>;
export type ExerciseFormValues = z.output<typeof ExerciseFormSchema>;

const FRESH_TRANSLATION_META: ExerciseTranslationMeta = {
  baseJa: '',
  isManuallyEdited: false,
  isMachine: false,
};

function createTranslationMeta(
  build: (field: ExerciseTranslatableField) => ExerciseTranslationMeta,
): ExerciseFormInput['translation'] {
  return Object.fromEntries(
    EXERCISE_TRANSLATABLE_FIELDS.map((field) => [field, build(field)]),
  ) as ExerciseFormInput['translation'];
}

export function createExerciseFormDefaults(): ExerciseFormInput {
  return {
    // Shown as 「保存後に自動採番されます」 until the BE numbers it.
    exerciseCode: '',
    nameJa: '',
    nameEn: '',
    overviewJa: '',
    overviewEn: '',
    categoryId: '',
    primaryMuscleId: '',
    secondaryMuscleIds: [],
    toolId: '',
    exerciseTypeId: '',
    handUsage: null,
    level: null,
    restSeconds: '90',
    publishStatus: 'private',
    videoUrl: '',
    images: [],
    explanationSteps: EXERCISE_STEP_LABELS.map(({ step }) => ({
      step,
      textJa: '',
      textEn: '',
    })),
    linkedEquipmentIds: [],
    relatedExerciseIds: [],
    enabledTagIds: [],
    translation: createTranslationMeta(() => FRESH_TRANSLATION_META),
  };
}

export function mapExerciseDetailToFormValues(detail: ExerciseDetail): ExerciseFormInput {
  const { ja, en } = detail.descriptions;
  return {
    exerciseCode: detail.exerciseCode ?? '',
    nameJa: ja.name ?? detail.name,
    nameEn: en?.name ?? '',
    overviewJa: ja.overview ?? '',
    overviewEn: en?.overview ?? '',
    categoryId: detail.categoryId ?? '',
    primaryMuscleId: detail.primaryMuscleId ?? '',
    secondaryMuscleIds: detail.secondaryMuscleIds,
    toolId: detail.toolId ?? '',
    exerciseTypeId: detail.exerciseTypeId ?? '',
    handUsage: detail.limbUsage,
    level: toExerciseLevel(detail.isBeginnerVisible),
    restSeconds: detail.restSeconds == null ? '' : String(detail.restSeconds),
    publishStatus: getExercisePublishStatus(detail),
    // Rows saved before BE_REQUEST No.13 carry the URL in `videoS3Key` (Q-R24).
    videoUrl: detail.videos[0]?.videoUrl ?? detail.videos[0]?.videoS3Key ?? '',
    images: detail.images.map((image) => ({
      s3Key: image.imageS3Key,
      previewUrl: exerciseImageSrc(image),
      isPrimary: image.isPrimary,
    })),
    explanationSteps: EXERCISE_STEP_LABELS.map(({ step, field }) => ({
      step,
      textJa: ja[field] ?? '',
      textEn: en?.[field] ?? '',
    })),
    linkedEquipmentIds: detail.equipmentIds,
    relatedExerciseIds: detail.relatedExerciseIds,
    enabledTagIds: detail.enabledTagIds,
    // 要再翻訳 at load = machine EN whose JP changed since (a hand-written EN has no machine
    // baseline to compare with, so it is not flagged until the JP is edited in this session).
    translation: createTranslationMeta((field) => {
      const state = detail.descriptions.translationStates[field];
      const isStale = Boolean(en?.[field]) && state.needsRetranslation && !state.isManuallyEdited;
      return {
        baseJa: isStale ? null : (ja[field] ?? ''),
        isManuallyEdited: state.isManuallyEdited,
        isMachine: false,
      };
    }),
  };
}

export function exerciseHasIncompletePublishSteps(values: ExerciseFormValues) {
  if (values.publishStatus !== 'public') return false;
  return values.explanationSteps.some((step) => step.textJa.trim().length === 0);
}
