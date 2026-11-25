'use client';

import { ExerciseForm } from '../_components/exercise-form';

/** The form owns its header so the back link can ask before dropping unsaved edits (C-16). */
export default function ExerciseCreatePage() {
  return (
    <div className="flex flex-col">
      <ExerciseForm mode="create" />
    </div>
  );
}
