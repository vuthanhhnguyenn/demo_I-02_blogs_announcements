// Holds ephemeral UI state (every mounted form's dirty flag) that has to be shared
// between the forms and the app chrome that navigates away from them.
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { DiscardChangesDialog } from '@/components/common/discard-changes-dialog';

/** Scope every form outside a sheet/dialog belongs to. */
export const ROOT_SCOPE_ID = 0;

export type ScopeId = number;

/** Narrows the dirty check to one form or one sheet/dialog subtree. Omit for "anything at all". */
export interface DiscardTarget {
  formId?: number;
  scopeId?: ScopeId;
}

interface NavigationBlockerContextValue {
  /**
   * Adds or removes a form from the dirty registry. Keyed per form, so a sheet form
   * opened on top of a page form never clobbers it — the previous single-blocker ref
   * did, and its unmount cleanup then left the page form unguarded.
   */
  setFormDirty: (formId: number, scopeId: ScopeId | null) => void;
  /** Registers a sheet/dialog subtree so `DiscardTarget.scopeId` can address it. */
  registerScope: (scopeId: ScopeId, parentScopeId: ScopeId) => () => void;
  isDirty: (target?: DiscardTarget) => boolean;
  /**
   * Runs `action` unless the targeted form(s) still hold unsaved edits — then the
   * app's discard dialog asks first and the action is parked until it is answered.
   * `onCancel` runs when the user answers 編集を続ける, for a caller that has already
   * moved something (e.g. a header selector) and must put it back.
   */
  confirmDiscard: (action: () => void, target?: DiscardTarget, onCancel?: () => void) => void;
  /**
   * Navigates like `router.push`, but through `confirmDiscard`.
   *
   * App-chrome navigation (sidebar, header) must go through this instead of
   * `router.push`: Next's App Router exposes no navigation-blocking API, so an
   * unsaved-changes guard is only possible if the navigators opt in.
   */
  guardedPush: (href: string) => void;
  /**
   * Runs an irreversible app-chrome action (e.g. logout) through `confirmDiscard`.
   *
   * Kept separate from `guardedPush` only for readability — both consult the same
   * registry. Logout needs it because session invalidation must not race the
   * browser's native beforeunload prompt: cancelling that prompt could not undo the
   * logout the action had already performed.
   */
  guardedAction: (action: () => void) => void;
  /**
   * Lets a form interpose on an exit the user already confirmed — used by
   * `useUnsavedChangesGuard` to drop its back-button sentinel history entry before
   * the real navigation happens. Returns a disposer that only clears the preparer if
   * it is still the registered one, so a page unmounting after its successor mounted
   * cannot strand the successor without a preparer. Only one is ever needed: the
   * sentinel exists solely for full-page forms, one of which is mounted at a time.
   */
  registerExitPreparer: (prepare: (proceed: () => void) => void) => () => void;
}

const NavigationBlockerContext = createContext<NavigationBlockerContextValue | null>(null);

/** Nearest enclosing sheet/dialog, or the root for a plain page form. */
const DirtyFormScopeContext = createContext<ScopeId>(ROOT_SCOPE_ID);

let nextId = 1;
/** Ids are only ever compared, never persisted, so a module counter is enough. */
export function allocateId(): number {
  nextId += 1;
  return nextId;
}

export function NavigationBlockerProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();

  /** formId → the scope the form is mounted in. Absent means the form is clean. */
  const dirtyFormsRef = useRef(new Map<number, ScopeId>());
  /** scopeId → parent scopeId, so a nested sheet's forms still count for the root. */
  const scopeParentsRef = useRef(new Map<ScopeId, ScopeId>());
  /** Mirrors `dirtyFormsRef.size > 0` into render, to drive the beforeunload listener. */
  const [anyDirty, setAnyDirty] = useState(false);

  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const exitPreparerRef = useRef<((proceed: () => void) => void) | null>(null);
  /** Which forms the open dialog is asking about, so confirming can forget exactly those. */
  const pendingTargetRef = useRef<DiscardTarget | undefined>(undefined);
  const pendingCancelRef = useRef<(() => void) | undefined>(undefined);

  const setFormDirty = useCallback((formId: number, scopeId: ScopeId | null) => {
    if (scopeId === null) {
      dirtyFormsRef.current.delete(formId);
    } else {
      dirtyFormsRef.current.set(formId, scopeId);
    }
    setAnyDirty(dirtyFormsRef.current.size > 0);
  }, []);

  const registerScope = useCallback((scopeId: ScopeId, parentScopeId: ScopeId) => {
    scopeParentsRef.current.set(scopeId, parentScopeId);
    return () => {
      scopeParentsRef.current.delete(scopeId);
    };
  }, []);

  /** Walks the scope chain upwards: a form in a nested sheet belongs to every scope above it. */
  const isWithinScope = useCallback((scopeId: ScopeId, ancestorId: ScopeId) => {
    let current: ScopeId | undefined = scopeId;
    // Bounded by the scope chain depth; a scope is only ever its own ancestor at the root.
    while (current !== undefined) {
      if (current === ancestorId) return true;
      current = scopeParentsRef.current.get(current);
    }
    return false;
  }, []);

  /** Does one registered form fall under `target`? No target means "any form at all". */
  const matchesTarget = useCallback(
    (formId: number, scopeId: ScopeId, target?: DiscardTarget) => {
      if (target?.formId !== undefined) return formId === target.formId;
      if (target?.scopeId !== undefined && target.scopeId !== ROOT_SCOPE_ID) {
        return isWithinScope(scopeId, target.scopeId);
      }
      return true;
    },
    [isWithinScope],
  );

  const isDirty = useCallback(
    (target?: DiscardTarget) => {
      for (const [formId, scopeId] of dirtyFormsRef.current) {
        if (matchesTarget(formId, scopeId, target)) return true;
      }
      return false;
    },
    [matchesTarget],
  );

  /**
   * Forgets the forms the user has just chosen to discard, so nothing asks about
   * them a second time — in particular the browser's own unload prompt, which
   * would otherwise repeat the question the app's dialog just answered.
   *
   * Scoped to the target: discarding a sheet's edits must leave a dirty page form
   * behind it still guarded. Assumes the confirmed action leaves the form (unmount,
   * navigation, or reset); a form that stays mounted and dirty re-registers as soon
   * as its `isDirty` toggles again.
   */
  const forgetDirty = useCallback(
    (target?: DiscardTarget) => {
      for (const [formId, scopeId] of dirtyFormsRef.current) {
        if (matchesTarget(formId, scopeId, target)) dirtyFormsRef.current.delete(formId);
      }
      setAnyDirty(dirtyFormsRef.current.size > 0);
    },
    [matchesTarget],
  );

  /** Always routed through the exit preparer, so the sentinel entry is dropped either way. */
  const runExit = useCallback((action: () => void) => {
    const prepare = exitPreparerRef.current;
    if (prepare) {
      prepare(action);
    } else {
      action();
    }
  }, []);

  const confirmDiscard = useCallback(
    (action: () => void, target?: DiscardTarget, onCancel?: () => void) => {
      if (!isDirty(target)) {
        runExit(action);
        return;
      }
      // A dialog is already up: keep the exit the user is being asked about rather
      // than silently swapping it for a newer one.
      if (pendingActionRef.current) return;
      pendingActionRef.current = action;
      pendingTargetRef.current = target;
      pendingCancelRef.current = onCancel;
      setDiscardDialogOpen(true);
    },
    [isDirty, runExit],
  );

  const handleDiscardConfirm = useCallback(() => {
    setDiscardDialogOpen(false);
    // Detach before running, so an exit that re-enters the provider starts clean.
    const action = pendingActionRef.current;
    const target = pendingTargetRef.current;
    pendingActionRef.current = null;
    pendingTargetRef.current = undefined;
    pendingCancelRef.current = undefined;
    forgetDirty(target);
    if (action) runExit(action);
  }, [forgetDirty, runExit]);

  const handleDiscardCancel = useCallback(() => {
    setDiscardDialogOpen(false);
    const onCancel = pendingCancelRef.current;
    pendingActionRef.current = null;
    pendingTargetRef.current = undefined;
    pendingCancelRef.current = undefined;
    onCancel?.();
  }, []);

  const guardedPush = useCallback(
    (href: string) => confirmDiscard(() => router.push(href)),
    [confirmDiscard, router],
  );

  const guardedAction = useCallback(
    (action: () => void) => confirmDiscard(action),
    [confirmDiscard],
  );

  const registerExitPreparer = useCallback((prepare: (proceed: () => void) => void) => {
    exitPreparerRef.current = prepare;
    return () => {
      if (exitPreparerRef.current === prepare) exitPreparerRef.current = null;
    };
  }, []);

  // Reload / tab close / external URL — the browser's own confirmation only, since the
  // HTML spec lets a page cancel an unload but not supply its own UI. Nothing is
  // subscribed while every form is clean.
  useEffect(() => {
    if (!anyDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Read the registry rather than `anyDirty`: a discard confirmed in this same
      // task empties it synchronously, while the state update that unsubscribes this
      // listener has not been committed yet — and logout's hard redirect is already
      // on its way. `anyDirty` only decides whether to subscribe at all.
      if (dirtyFormsRef.current.size === 0) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [anyDirty]);

  const value = useMemo(
    () => ({
      setFormDirty,
      registerScope,
      isDirty,
      confirmDiscard,
      guardedPush,
      guardedAction,
      registerExitPreparer,
    }),
    [
      setFormDirty,
      registerScope,
      isDirty,
      confirmDiscard,
      guardedPush,
      guardedAction,
      registerExitPreparer,
    ],
  );

  return (
    <NavigationBlockerContext.Provider value={value}>
      {children}
      {/* One dialog for the whole app: rendered above any sheet it was opened from. */}
      <DiscardChangesDialog
        open={discardDialogOpen}
        onOpenChange={(open) => !open && handleDiscardCancel()}
        onCancel={handleDiscardCancel}
        onConfirm={handleDiscardConfirm}
      />
    </NavigationBlockerContext.Provider>
  );
}

export function useNavigationBlocker(): NavigationBlockerContextValue {
  const context = useContext(NavigationBlockerContext);
  if (!context) {
    throw new Error('useNavigationBlocker must be used within a NavigationBlockerProvider');
  }
  return context;
}

/**
 * Same context, but tolerates being outside the provider — the public auth pages render
 * forms without the private layout, and an unguarded form there is correct, not an error.
 */
export function useOptionalNavigationBlocker(): NavigationBlockerContextValue | null {
  return useContext(NavigationBlockerContext);
}

export function useDirtyFormScope(): ScopeId {
  return useContext(DirtyFormScopeContext);
}

/** Opens a scope for one sheet/dialog subtree, so it can guard only its own forms. */
export function DirtyFormScopeProvider({
  scopeId,
  children,
}: Readonly<{ scopeId: ScopeId; children: React.ReactNode }>) {
  const context = useOptionalNavigationBlocker();
  const parentScopeId = useDirtyFormScope();
  const { registerScope } = context ?? {};

  useEffect(() => {
    if (!registerScope) return;
    return registerScope(scopeId, parentScopeId);
  }, [registerScope, scopeId, parentScopeId]);

  return (
    <DirtyFormScopeContext.Provider value={scopeId}>{children}</DirtyFormScopeContext.Provider>
  );
}
