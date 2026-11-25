/**
 * 所属店舗 rules for the Manager multi-store interim (Phase 1, meeting 2026-11-02 — see
 * specs/020-staff-permission-management/spec.md "Manager multi-store affiliation").
 *
 * - A **Manager**'s 所属店舗 is multi-select, and every selected store is one it manages
 *   (管轄店舗 = 所属店舗).
 * - Every other role keeps a single 所属店舗.
 * - Leaving Manager with more than one store does **not** keep any of them: the user is
 *   made to pick the one store again (decision 2026-11-10 — no auto-picked "first store").
 *
 * The API accepts `storeIds` for every role; restricting non-managers to one store is a
 * product rule the FE owns.
 */

export const MULTI_STORE_ROLE = 'manager';

export const STORE_SINGLE_ONLY_MESSAGE =
  'マネージャー以外のロールは所属店舗を1店舗のみ選択できます';
export const STORE_RESELECT_MESSAGE =
  'ロールの変更により所属店舗の選択を解除しました。所属店舗を1店舗選び直してください';

export function allowsMultipleStores(role: string | null | undefined): boolean {
  return role === MULTI_STORE_ROLE;
}

/**
 * Whether switching to `nextRole` invalidates the current store selection, i.e. the new
 * role allows only one store and more than one is selected.
 */
export function needsStoreReselection(
  nextRole: string | null | undefined,
  storeIds: readonly string[],
): boolean {
  return !allowsMultipleStores(nextRole) && storeIds.length > 1;
}

/** Store-selection error to show for the current form state, or `null` when valid. */
export function getStoreSelectionError(params: {
  role: string | null | undefined;
  isDirectStore: boolean;
  storeIds: readonly string[];
  reselectRequired: boolean;
}): string | null {
  const { role, isDirectStore, storeIds, reselectRequired } = params;
  // A Manager may hold any number of stores, including none — switching back to Manager
  // after a reset lifts the reselect demand.
  if (!isDirectStore || allowsMultipleStores(role)) return null;
  if (storeIds.length > 1) return STORE_SINGLE_ONLY_MESSAGE;
  if (reselectRequired && storeIds.length === 0) return STORE_RESELECT_MESSAGE;
  return null;
}

/** Ordered comparison — order matters because the first id becomes `storeId`. */
export function isSameStoreIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
