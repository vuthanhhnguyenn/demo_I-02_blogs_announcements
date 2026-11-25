import type { AuthUser } from '@/types/permission.type';
import { UserRole } from '@/types/permission.type';

/** Minimal shape needed from a staff record to evaluate FR-013's edit-access rule. */
interface EditableStaff {
  /** Lowercase role as returned by the real API (e.g. `staff.role` on `StaffDetailDto`). */
  role: string;
  /** First 所属店舗 id, present only for direct_store-linked staff. */
  storeId?: string | null;
  /** Every 所属店舗 id (`storeIds`) — a staff may belong to several stores. */
  storeIds?: readonly string[] | null;
}

/**
 * FR-013: headquarters can edit any account; a manager can edit only "Staff"-role
 * accounts affiliated with at least one store they manage; every other role cannot edit staff
 * accounts through this screen. Shared by the detail-page edit button, the staff
 * list's row action, and the edit route's own guard so all three enforce the same
 * rule — see specs/020-staff-permission-management/research.md #15.
 */
export function canEditStaffAccount(user: AuthUser | null, staff: EditableStaff): boolean {
  if (!user) return false;
  if (user.role === UserRole.Headquarter || user.role === UserRole.System) return true;
  if (user.role === UserRole.Manager) {
    // Only 「スタッフ」-role accounts: 職位割り当て（担当店舗分）is ○ for Manager, while
    // ロール付与・変更 and アカウント作成 are ×, so a manager never edits a peer or a 本部 account.
    if (staff.role !== 'staff') return false;

    // Store scope is the backend's call, not the FE's: `/crm/me` carries no
    // `managedStoreIds` (verified against the dev backend 2026-09-18 — the response has
    // storeId/fcCompanyId and nothing else), so `user.managedStoreIds` is always empty and
    // this check refused every target, including in-scope ones. The API already enforces
    // it — `GET /admin/staff/{id}` answers `404 E-STF-001` for a staff outside the
    // manager's stores — so a record that loaded at all is in scope. The explicit check
    // below stays for when `/crm/me` starts carrying the field.
    const managedStoreIds = user.managedStoreIds ?? [];
    if (managedStoreIds.length === 0) return true;

    // In scope when the staff shares at least one store with the manager — the same rule
    // the BE applies (`GET /admin/staff/{id}`: "staff who share at least one of its stores").
    const staffStoreIds = staff.storeIds?.length
      ? staff.storeIds
      : staff.storeId
        ? [staff.storeId]
        : [];
    return staffStoreIds.some((storeId) => managedStoreIds.includes(storeId));
  }
  return false;
}
