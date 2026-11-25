import type { ExerciseLevel } from '../_constants/constants';

/**
 * Spec レベル ↔ API `isBeginnerVisible` (D27, PO 2026-10-20): ビギナー = `true`, エキスパート =
 * `false`. The API's `level` (`easy` / `moderate` / `hard`) is the physical difficulty, not this.
 */
export function toExerciseLevel(isBeginnerVisible: boolean): ExerciseLevel {
  return isBeginnerVisible ? 'beginner' : 'expert';
}

export function toIsBeginnerVisible(level: ExerciseLevel): boolean {
  return level === 'beginner';
}
