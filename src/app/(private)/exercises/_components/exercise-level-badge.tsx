import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

import { EXERCISE_LEVEL_BADGE_CLASSES, EXERCISE_LEVEL_LABELS } from '../_constants/constants';
import { toExerciseLevel } from '../_utils/exercise-level.util';

/** Spec レベル tone badge (ビギナー green / エキスパート red) from `isBeginnerVisible` (D27). */
export function ExerciseLevelBadge({
  isBeginnerVisible,
}: Readonly<{ isBeginnerVisible: boolean }>) {
  const level = toExerciseLevel(isBeginnerVisible);
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-normal', EXERCISE_LEVEL_BADGE_CLASSES[level])}
    >
      {EXERCISE_LEVEL_LABELS[level]}
    </Badge>
  );
}
