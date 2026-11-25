'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  allocateId,
  useDirtyFormScope,
  useOptionalNavigationBlocker,
} from '@/contexts/navigation-blocker.context';

export interface UseRegisterDirtyFormReturn {
  /** Identifies this form in the registry — pass it as a `DiscardTarget`. */
  formId: number;
  /**
   * Runs `action` unless *this* form still holds unsaved edits, in which case the
   * app's discard dialog asks first. Scoped to this form on purpose: closing a sheet
   * must not ask about a page form behind it that the user is not leaving.
   * `onCancel` runs if the user chooses to keep editing.
   */
  confirmDiscard: (action: () => void, onCancel?: () => void) => void;
}

/**
 * Publishes one form's dirty state to the app-wide registry, which is what makes the
 * app chrome (logout, sidebar navigation) and the browser's unload prompt able to warn
 * about unsaved edits without every form wiring that up itself.
 *
 * Registration is keyed per form, so several forms — a page form with a sheet form open
 * on top of it — coexist. `isDirty` stays owned by the caller (react-hook-form's
 * `formState.isDirty`) so the form remains the single source of truth: clear it by
 * resetting the form, never through a second flag held in here.
 *
 * Outside a `NavigationBlockerProvider` (the public auth pages) this is a no-op.
 */
export function useRegisterDirtyForm(isDirty: boolean): UseRegisterDirtyFormReturn {
  const context = useOptionalNavigationBlocker();
  const scopeId = useDirtyFormScope();

  // Lazy initialiser: allocated once per mounted form and never re-read.
  const [formId] = useState(allocateId);

  const setFormDirty = context?.setFormDirty;
  useEffect(() => {
    if (!setFormDirty) return;
    setFormDirty(formId, isDirty ? scopeId : null);
    return () => setFormDirty(formId, null);
  }, [setFormDirty, formId, isDirty, scopeId]);

  const contextConfirmDiscard = context?.confirmDiscard;
  const confirmDiscard = useCallback(
    (action: () => void, onCancel?: () => void) => {
      if (!contextConfirmDiscard) {
        action();
        return;
      }
      contextConfirmDiscard(action, { formId }, onCancel);
    },
    [contextConfirmDiscard, formId],
  );

  return { formId, confirmDiscard };
}
