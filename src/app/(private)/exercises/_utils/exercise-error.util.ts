import { EXERCISE_ERROR_CODE, type ExerciseDeleteBlockReason } from '../_constants/constants';

/** Reads `ErrorResponseDto.code` off a thrown API error; undefined for transport errors. */
export function getExerciseErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** The delete-blocked reason a 409 carries (FR-006), or undefined for any other failure. */
export function getExerciseDeleteBlockReason(
  error: unknown,
): ExerciseDeleteBlockReason | undefined {
  const code = getExerciseErrorCode(error);
  if (code === EXERCISE_ERROR_CODE.published) return 'published';
  if (code === EXERCISE_ERROR_CODE.usedByRoutine) return 'usedByRoutine';
  return undefined;
}
