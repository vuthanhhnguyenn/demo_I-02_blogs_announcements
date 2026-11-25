import type { ExerciseMasterOption } from '../_hooks/use-exercise-master-options';

/**
 * Display name for a list-row master column.
 *
 * The list item carries the master name (`categoryName` / `primaryMuscleName`, BE_REQUEST No.5).
 * It is `null` for an exercise with no master id — rows from before API-079. Only then the legacy
 * denormalised string (`category` / `primaryMuscle`) is resolved against the master options by
 * code, then by name, else shown as is (decision D6).
 *
 * TODO(round2) R214 — once the 71 seed rows on dev are confirmed to carry master ids, drop the
 * fallback and read the name only.
 */
export function resolveExerciseMasterLabel(
  options: readonly ExerciseMasterOption[],
  name: string | null | undefined,
  legacyValue: string | null | undefined,
): string {
  if (name) return name;
  if (!legacyValue) return '';
  return (
    options.find((item) => item.code === legacyValue)?.label ??
    options.find((item) => item.label === legacyValue)?.label ??
    legacyValue
  );
}
