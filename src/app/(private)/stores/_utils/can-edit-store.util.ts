import type { AuthUser } from '@/types/permission.type';
import { UserRole } from '@/types/permission.type';

/**
 * Y-02 edit access to a store's basic info (store-list FR-038, store-detail FR-012a,
 * store-form FR-086a): headquarters edit any store, a Staff account only the store it
 * belongs to, every other role none. Shared by the list's row action, the detail header
 * and gallery 編集, the business-settings editors and the store-map screen so all of
 * them enforce one rule (research R10). The backend still has the final say (B10).
 */
export function canEditStore(user: AuthUser | null, storeId: string | null | undefined): boolean {
  if (!user || !storeId) return false;
  if (user.role === UserRole.System || user.role === UserRole.Headquarter) return true;
  if (user.role === UserRole.Staff) return !!user.storeId && user.storeId === storeId;
  return false;
}

/** Tooltip for a disabled edit affordance — the Staff-on-another-store case reads differently */
export function editStoreDenyReason(
  user: AuthUser | null,
  storeId: string | null | undefined,
): string {
  if (user?.role === UserRole.Staff && user.storeId !== storeId) {
    return '所属店舗の基本情報のみ編集できます';
  }
  return '本部権限が必要です';
}
