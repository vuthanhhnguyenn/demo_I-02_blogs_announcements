import type {
  CreateAdminExerciseDto,
  LangTextInputDto,
  UpdateAdminExerciseDto,
} from '@/lib/api-real/types.gen';

import { EXERCISE_STEP_LABELS, EXERCISE_SUB_BRANDS } from '../_constants/constants';
import type { ExerciseFormValues } from '../_schemas/exercise-form.schema';
import { toIsBeginnerVisible } from './exercise-level.util';
import { EXERCISE_TRANSLATABLE_FIELDS } from './exercise-translation.util';

const DEFAULT_REST_SECONDS = 90;

/** The fields POST and PATCH share; PATCH full-replaces every collection sent here (§7). */
function toWriteBody(values: ExerciseFormValues) {
  const hasPrimaryImage = values.images.some((image) => image.isPrimary);
  const ja: LangTextInputDto = { name: values.nameJa.trim() };
  const en: LangTextInputDto = { name: values.nameEn.trim() || null };
  for (const { step, field } of EXERCISE_STEP_LABELS) {
    const item = values.explanationSteps.find((entry) => entry.step === step);
    ja[field] = item?.textJa.trim() || null;
    en[field] = item?.textEn.trim() || null;
  }
  // A listed field must carry an `en` value in the same request (else 400), and a hand edit is
  // never listed (D22). Phase 1 types every EN by hand (D25), so this stays empty until R304.
  const machineTranslatedFields = EXERCISE_TRANSLATABLE_FIELDS.filter(
    (field) => values.translation[field].isMachine && Boolean(en[field]),
  );

  return {
    categoryId: values.categoryId,
    primaryMuscleId: values.primaryMuscleId,
    secondaryMuscleIds: values.secondaryMuscleIds,
    toolId: values.toolId,
    exerciseTypeId: values.exerciseTypeId,
    // Spec レベル = `isBeginnerVisible` (D27). The schema rejects an empty レベル before this runs.
    isBeginnerVisible: toIsBeginnerVisible(values.level ?? 'beginner'),
    limbUsage: values.handUsage,
    restSeconds: values.restSeconds ?? DEFAULT_REST_SECONDS,
    descriptions: { ja, en, machineTranslatedFields },
    equipmentIds: values.linkedEquipmentIds,
    enabledTagIds: values.enabledTagIds,
    relatedExerciseIds: values.relatedExerciseIds,
    images: values.images.map((image, index) => ({
      imageS3Key: image.s3Key,
      isPrimary: hasPrimaryImage ? image.isPrimary : index === 0,
    })),
    // 動画URL accepts any http(s) URL (Y-08 補足); uploads (`videoS3Key`) are not offered.
    videos: values.videoUrl ? [{ videoUrl: values.videoUrl }] : [],
  } satisfies UpdateAdminExerciseDto;
}

/** POST body — created unpublished on every sub-brand (D18); publishing is a separate call (D9). */
export function toCreateExerciseBody(values: ExerciseFormValues): CreateAdminExerciseDto {
  return { ...toWriteBody(values), brandEnums: [...EXERCISE_SUB_BRANDS] };
}

/** PATCH body — collections are full-replaced, `descriptions` is UPSERTed. */
export function toUpdateExerciseBody(values: ExerciseFormValues): UpdateAdminExerciseDto {
  return toWriteBody(values);
}
