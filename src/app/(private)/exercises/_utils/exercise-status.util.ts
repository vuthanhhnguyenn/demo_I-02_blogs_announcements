import type {
  ExerciseLangTextDto,
  ExerciseListItemDto,
  PublishExerciseDto,
} from '@/lib/api-real/types.gen';

import {
  EXERCISE_STEP_LABELS,
  EXERCISE_SUB_BRANDS,
  type ExerciseStatus,
} from '../_constants/constants';

/**
 * The single 公開/非公開 flag (FR-007) from the BE aggregate over the sub-brand links (§6.1).
 *
 * `partial` (some sub-brands published — only possible when links are changed outside the CRM,
 * D18) reads as 公開: the BE refuses to delete it (E-EXM-002) and offers it as a routine
 * candidate, so the badge never lets an operator start an action the BE will reject (Q-R22).
 */
export function getExercisePublishStatus(
  exercise: Pick<ExerciseListItemDto, 'publishStatus'>,
): ExerciseStatus {
  return exercise.publishStatus === 'unpublished' ? 'private' : 'public';
}

/** Publish body that sets every sub-brand to the same state, emulating one flag (D18). */
export function toPublishBody(status: ExerciseStatus): PublishExerciseDto {
  return {
    publishStatus: status === 'public' ? 'published' : 'unpublished',
    brandEnums: [...EXERCISE_SUB_BRANDS],
  };
}

/** FR-007 warning source: any of the step 0–4 Japanese texts is empty. */
export function hasIncompleteExerciseSteps(ja: ExerciseLangTextDto | null | undefined): boolean {
  return EXERCISE_STEP_LABELS.some(({ field }) => !ja?.[field]?.trim());
}
