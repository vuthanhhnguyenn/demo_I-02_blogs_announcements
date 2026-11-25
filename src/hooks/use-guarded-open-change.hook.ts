'use client';

import { useCallback, useState } from 'react';

import { allocateId, useOptionalNavigationBlocker } from '@/contexts/navigation-blocker.context';

/** The subset of Base UI's change-event details this guard needs. */
interface CancellableEventDetails {
  cancel: () => void;
}

export interface UseGuardedOpenChangeReturn<TDetails> {
  /** Identifies this sheet/dialog subtree — feed it to `DirtyFormScopeProvider`. */
  scopeId: number;
  handleOpenChange: (open: boolean, details: TDetails) => void;
}

/**
 * Wraps a Sheet/Dialog root's `onOpenChange` so that closing it while a form inside
 * still holds unsaved edits asks first.
 *
 * Guarding the root covers every close path Base UI owns at once — Escape, a click on
 * the backdrop, and the built-in X button — because all three reach the component as an
 * `onOpenChange(false, …)` call. A キャンセル button inside the form is the exception:
 * it calls the parent's own state setter directly and has to use `confirmDiscard` itself.
 *
 * Only the forms inside *this* sheet count: closing a sheet must not ask about a page
 * form behind it that the user is not leaving.
 */
export function useGuardedOpenChange<TDetails extends CancellableEventDetails>(
  onOpenChange: ((open: boolean, details: TDetails) => void) | undefined,
  guardUnsaved: boolean,
): UseGuardedOpenChangeReturn<TDetails> {
  // Lazy initialiser: allocated once per mounted sheet and never re-read.
  const [scopeId] = useState(allocateId);
  const context = useOptionalNavigationBlocker();

  const handleOpenChange = useCallback(
    (open: boolean, details: TDetails) => {
      if (open || !guardUnsaved || !context?.isDirty({ scopeId })) {
        onOpenChange?.(open, details);
        return;
      }
      // Keep the sheet on screen while the app's own dialog asks about the edits.
      details.cancel();
      context.confirmDiscard(() => onOpenChange?.(false, details), { scopeId });
    },
    [context, guardUnsaved, onOpenChange, scopeId],
  );

  return { scopeId, handleOpenChange };
}
