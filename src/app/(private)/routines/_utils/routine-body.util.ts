import type { AdminCreateRoutineDto } from '@/lib/api-real/types.gen';

import type { RoutineFormValues } from '../_schemas/routine-form.schema';

function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toTrimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

// Exercise order is the array order; setNumber is re-numbered server-side when omitted.
export function buildRoutineSaveBody(values: RoutineFormValues): AdminCreateRoutineDto {
  return {
    name: values.name.trim(),
    categoryId: values.categoryId,
    description: toTrimmedOrNull(values.description),
    // Y-09 補足: gallery of up to 5, first = main. PATCH replaces the whole gallery.
    thumbnailS3Keys: values.thumbnailS3Keys,
    exercises: values.exercises
      .filter((exercise) => exercise.exerciseId)
      .map((exercise) => ({
        exerciseId: exercise.exerciseId,
        hqComment: toTrimmedOrNull(exercise.hqComment),
        sets: exercise.sets.map((set) => ({
          setType: 'normal' as const,
          targetReps: toNumberOrNull(set.reps),
          targetWeightKg: toNumberOrNull(set.weight),
          targetDurationSeconds: toNumberOrNull(set.time),
          targetDistanceM: toNumberOrNull(set.distance),
          targetRpe: toNumberOrNull(set.rpe),
        })),
      })),
  };
}
