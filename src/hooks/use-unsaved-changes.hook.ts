'use client';

import { useRegisterDirtyForm } from '@/hooks/use-register-dirty-form.hook';

export interface UseUnsavedChangesReturn {
  /**
   * Call on cancel/back-link. Runs `onConfirm` immediately when the form is clean;
   * `onCancel` runs if the dialog is answered with 編集を続ける.
   */
  confirmDiscard: (onConfirm: () => void, onCancel?: () => void) => void;
}

/**
 * Guards a navigation away from a dirty form.
 *
 * | Exit path                          | Guard                                         |
 * | ---------------------------------- | --------------------------------------------- |
 * | In-page キャンセル / back link     | `confirmDiscard` → the app's discard dialog   |
 * | Sidebar / header navigation        | dirty registry → the app's discard dialog     |
 * | Header actions (e.g. logout)       | dirty registry → the app's discard dialog     |
 * | Reload, tab close, external URL    | `beforeunload` → the **browser's own** dialog |
 *
 * Every form rendered through the shared `<Form>` wrapper is already registered, so this
 * hook is only needed for the `confirmDiscard` helper on a form's own キャンセル button.
 * A form that must also survive the browser's Back button wants `useUnsavedChangesGuard`.
 *
 * A sheet calls this from outside its own `<Sheet>` and stays mounted while closed, so
 * it must pass `open && isDirty`: closing via the sheet's X/Escape/backdrop only forgets
 * the forms *inside* the sheet, and a form left dirty behind a closed sheet would keep
 * asking on every later navigation.
 *
 * The last row is the one limit that cannot be lifted: the HTML spec lets a page cancel
 * an unload but not supply its own UI, so no custom dialog is possible there.
 */
export function useUnsavedChanges(isDirty: boolean): UseUnsavedChangesReturn {
  return useRegisterDirtyForm(isDirty);
}
