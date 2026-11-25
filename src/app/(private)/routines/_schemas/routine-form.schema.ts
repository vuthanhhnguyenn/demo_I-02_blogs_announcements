import { z } from 'zod';

import type { AdminRoutineDetailDto } from '@/lib/api-real/types.gen';

import {
  ROUTINE_DUPLICATE_EXERCISE_MESSAGE,
  ROUTINE_MAX_EXERCISES,
  ROUTINE_MAX_EXERCISES_MESSAGE,
  ROUTINE_MAX_SETS_MESSAGE,
  ROUTINE_MAX_SETS_PER_EXERCISE,
  ROUTINE_NAME_MAX_LENGTH,
  ROUTINE_NAME_MAX_LENGTH_MESSAGE,
  ROUTINE_PUBLISH_REQUIRES_EXERCISE_MESSAGE,
  ROUTINE_RPE_VALIDATION_MESSAGE,
  ROUTINE_SET_DEFAULTS,
  ROUTINE_SET_INTEGER_MESSAGE,
  ROUTINE_SET_MAX,
  ROUTINE_SET_MAX_MESSAGE,
  ROUTINE_SET_VALIDATION_MESSAGE,
} from '../_constants/routine.constants';

export function isNonNegativeNumberString(value: string): boolean {
  if (value.trim() === '') return true;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

/** Above-the-limit only; empty / non-numeric / negative are judged by `isNonNegativeNumberString`. */
export function isWithinMaxNumberString(value: string, max: number): boolean {
  const parsed = Number(value);
  return value.trim() === '' || !Number.isFinite(parsed) || parsed <= max;
}

export function hasSetValueOverMax(set: {
  reps: string;
  weight: string;
  time: string;
  distance: string;
}): boolean {
  return (
    !isWithinMaxNumberString(set.reps, ROUTINE_SET_MAX.reps) ||
    !isWithinMaxNumberString(set.weight, ROUTINE_SET_MAX.weight) ||
    !isWithinMaxNumberString(set.time, ROUTINE_SET_MAX.time) ||
    !isWithinMaxNumberString(set.distance, ROUTINE_SET_MAX.distance)
  );
}

/** Fractions only; empty / non-numeric are judged by the other checks. */
export function isIntegerOrEmptyString(value: string): boolean {
  const parsed = Number(value);
  return value.trim() === '' || !Number.isFinite(parsed) || Number.isInteger(parsed);
}

/** Rep数・時間・RPE are integers on the server. */
export function hasNonIntegerSetValue(set: { reps: string; time: string; rpe: string }): boolean {
  return (
    !isIntegerOrEmptyString(set.reps) ||
    !isIntegerOrEmptyString(set.time) ||
    !isIntegerOrEmptyString(set.rpe)
  );
}

export function isValidRpeString(value: string): boolean {
  if (value.trim() === '') return true;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10;
}

function numberToString(value: number | null): string {
  return value === null ? '' : String(value);
}

export const routineFormSetSchema = z.object({
  reps: z.string(),
  weight: z.string(),
  time: z.string(),
  distance: z.string(),
  rpe: z.string(),
  // Form-only (never sent): true while 重量 still holds the 器具別最低重量 the form seeded, false once
  // the user types into it. A re-pick replaces only blank or seeded weights (FR-012) — comparing the
  // value against the previous seed can't tell a seed from a user typing the same number back.
  weightSeeded: z.boolean(),
});

export const routineFormExerciseSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  // 器具別最低重量 of the picked exercise — form-only (never sent), seeds 重量 on セット追加.
  // '' for rows loaded in edit mode: AdminRoutineExerciseDto carries no toolCode.
  minWeight: z.string(),
  hqComment: z.string(),
  sets: z.array(routineFormSetSchema),
});

export const routineFormSchema = z
  .object({
    routineCode: z.string(),
    name: z
      .string()
      .trim()
      .min(1, 'ルーティン名を入力してください')
      .max(ROUTINE_NAME_MAX_LENGTH, ROUTINE_NAME_MAX_LENGTH_MESSAGE),
    description: z.string(),
    categoryId: z.string().min(1, 'ルーティンカテゴリを選択してください'),
    thumbnailS3Keys: z.array(z.string()),
    isPublished: z.boolean(),
    exercises: z.array(routineFormExerciseSchema),
  })
  .superRefine((value, ctx) => {
    const pickedExerciseIds = value.exercises
      .map((exercise) => exercise.exerciseId)
      .filter(Boolean);
    const hasDuplicateExercise = new Set(pickedExerciseIds).size !== pickedExerciseIds.length;
    if (hasDuplicateExercise) {
      ctx.addIssue({
        code: 'custom',
        path: ['exercises'],
        message: ROUTINE_DUPLICATE_EXERCISE_MESSAGE,
      });
    }

    const hasInvalidSet = value.exercises.some((exercise) =>
      exercise.sets.some(
        (set) =>
          !isNonNegativeNumberString(set.reps) ||
          !isNonNegativeNumberString(set.weight) ||
          !isNonNegativeNumberString(set.time) ||
          !isNonNegativeNumberString(set.distance),
      ),
    );
    if (hasInvalidSet) {
      ctx.addIssue({
        code: 'custom',
        path: ['exercises'],
        message: ROUTINE_SET_VALIDATION_MESSAGE,
      });
    }

    const hasSetOverMax = value.exercises.some((exercise) =>
      exercise.sets.some(hasSetValueOverMax),
    );
    if (hasSetOverMax) {
      ctx.addIssue({
        code: 'custom',
        path: ['exercises'],
        message: ROUTINE_SET_MAX_MESSAGE,
      });
    }

    const hasNonIntegerSet = value.exercises.some((exercise) =>
      exercise.sets.some(hasNonIntegerSetValue),
    );
    if (hasNonIntegerSet) {
      ctx.addIssue({
        code: 'custom',
        path: ['exercises'],
        message: ROUTINE_SET_INTEGER_MESSAGE,
      });
    }

    if (value.exercises.length > ROUTINE_MAX_EXERCISES) {
      ctx.addIssue({ code: 'custom', path: ['exercises'], message: ROUTINE_MAX_EXERCISES_MESSAGE });
    }
    if (value.exercises.some((exercise) => exercise.sets.length > ROUTINE_MAX_SETS_PER_EXERCISE)) {
      ctx.addIssue({ code: 'custom', path: ['exercises'], message: ROUTINE_MAX_SETS_MESSAGE });
    }

    const hasInvalidRpe = value.exercises.some((exercise) =>
      exercise.sets.some((set) => !isValidRpeString(set.rpe)),
    );
    if (hasInvalidRpe) {
      ctx.addIssue({
        code: 'custom',
        path: ['exercises'],
        message: ROUTINE_RPE_VALIDATION_MESSAGE,
      });
    }

    if (value.isPublished && pickedExerciseIds.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['isPublished'],
        message: ROUTINE_PUBLISH_REQUIRES_EXERCISE_MESSAGE,
      });
    }
  });

export type RoutineFormValues = z.infer<typeof routineFormSchema>;
export type RoutineFormExerciseValues = z.infer<typeof routineFormExerciseSchema>;
export type RoutineFormSetValues = z.infer<typeof routineFormSetSchema>;

export function createEmptyRoutineFormSet(weight = ''): RoutineFormSetValues {
  return {
    reps: ROUTINE_SET_DEFAULTS.reps,
    weight,
    weightSeeded: weight !== '',
    time: ROUTINE_SET_DEFAULTS.time,
    distance: '',
    rpe: ROUTINE_SET_DEFAULTS.rpe,
  };
}

export function createEmptyRoutineFormExercise(): RoutineFormExerciseValues {
  return {
    exerciseId: '',
    exerciseName: '',
    minWeight: '',
    hqComment: '',
    sets: [createEmptyRoutineFormSet()],
  };
}

export function createEmptyRoutineFormValues(): RoutineFormValues {
  return {
    routineCode: '保存後に自動採番されます',
    name: '',
    description: '',
    categoryId: '',
    thumbnailS3Keys: [],
    isPublished: false,
    exercises: [],
  };
}

export function mapRoutineDetailToFormValues(routine: AdminRoutineDetailDto): RoutineFormValues {
  return {
    routineCode: routine.routineCode ?? '—',
    name: routine.name,
    description: routine.description ?? '',
    // Legacy rows may have no category — left empty so the required rule asks for one.
    categoryId: routine.categoryId ?? '',
    thumbnailS3Keys: routine.thumbnailS3Keys,
    isPublished: routine.publishStatus === 'published',
    exercises: routine.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      minWeight: '',
      hqComment: exercise.hqComment ?? '',
      sets: exercise.sets.map((set) => ({
        reps: numberToString(set.targetReps),
        weight: numberToString(set.targetWeightKg),
        weightSeeded: false,
        time: numberToString(set.targetDurationSeconds),
        distance: numberToString(set.targetDistanceM),
        rpe: numberToString(set.targetRpe),
      })),
    })),
  };
}
