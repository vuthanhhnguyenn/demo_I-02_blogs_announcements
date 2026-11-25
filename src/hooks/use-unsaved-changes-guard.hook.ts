// Needs window.history / popstate, so it is inherently client-only.
'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useNavigationBlocker } from '@/contexts/navigation-blocker.context';

import { useRegisterDirtyForm } from '@/hooks/use-register-dirty-form.hook';
import type { UseUnsavedChangesReturn } from '@/hooks/use-unsaved-changes.hook';

export interface UseUnsavedChangesGuardReturn extends UseUnsavedChangesReturn {
  /**
   * For post-save navigation: nothing to discard, so this skips the dirty check and
   * the dialog entirely but still drops the sentinel entry before navigating.
   */
  navigateAfterSave: (action: () => void) => void;
}

/**
 * `useUnsavedChanges` plus the browser's Back/Forward buttons.
 *
 * Back/forward is reachable only via the sentinel entry below, because `beforeunload`
 * is spec'd not to fire for same-document history traversal and Next's App Router
 * exposes no navigation-blocking API.
 *
 * Only worth it for full-page forms: a sheet form's Back press closes the page the
 * sheet sits on, which the page form's own guard already covers.
 */
export function useUnsavedChangesGuard(isDirty: boolean): UseUnsavedChangesGuardReturn {
  const { confirmDiscard } = useRegisterDirtyForm(isDirty);
  const { registerExitPreparer } = useNavigationBlocker();

  /** True while a duplicate history entry of our own is sitting on top of the stack. */
  const sentinelArmedRef = useRef(false);
  /** Set while we move through history ourselves, so our listener ignores that pop. */
  const selfPopRef = useRef(false);

  /**
   * Drops our sentinel entry (if armed) before running an intentional navigation, so
   * leaving the form never strands a duplicate entry in the user's back stack. The
   * pop targets the same URL as the current entry, so it changes history depth
   * without changing the rendered route.
   */
  const runAfterDisarm = useCallback((action: () => void) => {
    if (!sentinelArmedRef.current) {
      action();
      return;
    }
    sentinelArmedRef.current = false;
    selfPopRef.current = true;
    const handleSelfPop = () => {
      window.removeEventListener('popstate', handleSelfPop);
      selfPopRef.current = false;
      action();
    };
    window.addEventListener('popstate', handleSelfPop);
    window.history.back();
  }, []);

  // Every confirmed exit — logout, sidebar navigation, this form's own キャンセル —
  // has to disarm the sentinel first, so the provider runs it through here.
  useEffect(() => registerExitPreparer(runAfterDisarm), [registerExitPreparer, runAfterDisarm]);

  // Arm the sentinel on the first edit: a duplicate of the current entry, so the
  // first Back press pops that instead of leaving the page.
  useEffect(() => {
    if (!isDirty || sentinelArmedRef.current) return;
    sentinelArmedRef.current = true;
    window.history.pushState(null, '', window.location.href);
  }, [isDirty]);

  useEffect(() => {
    const handlePopState = () => {
      // Our own history.back() from runAfterDisarm — already accounted for.
      if (selfPopRef.current) {
        selfPopRef.current = false;
        return;
      }
      if (!sentinelArmedRef.current) return;

      if (!isDirty) {
        // The form was edited and then reverted: nothing to warn about, so let the
        // Back press the sentinel absorbed carry through to the real entry.
        sentinelArmedRef.current = false;
        selfPopRef.current = true;
        window.history.back();
        return;
      }

      // Re-arm so the stack depth stays constant however many times Back is pressed.
      window.history.pushState(null, '', window.location.href);
      confirmDiscard(() => window.history.back());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, confirmDiscard]);

  return { confirmDiscard, navigateAfterSave: runAfterDisarm };
}
