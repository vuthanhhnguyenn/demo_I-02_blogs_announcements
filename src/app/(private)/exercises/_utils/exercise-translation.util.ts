import type { ExerciseStepField } from '../_constants/constants';

/** FR-014 scope: the exercise name and the five explanation steps (overview is out of scope). */
export const EXERCISE_TRANSLATABLE_FIELDS = [
  'name',
  'trainingPoint',
  'startPosition',
  'movement',
  'finalPosition',
  'returnMotion',
] as const satisfies readonly ('name' | ExerciseStepField)[];

export type ExerciseTranslatableField = (typeof EXERCISE_TRANSLATABLE_FIELDS)[number];

export type ExerciseTranslationTexts = Partial<Record<ExerciseTranslatableField, string>>;

export class ExerciseTranslationUnavailableError extends Error {
  constructor() {
    super('Machine translation is not available');
    this.name = 'ExerciseTranslationUnavailableError';
  }
}

/**
 * JP → EN machine translation for the given fields (save-time auto translation and 再翻訳, D22).
 *
 * TODO(round3) R304 — machine translation is phase 2 (PO 2026-10-20, BE_REQUEST No.11). Phase 1
 * staff type the English by hand and no caller runs this. When the BE ships the endpoint, wire it
 * here and restore the save-time call and 再翻訳 UI; callers already list unedited results in
 * `machineTranslatedFields` (R217).
 */
export async function translateExerciseTexts(
  texts: ExerciseTranslationTexts,
): Promise<ExerciseTranslationTexts> {
  void texts;
  throw new ExerciseTranslationUnavailableError();
}
