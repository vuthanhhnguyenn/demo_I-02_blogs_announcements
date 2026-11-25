/**
 * Authorization tables. A `Permission` is granted only when BOTH layers agree
 * (see `evaluatePermission` in `src/utils/permission.util.ts`):
 *
 * - `ROLE_PERMISSIONS` — the **role tier** from each feature's 権限マトリクス. Static,
 *   because a role's ceiling is a product decision, not per-account data, and the
 *   backend enforces the same tiers itself ("**system / headquarter / manager**" in
 *   the endpoint docs).
 * - `PERMISSION_FLAG_RULES` — the **per-position grant**, resolved at runtime from
 *   the 57 flags `/crm/me` returns (see `STAFF_PERMISSION_FLAGS`). This is the
 *   layer that is not hard-coded: a position-master edit changes what the UI
 *   offers on the next `/crm/me` fetch.
 *
 * `PAGE_PERMISSIONS` maps each route pattern to the Permission required to view it.
 * Omitting a route means any authenticated staff member can open it.
 */
import type { RoutePattern } from '@/lib/routes/routes.type';

import { Permission, type StaffPermissionFlag, UserRole } from '@/types/permission.type';

// ---------------------------------------------------------------------------
// Page-level access (route pattern → required Permission)
// ---------------------------------------------------------------------------
export const PAGE_PERMISSIONS: Partial<Record<RoutePattern, Permission>> = {
  // Staffs
  '/staffs': Permission.StaffsView,
  '/staffs/:id': Permission.StaffsView,
  '/staffs/:id/edit': Permission.StaffsEdit,
  '/staffs/create': Permission.StaffsCreate,

  // Stores
  '/stores': Permission.StoresView,
  '/stores/:id': Permission.StoresView,
  '/stores/:id/edit': Permission.StoresEdit,
  '/stores/create': Permission.StoresCreate,
  // 店舗マップ設定 (Y-02-05): opening it is the store read right — Trainer / Observer have neither
  // (FR-061). Editing is decided in-page by `canEditStore` (own store for Staff, read-only Manager).
  '/stores/map': Permission.StoresView,
  '/stores/:id/map': Permission.StoresView,

  // Positions
  '/positions': Permission.PositionsView,
  '/positions/create': Permission.PositionsCreate,
  '/positions/:id/edit': Permission.PositionsEdit,

  // Members
  '/members': Permission.MembersView,
  '/members/:id': Permission.MembersView,
  '/members/:id/edit': Permission.MembersEdit,
  '/members/blacklist': Permission.MembersBlacklistView,
  '/members/blacklist/:id': Permission.MembersBlacklistView,
  '/members/leaves': Permission.MembersLeavesView,
  '/members/leaves/:id': Permission.MembersLeavesView,
  '/members/transfers': Permission.MembersTransfersView,
  '/members/transfers/:id': Permission.MembersTransfersView,

  // Membership applications
  '/membership-applications': Permission.MembershipApplicationsView,
  '/membership-applications/:id': Permission.MembershipApplicationsView,
  '/membership-applications/create': Permission.MembershipApplicationsCreate,

  // Visit / experience management
  '/visit-experiences': Permission.VisitExperiencesView,
  '/visit-experiences/:id': Permission.VisitExperiencesView,

  // Family registrations
  '/family-registrations': Permission.FamilyRegistrationsView,
  '/family-registrations/:id': Permission.FamilyRegistrationsView,
  '/family-registrations/dashboard': Permission.FamilyRegistrationsDashboardView,

  // Contracts
  '/contracts': Permission.ContractsView,
  '/contracts/:id': Permission.ContractsView,
  '/contracts/create': Permission.ContractsCreate,
  '/contracts/:id/edit': Permission.ContractsEdit,

  // Campaigns
  '/campaigns': Permission.CampaignsView,
  '/campaigns/:id': Permission.CampaignsView,
  '/campaigns/create': Permission.CampaignsCreate,
  '/campaigns/:id/edit': Permission.CampaignsEdit,

  // Franchise companies
  '/franchise-companies': Permission.FCCompaniesView,
  '/franchise-companies/:id': Permission.FCCompaniesView,
  '/franchise-companies/create': Permission.FCCompaniesCreate,
  '/franchise-companies/:id/edit': Permission.FCCompaniesEdit,

  // Options
  '/options': Permission.OptionsView,
  '/options/:id': Permission.OptionsView,
  '/options/create': Permission.OptionsCreate,
  '/options/:id/edit': Permission.OptionsEdit,

  // Surveys
  '/surveys': Permission.SurveysView,
  '/surveys/:id': Permission.SurveysView,
  '/surveys/create': Permission.SurveysCreate,
  '/surveys/:id/edit': Permission.SurveysEdit,
  '/surveys/:id/visibility': Permission.SurveysView,
  '/surveys/responses': Permission.SurveysResponsesView,
  '/surveys/responses/:responseId': Permission.SurveysResponsesView,
  '/surveys/analytics': Permission.SurveysView,

  // Manual notifications (I-03)
  '/manual-notifications': Permission.ManualNotificationsView,
  '/manual-notifications/:id': Permission.ManualNotificationsView,
  '/manual-notifications/create': Permission.ManualNotificationsCreate,
  '/manual-notifications/:id/edit': Permission.ManualNotificationsEdit,

  // Banners
  '/banners': Permission.BannersView,
  '/banners/create': Permission.BannersCreate,
  '/banners/:id/edit': Permission.BannersEdit,

  // Blogs (I-02)
  '/blogs': Permission.BlogsView,
  '/blogs/:id': Permission.BlogsView,
  '/blogs/create': Permission.BlogsCreate,
  '/blogs/:id/edit': Permission.BlogsEdit,
  // Announcements (I-02)
  '/announcements': Permission.AnnouncementsView,
  '/announcements/:id': Permission.AnnouncementsView,
  '/announcements/create': Permission.AnnouncementsCreate,
  '/announcements/:id/edit': Permission.AnnouncementsEdit,

  // Option discounts
  '/option-discount': Permission.OptionDiscountsView,
  '/option-discount/:id': Permission.OptionDiscountsView,
  '/option-discount/create': Permission.OptionDiscountsCreate,
  '/option-discount/:id/edit': Permission.OptionDiscountsEdit,

  // Brands
  '/brands': Permission.BrandsView,
  '/brands/:id': Permission.BrandsView,

  // Lockers
  '/lockers': Permission.LockersView,
  '/lockers/:id': Permission.LockersView,
  '/lockers/create': Permission.LockersCreate,
  '/lockers/:id/edit': Permission.LockersEdit,
  '/lockers/contracts': Permission.LockersContractsView,
  '/lockers/contracts/:id': Permission.LockersContractsView,
  '/lockers/contracts/:id/edit': Permission.LockersContractsEdit,
  '/lockers/pending': Permission.LockersPendingView,

  // Lessons / Reservations (D-01)
  // View is open to every authenticated role (incl. Observer); creating a
  // schedule requires the schedule-manage permission (denies Observer).
  '/lesson-schedules': Permission.LessonsView,
  '/lesson-schedules/create': Permission.LessonsScheduleManage,

  // Lesson Content Management (D-02)
  // Viewing the list + detail is open to every authenticated role; creating a
  // master (incl. duplicate) is restricted to Headquarter/System.
  '/lessons': Permission.LessonContentsView,
  '/lessons/:id': Permission.LessonContentsView,
  '/lessons/:id/edit': Permission.LessonContentsEdit,
  '/lessons/:id/duplicate': Permission.LessonContentsCreate,
  '/lessons/create': Permission.LessonContentsCreate,

  // Exercises
  '/exercises': Permission.ExercisesView,
  '/exercises/:id': Permission.ExercisesView,
  '/exercises/create': Permission.ExercisesCreate,
  '/exercises/:id/edit': Permission.ExercisesEdit,
  '/exercise-master': Permission.ExercisesCreate,

  // Equipment
  '/equipment': Permission.EquipmentView,
  '/equipment/:id': Permission.EquipmentView,
  '/equipment/create': Permission.EquipmentCreate,
  '/equipment/:id/edit': Permission.EquipmentEdit,

  // Areas (E-02 FR-016)
  '/area-master': Permission.AreasView,

  // Controllers
  '/controllers': Permission.ControllerView,
  '/controllers/:id': Permission.ControllerView,
  '/controllers/create': Permission.ControllerCreate,
  '/controllers/:id/edit': Permission.ControllerEdit,

  // Studios (D-03)
  '/studios': Permission.StudiosView,
  '/studios/:id': Permission.StudiosView,
  '/studios/:id/edit': Permission.StudiosEdit,
  '/studios/create': Permission.StudiosCreate,

  // Training equipment
  '/training-equipment': Permission.TrainingEquipmentView,
  '/training-equipment/:id': Permission.TrainingEquipmentView,
  '/training-equipment/create': Permission.TrainingEquipmentCreate,
  '/training-equipment/:id/edit': Permission.TrainingEquipmentEdit,

  // Instructors (D-04)
  // View is open to every authenticated role (Trainer/Observer scoped server-side);
  // creating a profile requires InstructorsCreate (denies Trainer/Observer). Edit is
  // intentionally NOT page-gated here because a Trainer may edit their own profile —
  // that exception is enforced server-side and via RoleGatedButton's allowedRoles.
  '/instructors': Permission.InstructorsView,
  '/instructors/:id': Permission.InstructorsView,
  '/instructors/create': Permission.InstructorsCreate,

  // Entry / Exit management
  '/entry-exit': Permission.EntryExitView,
  '/entry-exit/history': Permission.EntryExitHistoryView,

  // Article categories
  '/article-categories': Permission.ArticleCategoriesView,
  '/article-categories/create': Permission.ArticleCategoriesCreate,
  '/article-categories/:id/edit': Permission.ArticleCategoriesEdit,

  // App Version Management (Y-05)
  '/app-versions': Permission.AppVersionsView,
  '/app-versions/:id': Permission.AppVersionsView,
  '/app-versions/create': Permission.AppVersionsCreate,
  '/app-versions/:id/edit': Permission.AppVersionsEdit,

  // App Maintenance
  '/app-maintenance': Permission.AppMaintenanceView,
  '/app-maintenance/create': Permission.AppMaintenanceCreate,
  '/app-maintenance/:id/edit': Permission.AppMaintenanceEdit,

  // Terms Document Master Management (Y-04) — Trainer has no access at all (FR-006);
  // Manager/Staff/Observer are view-only (brand-scoped server-side); create/edit/
  // new-version require Headquarter/System (FR-017)
  '/terms': Permission.TermsView,
  '/terms/:id': Permission.TermsView,
  '/terms/create': Permission.TermsCreate,
  '/terms/:id/edit': Permission.TermsEdit,
  '/terms/:id/new-version': Permission.TermsCreate,

  // Sales Management (F-01)
  '/sales': Permission.SalesView,
  '/sales/:id': Permission.SalesView,
  '/sales/register': Permission.SalesView,
  '/sales/accounting-export': Permission.SalesExport,

  // Sales — Transaction History, Receivables, Refund Management (F-01-01/02/03)
  // Refund queue viewing is open to HQ/Manager/Staff (FR-014); approve/reject is gated by
  // SalesRefundApprove (role hierarchy only, FR-004 / API-118 §2).
  '/sales/transactions': Permission.SalesTransactionsView,
  '/sales/receivables': Permission.SalesReceivablesView,
  '/sales/refunds': Permission.SalesRefundsView,

  // Routines (Y-09) — Headquarter / System only
  '/routines': Permission.RoutinesView,
  '/routines/:id': Permission.RoutinesView,
  '/routines/create': Permission.RoutinesCreate,
  '/routines/:id/edit': Permission.RoutinesEdit,

  // CRM Maintenance (Y-10) — list/detail: System + Headquarter; create/edit: System only
  '/crm-maintenance': Permission.CrmMaintenanceView,
  '/crm-maintenance/:id': Permission.CrmMaintenanceView,
  '/crm-maintenance/create': Permission.CrmMaintenanceCreate,
  '/crm-maintenance/:id/edit': Permission.CrmMaintenanceEdit,

  // Domain Master Management (Y-14) — Headquarter / System only
  '/domains': Permission.DomainsView,
};

// ---------------------------------------------------------------------------
// Role → full Permission set  (view + action)
// ---------------------------------------------------------------------------
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.System]: Object.values(Permission),

  [UserRole.Headquarter]: [
    Permission.StaffsView,
    Permission.StaffsCreate,
    Permission.StaffsEdit,
    Permission.StaffsDelete,
    Permission.StaffsInvite,
    Permission.StoresView,
    Permission.StoresCreate,
    Permission.StoresEdit,
    Permission.StoresDelete,
    Permission.StoresConfigContract,
    Permission.StoresConfigAccess,
    Permission.StoresConfigBusiness,
    Permission.StoresHistoryView,
    Permission.PositionsView,
    Permission.PositionsCreate,
    Permission.PositionsEdit,
    Permission.PositionsDelete,
    Permission.MembersView,
    Permission.MembersEdit,
    Permission.MembersDelete,
    Permission.MembersPersonalDataDelete,
    Permission.MembersSuspend,
    Permission.MembersWithdraw,
    Permission.MembersCancelWithdrawal,
    Permission.MembersTransfer,
    Permission.MembersGateStop,
    Permission.MembersForceWithdraw,
    Permission.MembersOptionContractOperate,
    Permission.MembersTestAccountSet,
    // A-01 FR-027: 手動紐付け・ロック解除 and 連携解除
    Permission.MembersAppLinkOperate,
    Permission.MembersAppLinkUnlink,
    Permission.MembersBlacklistView,
    Permission.BlacklistCreate,
    Permission.BlacklistDelete,
    Permission.MembersLeavesView,
    Permission.MembersTransfersView,
    Permission.MembersTransfersApprove,
    Permission.MembersTransfersBulkApprove,
    Permission.MembersTransfersUnlock,
    Permission.MembershipApplicationsView,
    Permission.MembershipApplicationsCreate,
    Permission.MembershipApplicationsApprove,
    Permission.MembershipApplicationsCancel,
    Permission.VisitExperiencesView,
    Permission.FamilyRegistrationsView,
    Permission.FamilyRegistrationsDashboardView,
    Permission.FamilyRegistrationsApprove,
    Permission.ContractsView,
    Permission.ContractsHistoryView,
    Permission.CampaignsView,
    Permission.CampaignsCreate,
    Permission.CampaignsEdit,
    Permission.CampaignsPromoCodeEdit,
    Permission.CampaignsPromoCodeCreate,
    Permission.CampaignsPromoCodeDelete,
    Permission.CampaignsPromoCodeExport,
    Permission.FCCompaniesView,
    Permission.FCCompaniesCreate,
    Permission.FCCompaniesEdit,
    Permission.FCCompaniesDelete,
    Permission.ContractsEdit,
    Permission.ContractsDelete,
    Permission.ContractsCreate,
    Permission.OptionsView,
    Permission.OptionsCreate,
    Permission.OptionsEdit,
    Permission.OptionsDelete,
    Permission.SurveysView,
    Permission.SurveysResponsesView,
    Permission.SurveysCreate,
    Permission.SurveysEdit,
    Permission.SurveysDelete,
    Permission.BannersView,
    Permission.BannersCreate,
    Permission.BannersEdit,
    Permission.BannersDelete,
    Permission.BannersReorder,
    Permission.BlogsView,
    Permission.BlogsCreate,
    Permission.BlogsEdit,
    Permission.BlogsPublish,
    Permission.BlogsDelete,
    Permission.BlogsRestore,
    Permission.AnnouncementsView,
    Permission.AnnouncementsCreate,
    Permission.AnnouncementsEdit,
    Permission.AnnouncementsPublish,
    Permission.AnnouncementsDelete,
    Permission.AnnouncementsRestore,
    Permission.OptionDiscountsView,
    Permission.OptionDiscountsCreate,
    Permission.OptionDiscountsEdit,
    Permission.BrandsView,
    Permission.BrandsCreate,
    Permission.BrandsEdit,
    Permission.LockersView,
    Permission.LockersCreate,
    Permission.LockersEdit,
    Permission.LockersDelete,
    Permission.LockersExport,
    Permission.LockersPendingView,
    Permission.LockersPendingExport,
    Permission.LockersContractsView,
    Permission.LockersContractsEdit,
    Permission.LockersContractsExport,
    Permission.LessonsView,
    Permission.LessonsScheduleManage,
    Permission.LessonsReservationManage,
    Permission.LessonsAttendanceManage,
    Permission.LessonsMemoManage,
    Permission.LessonsPenaltyRelease,
    Permission.LessonContentsView,
    Permission.LessonContentsCreate,
    Permission.LessonContentsEdit,
    Permission.LessonContentsDelete,
    Permission.LessonContentsHistoryView,
    Permission.ExercisesView,
    Permission.ExercisesCreate,
    Permission.ExercisesEdit,
    Permission.ExercisesDelete,
    Permission.ExercisesPublish,
    Permission.EquipmentView,
    Permission.EquipmentCreate,
    Permission.EquipmentEdit,
    Permission.EquipmentDelete,
    Permission.EquipmentExport,
    // E-02 FR-016: HQ registers, edits and deletes areas
    Permission.AreasView,
    Permission.AreasCreate,
    Permission.AreasEdit,
    Permission.AreasDelete,
    Permission.ControllerView,
    Permission.ControllerCreate,
    Permission.ControllerEdit,
    Permission.ControllerDelete,
    Permission.ControllerExport,
    Permission.StudiosView,
    Permission.StudiosCreate,
    Permission.StudiosEdit,
    Permission.StudiosDelete,
    Permission.TrainingEquipmentView,
    Permission.TrainingEquipmentCreate,
    Permission.TrainingEquipmentEdit,
    Permission.TrainingEquipmentDelete,
    Permission.TrainingEquipmentExport,
    Permission.TrainingEquipmentExerciseLinks,
    Permission.InstructorsView,
    Permission.InstructorsCreate,
    Permission.InstructorsEdit,
    Permission.InstructorsDelete,
    Permission.EntryExitView,
    Permission.EntryExitHistoryView,
    Permission.EntryExitHistoryExport,
    Permission.MembersExport,
    Permission.SurveysExport,
    Permission.ArticleCategoriesView,
    Permission.ArticleCategoriesCreate,
    Permission.ArticleCategoriesEdit,
    Permission.ArticleCategoriesDelete,
    Permission.AppVersionsView,
    Permission.AppVersionsCreate,
    Permission.AppVersionsEdit,
    Permission.AppVersionsDelete,
    Permission.AppMaintenanceView,
    Permission.TermsView,
    Permission.TermsCreate,
    Permission.TermsEdit,
    Permission.TermsDelete,
    Permission.ManualNotificationsView,
    Permission.ManualNotificationsCreate,
    Permission.ManualNotificationsEdit,
    Permission.ManualNotificationsDelete,
    Permission.ManualNotificationsApprove,
    Permission.CrmMaintenanceView,
    Permission.SalesView,
    Permission.SalesConfirm,
    Permission.SalesRefundInitiate,
    Permission.SalesLineItemAdd,
    Permission.SalesFeeAdjust,
    Permission.SalesManualRegister,
    Permission.SalesExport,
    Permission.SalesTransactionsView,
    Permission.SalesReceivablesView,
    Permission.SalesRefundsView,
    Permission.SalesBadDebtExclude,
    Permission.SalesConvenienceIssue,
    Permission.SalesUpcomingBillingConfirm,
    Permission.SalesRefundApprove,
    Permission.SalesRefundExport,
    Permission.AppMaintenanceCreate,
    Permission.AppMaintenanceEdit,
    Permission.AppMaintenanceDelete,
    Permission.RoutinesView,
    Permission.RoutinesCreate,
    Permission.RoutinesEdit,
    Permission.RoutinesDelete,
    Permission.RoutinesPublish,
    Permission.DomainsView,
    Permission.DomainsCreate,
    Permission.DomainsEdit,
    Permission.DomainsDelete,
  ],

  [UserRole.Manager]: [
    Permission.StaffsView,
    // Page-level only: grants navigation to /staffs/:id/edit. Manager may edit only
    // "Staff"-role accounts in their managed store (FR-003) — that per-resource scoping
    // is enforced server-side (GET/PATCH /crm/staffs/{id}), not by this flag.
    Permission.StaffsEdit,
    Permission.StoresView,
    // Y-02 FR-008: 変更履歴 is System / Headquarter / Manager only (027-store-detail FR-083).
    Permission.StoresHistoryView,
    Permission.MembersView,
    Permission.MembersSuspend,
    Permission.MembersWithdraw,
    Permission.MembersCancelWithdrawal,
    Permission.MembersTransfer,
    Permission.MembersGateStop,
    Permission.MembersOptionContractOperate,
    // A-01 FR-027: 手動紐付け・ロック解除 and 連携解除
    Permission.MembersAppLinkOperate,
    Permission.MembersAppLinkUnlink,
    Permission.MembersLeavesView,
    Permission.MembersTransfersView,
    // A-02: Manager holds the full transfer toolkit, but only within their 所轄店舗 scope.
    Permission.MembersTransfersApprove,
    Permission.MembersTransfersBulkApprove,
    Permission.MembersTransfersUnlock,
    Permission.MembershipApplicationsView,
    Permission.MembershipApplicationsCreate,
    Permission.MembershipApplicationsApprove,
    Permission.MembershipApplicationsCancel,
    Permission.VisitExperiencesView,
    Permission.FamilyRegistrationsView,
    Permission.FamilyRegistrationsDashboardView,
    Permission.ContractsView,
    Permission.ContractsHistoryView,
    Permission.CampaignsView,
    Permission.CampaignsPromoCodeEdit,
    Permission.CampaignsPromoCodeCreate,
    Permission.CampaignsPromoCodeDelete,
    Permission.CampaignsPromoCodeExport,
    Permission.OptionsView,
    Permission.BrandsView,
    Permission.LockersView,
    Permission.LockersCreate,
    Permission.LockersEdit,
    Permission.LockersDelete,
    Permission.LockersExport,
    Permission.LockersPendingView,
    Permission.LockersPendingExport,
    Permission.LockersContractsView,
    Permission.LockersContractsEdit,
    Permission.LockersContractsExport,
    Permission.SurveysView,
    Permission.SurveysResponsesView,
    // No SurveysCreate in Phase 1: the form creates ライフサイクル surveys only, which
    // G-04 権限マトリクス keeps HQ/System-only (the server answers 403 E-AUTH-103).
    // Manager's △ (canCreateSurvey) covers operational surveys — a Phase 2 type (FR-005);
    // grant SurveysCreate back here when the form can create them.
    Permission.BannersView,
    Permission.BlogsView,
    Permission.BlogsCreate,
    Permission.BlogsEdit,
    Permission.BlogsPublish,
    Permission.BlogsDelete,
    Permission.BlogsRestore,
    Permission.AnnouncementsView,
    Permission.AnnouncementsCreate,
    Permission.AnnouncementsEdit,
    Permission.AnnouncementsPublish,
    Permission.AnnouncementsDelete,
    Permission.AnnouncementsRestore,
    Permission.LessonsView,
    Permission.LessonsScheduleManage,
    Permission.LessonsReservationManage,
    Permission.LessonsAttendanceManage,
    Permission.LessonsMemoManage,
    Permission.LessonsPenaltyRelease,
    Permission.LessonContentsView,
    Permission.EquipmentView,
    Permission.EquipmentCreate,
    Permission.EquipmentEdit,
    Permission.EquipmentDelete,
    Permission.EquipmentExport,
    // E-02 FR-016: reference only
    Permission.AreasView,
    Permission.ControllerView,
    Permission.ControllerCreate,
    Permission.ControllerEdit,
    Permission.ControllerDelete,
    Permission.ControllerExport,
    Permission.StudiosView,
    Permission.StudiosCreate,
    Permission.StudiosEdit,
    Permission.StudiosDelete,
    Permission.InstructorsView,
    Permission.InstructorsCreate,
    Permission.InstructorsEdit,
    Permission.InstructorsDelete,
    Permission.EntryExitView,
    Permission.EntryExitHistoryView,
    Permission.EntryExitHistoryExport,
    Permission.MembersExport,
    Permission.SurveysExport,
    Permission.ArticleCategoriesView,
    Permission.SalesView,
    Permission.SalesConfirm,
    Permission.SalesRefundInitiate,
    Permission.SalesLineItemAdd,
    Permission.SalesFeeAdjust,
    Permission.SalesManualRegister,
    Permission.SalesExport,
    Permission.SalesTransactionsView,
    Permission.SalesReceivablesView,
    Permission.SalesRefundsView,
    Permission.SalesBadDebtExclude,
    Permission.SalesConvenienceIssue,
    Permission.SalesUpcomingBillingConfirm,
    Permission.SalesRefundApprove,
    Permission.SalesRefundExport,
    Permission.AppMaintenanceView,
    Permission.TermsView,
    Permission.AppVersionsView,
    Permission.ManualNotificationsView,
    Permission.ManualNotificationsCreate,
    Permission.ManualNotificationsEdit,
    Permission.ManualNotificationsDelete,
  ],

  [UserRole.Staff]: [
    // Y-01 permission matrix: スタッフ一覧・参照 = ○ 自分のみ (self only). StaffsView
    // must stay granted so /staffs and /staffs/:id don't 403 — server-side scoping
    // (GET /crm/staffs, GET /crm/staffs/{id}) narrows the actual rows to the caller's
    // own record. StaffsEdit stays denied: Staff may only reference their own account,
    // not edit it via this screen (FR-013).
    Permission.StaffsView,
    // Permission.StaffsEdit,
    Permission.StoresView,
    Permission.StoresEdit,
    Permission.StoresConfigBusiness,
    Permission.MembersView,
    Permission.MembersSuspend,
    Permission.MembersWithdraw,
    Permission.MembersCancelWithdrawal,
    Permission.MembersTransfer,
    Permission.MembersGateStop,
    Permission.MembersOptionContractOperate,
    // A-01 FR-027: 手動紐付け・ロック解除 only — 連携解除 is Manager and above
    Permission.MembersAppLinkOperate,
    Permission.MembersLeavesView,
    Permission.MembersTransfersView,
    // A-02: Staff may approve/reject, but only their own store's side at the current stage —
    // enforced row-by-row by `canActOnTransfer`. No bulk approve, no 手動解除.
    Permission.MembersTransfersApprove,
    Permission.MembershipApplicationsView,
    // C-01: 承認・否認/管理画面入会 are 職位に依る — role tier only opens the door here;
    // PERMISSION_FLAG_RULES (canCreateProxyApplication / canApproveApplication) decides
    // per-staff via evaluatePermission's position-flag layer.
    Permission.MembershipApplicationsCreate,
    Permission.MembershipApplicationsApprove,
    // 入会取り消し is separate and unconditional for Staff (store-scoped).
    Permission.MembershipApplicationsCancel,
    Permission.VisitExperiencesView,
    Permission.FamilyRegistrationsView,
    Permission.FamilyRegistrationsDashboardView,
    Permission.ContractsView,
    Permission.CampaignsView,
    Permission.CampaignsPromoCodeEdit,
    Permission.CampaignsPromoCodeCreate,
    Permission.CampaignsPromoCodeDelete,
    Permission.FCCompaniesView,
    Permission.OptionsView,
    Permission.BrandsView,
    Permission.LockersView,
    Permission.LockersCreate,
    Permission.LockersEdit,
    Permission.LockersDelete,
    Permission.LockersExport,
    Permission.LockersPendingView,
    Permission.LockersPendingExport,
    Permission.LockersContractsView,
    Permission.LockersContractsEdit,
    Permission.LockersContractsExport,
    Permission.SurveysView,
    Permission.SurveysResponsesView,
    Permission.SurveysExport,
    Permission.BannersView,
    Permission.BlogsView,
    Permission.BlogsCreate,
    Permission.BlogsEdit,
    Permission.BlogsPublish,
    Permission.AnnouncementsView,
    Permission.AnnouncementsCreate,
    Permission.AnnouncementsEdit,
    Permission.AnnouncementsPublish,
    Permission.LessonsView,
    Permission.LessonsScheduleManage,
    Permission.LessonsReservationManage,
    Permission.LessonsAttendanceManage,
    Permission.LessonsMemoManage,
    Permission.LessonsPenaltyRelease,
    Permission.LessonContentsView,
    Permission.EquipmentView,
    Permission.EquipmentCreate,
    Permission.EquipmentEdit,
    Permission.EquipmentDelete,
    Permission.EquipmentExport,
    // E-02 FR-016: reference only
    Permission.AreasView,
    Permission.ControllerView,
    Permission.ControllerCreate,
    Permission.ControllerEdit,
    Permission.ControllerDelete,
    Permission.ControllerExport,
    Permission.StudiosView,
    Permission.StudiosCreate,
    Permission.StudiosEdit,
    Permission.TrainingEquipmentView,
    Permission.TrainingEquipmentCreate,
    Permission.TrainingEquipmentEdit,
    Permission.TrainingEquipmentExport,
    Permission.InstructorsView,
    Permission.InstructorsCreate,
    Permission.InstructorsEdit,
    Permission.InstructorsDelete,
    Permission.EntryExitView,
    // B-01 権限マトリクス: 入退館履歴参照 = △ 所属店舗・権限要, ログCSV出力 = △ 権限要 —
    // both position-gated, so the role tier opens the door and canViewGateLog /
    // canExportGateLogCsv decide per staff.
    Permission.EntryExitHistoryView,
    Permission.EntryExitHistoryExport,
    Permission.ArticleCategoriesView,
    Permission.TermsView,
    Permission.ManualNotificationsView,
    Permission.ManualNotificationsCreate,
    Permission.ManualNotificationsEdit,
    Permission.ManualNotificationsDelete,
    Permission.AppVersionsView,
    Permission.SalesView,
    // F-01 権限マトリクス: 請求確定 / 請求確定後変更 / 会費調整 / 翌月請求予定確認 are all
    // △ 職位マスター許可者のみ — PERMISSION_FLAG_RULES (canConfirmBilling / canAdjustFee)
    // narrows them per staff.
    Permission.SalesConfirm,
    Permission.SalesRefundInitiate,
    Permission.SalesLineItemAdd,
    Permission.SalesFeeAdjust,
    Permission.SalesManualRegister,
    Permission.SalesTransactionsView,
    Permission.SalesReceivablesView,
    Permission.SalesRefundsView,
    Permission.SalesConvenienceIssue,
    Permission.SalesUpcomingBillingConfirm,
    Permission.AppMaintenanceView,
  ],

  // Trainer: own-session scope. Can manage their schedules/reservations/
  // attendance/memos but NOT release penalties (D-01 matrix). Instructor
  // self-edit is granted dynamically via RoleGatedButton's allowedRoles,
  // not this static permission (InstructorsEdit stays HQ/Manager/Staff-only).
  [UserRole.Trainer]: [
    Permission.LessonsView,
    Permission.LessonsScheduleManage,
    Permission.LessonsReservationManage,
    Permission.LessonsAttendanceManage,
    Permission.LessonsMemoManage,
    Permission.LessonContentsView,
    Permission.StudiosView,
    Permission.BannersView,
    Permission.InstructorsView,
    // 回答データ only, via URL (no sidebar entry yet): the BFF narrows it to counseling answers of
    // the members booked on the trainer's own sessions (G-04 権限表 個別回答の参照 △).
    Permission.SurveysResponsesView,
  ],

  // Observer: read-only. May view schedules but performs no mutations.
  [UserRole.Observer]: [
    Permission.MembersView,
    Permission.MembersLeavesView,
    Permission.MembersTransfersView,
    Permission.MembershipApplicationsView,
    Permission.VisitExperiencesView,
    Permission.FamilyRegistrationsView,
    Permission.FamilyRegistrationsDashboardView,
    Permission.LockersView,
    Permission.LockersPendingView,
    Permission.LockersPendingExport,
    // E-01 matrix: 閲覧専任 reads 契約一覧 / 契約詳細 (no edit, no contract CSV — plan D13)
    Permission.LockersContractsView,
    Permission.LessonsView,
    Permission.LessonContentsView,
    Permission.EquipmentView,
    Permission.EquipmentExport,
    // E-02 FR-016: reference only
    Permission.AreasView,
    Permission.ControllerExport,
    Permission.StudiosView,
    Permission.ControllerView,
    Permission.TrainingEquipmentView,
    Permission.TrainingEquipmentExport,
    Permission.BannersView,
    Permission.BlogsView,
    Permission.AnnouncementsView,
    Permission.EntryExitView,
    Permission.EntryExitHistoryView,
    Permission.ArticleCategoriesView,
    Permission.AppMaintenanceView,
    Permission.InstructorsView,
    Permission.TermsView,
    Permission.AppVersionsView,
    Permission.ManualNotificationsView,
  ],
};

// ---------------------------------------------------------------------------
// Position-level access (Permission → backend permission flags)
// ---------------------------------------------------------------------------
/**
 * Maps the app's fine-grained `Permission` vocabulary onto the backend's 51
 * position flags.
 *
 * Semantics: **any** of the listed flags grants the permission (all current
 * entries with more than one flag are genuine alternatives, e.g. a locker
 * contract can be edited by facility editors *or* by locker-contract managers).
 *
 * A `Permission` absent from this table has no backend flag behind it — those
 * stay governed by `ROLE_PERMISSIONS` alone (master data such as brands, app
 * versions, banner ordering: the flag catalogue has no equivalent).
 *
 * Keep this table honest: adding a wrong entry silently hides working UI, and
 * omitting one silently leaves it ungated. Entries marked `// ~` are the ones
 * inferred from the flag's Japanese label rather than from an explicit mapping
 * in the API contract — verify those against the position master before relying
 * on them for a release.
 */
export const PERMISSION_FLAG_RULES: Partial<Record<Permission, readonly StaffPermissionFlag[]>> = {
  // --- 会員管理 -------------------------------------------------------------
  [Permission.MembersView]: ['canViewMember'],
  [Permission.MembersEdit]: ['canEditMember'],
  [Permission.MembersTransfer]: ['canApplyTransferSuspension'],
  [Permission.MembersSuspend]: ['canApplyTransferSuspension', 'canSetTemporaryRecess'],
  [Permission.MembersWithdraw]: ['canApplyTransferSuspension'], // ~ 退会申請は申請系フラグ配下
  [Permission.MembersCancelWithdrawal]: ['canCancelWithdrawal'],
  [Permission.MembersForceWithdraw]: ['canForceWithdrawal'],
  [Permission.MembersPersonalDataDelete]: ['canAnonymizeMember'],
  [Permission.MembersDelete]: ['canAnonymizeMember'],
  [Permission.MembersOptionContractOperate]: ['canEditMember'], // ~ 契約編集の一部
  [Permission.MembersLeavesView]: ['canViewMember'],
  [Permission.MembersBlacklistView]: ['canViewMember'],
  [Permission.MembersExport]: ['canExportMemberCsv'],

  // --- 移籍 ---------------------------------------------------------------
  [Permission.MembersTransfersView]: ['canViewMember'],
  [Permission.MembersTransfersApprove]: ['canApproveTransfer'],
  [Permission.MembersTransfersBulkApprove]: ['canApproveTransfer'],
  [Permission.MembersTransfersUnlock]: ['canApproveTransfer'],

  // --- 入退館 -------------------------------------------------------------
  [Permission.EntryExitView]: ['canViewGateLog'],
  [Permission.EntryExitHistoryView]: ['canViewGateLog'],
  [Permission.EntryExitHistoryExport]: ['canExportGateLogCsv'],
  [Permission.MembersGateStop]: ['canEditGateSetting'],

  // --- 入会申込 -----------------------------------------------------------
  [Permission.MembershipApplicationsView]: ['canViewApplication'],
  [Permission.MembershipApplicationsApprove]: ['canApproveApplication'],
  [Permission.MembershipApplicationsCancel]: ['canCancelApplication'],
  [Permission.MembershipApplicationsCreate]: ['canCreateProxyApplication'],
  [Permission.VisitExperiencesView]: ['canManageTrialVisit'],

  // --- 家族登録 (入会申込の一種) ------------------------------------------
  [Permission.FamilyRegistrationsView]: ['canViewApplication'],
  [Permission.FamilyRegistrationsDashboardView]: ['canViewApplication'],
  [Permission.FamilyRegistrationsApprove]: ['canApproveApplication'],

  // --- レッスン・予約 (D-01) ---------------------------------------------
  [Permission.LessonsView]: ['canViewLessonReservation'],
  [Permission.LessonsReservationManage]: ['canManageLessonReservation'],
  [Permission.LessonsAttendanceManage]: ['canManageLessonReservation'],
  [Permission.LessonsPenaltyRelease]: ['canManageLessonReservation'],
  [Permission.LessonsMemoManage]: ['canManageLessonReservation'],
  [Permission.LessonsScheduleManage]: ['canManageLessonSchedule'],

  // --- レッスンコンテンツ (D-02) -----------------------------------------
  // LessonContentsView: none — API-111 authorizes reads by role alone (every CRM role, Trainer
  // included). `canViewContent` is the I-03 news / blog flag, and Trainer positions hold neither it
  // nor `canManageLessonMaster`, which greyed the menu out for them (CRM UT D-02 No5).
  [Permission.LessonContentsCreate]: ['canManageLessonMaster'],
  [Permission.LessonContentsEdit]: ['canManageLessonMaster'],
  [Permission.LessonContentsDelete]: ['canManageLessonMaster'],
  [Permission.LessonContentsHistoryView]: ['canViewContent', 'canManageLessonMaster'],

  // --- インストラクター (D-04) -------------------------------------------
  [Permission.InstructorsView]: ['canManageTrainerProfile', 'canEditOwnTrainerProfile'],
  [Permission.InstructorsCreate]: ['canManageTrainerProfile'],
  [Permission.InstructorsEdit]: ['canManageTrainerProfile', 'canEditOwnTrainerProfile'],
  [Permission.InstructorsDelete]: ['canDeleteTrainerProfile'],

  // --- スタジオ (D-03) ---------------------------------------------------
  // StudiosView: none — API-110 §6.6 authorizes list / detail by role alone (Trainer / Observer
  // included); the two flags gated it off for Trainer positions, which hold neither.
  [Permission.StudiosCreate]: ['canManageStudioMaster'],
  [Permission.StudiosEdit]: ['canManageStudioMaster'],
  [Permission.StudiosDelete]: ['canDeleteStudioMaster'],

  // --- 設備 (equipment / controller / training equipment) ----------------
  [Permission.EquipmentView]: ['canViewFacility'],
  [Permission.EquipmentCreate]: ['canEditFacility'],
  [Permission.EquipmentEdit]: ['canEditFacility'],
  [Permission.EquipmentDelete]: ['canEditFacility'],
  [Permission.EquipmentExport]: ['canViewFacility'],
  [Permission.ControllerView]: ['canViewFacility'],
  [Permission.ControllerCreate]: ['canEditFacility'],
  [Permission.ControllerEdit]: ['canEditFacility'],
  [Permission.ControllerDelete]: ['canEditFacility'],
  [Permission.ControllerExport]: ['canViewFacility'],
  [Permission.TrainingEquipmentView]: ['canViewFacility'],
  [Permission.TrainingEquipmentCreate]: ['canEditFacility'],
  [Permission.TrainingEquipmentEdit]: ['canEditFacility'],
  [Permission.TrainingEquipmentDelete]: ['canEditFacility'],
  [Permission.TrainingEquipmentExport]: ['canViewFacility'],
  [Permission.TrainingEquipmentExerciseLinks]: ['canEditFacility'],

  // --- ロッカー -----------------------------------------------------------
  // None: API-100 §6.6 / API-101 §8.1 authorize lockers by role and store scope only (no
  // position flag), so `ROLE_PERMISSIONS` alone decides — E-01 マトリクス gives Staff ○.

  // --- 売上・請求 (F-01) -------------------------------------------------
  [Permission.SalesView]: ['canViewSales'],
  [Permission.SalesTransactionsView]: ['canViewSales'],
  [Permission.SalesReceivablesView]: ['canViewSales'],
  [Permission.SalesRefundsView]: ['canViewSales'],
  [Permission.SalesExport]: ['canExportAccountingCsv'],
  // FR-020 / API-119 §11: HQ / Manager / System by role — not tied to the accounting-CSV capability
  [Permission.SalesRefundExport]: ['canViewSales'],
  [Permission.SalesLineItemAdd]: ['canEditSales'],
  [Permission.SalesConvenienceIssue]: ['canEditSales'],
  [Permission.SalesFeeAdjust]: ['canAdjustFee'],
  // SalesBadDebtExclude stays role-only (F-01 権限マトリクス, Y-01 v2.4 貸倒対象外指定, API-117
  // §9.1): canExemptDelinquency is A-01 FR-016 自社落ち度未納除外 (API-094), not this action
  [Permission.SalesConfirm]: ['canConfirmBilling'],
  [Permission.SalesUpcomingBillingConfirm]: ['canConfirmBilling'],
  [Permission.SalesManualRegister]: ['canAddManualBilling'],
  // SalesRefundInitiate / SalesRefundApprove stay role-only (F-01 FR-004, API-118 §2 #4/#5/#7):
  // canExecuteRefund gates only 実行記録 (API-118 §12), which follows the BE's `editableActions`

  // --- キャンペーン / プロモコード ---------------------------------------
  [Permission.CampaignsView]: ['canViewPromotion'],
  [Permission.CampaignsCreate]: ['canManagePromotion'],
  [Permission.CampaignsEdit]: ['canManagePromotion'],
  [Permission.CampaignsPromoCodeCreate]: ['canManagePromotion'],
  [Permission.CampaignsPromoCodeEdit]: ['canManagePromotion'],
  [Permission.CampaignsPromoCodeDelete]: ['canManagePromotion'],
  [Permission.CampaignsPromoCodeExport]: ['canViewPromotion'],

  // --- アンケート ---------------------------------------------------------
  [Permission.SurveysView]: ['canViewContent', 'canCreateSurvey'],
  // SurveysResponsesView has no flag rule on purpose: G-04 権限表 grants 個別回答の参照 by role only
  // (Trainer △ 担当予約者のみ), the backend gates it by role + booked-member scope, and a Trainer's
  // position carries neither canViewContent nor canCreateSurvey.
  [Permission.SurveysCreate]: ['canCreateSurvey'],
  [Permission.SurveysEdit]: ['canCreateSurvey'],
  [Permission.SurveysDelete]: ['canCreateSurvey'],
  [Permission.SurveysExport]: ['canExportSurveyCsv'],

  // --- コンテンツ (種目 / ルーティン / バナー / 記事カテゴリ) -------------
  [Permission.ExercisesView]: ['canViewContent'],
  [Permission.ExercisesCreate]: ['canManageContent'],
  [Permission.ExercisesEdit]: ['canManageContent'],
  [Permission.ExercisesDelete]: ['canManageContent'],
  [Permission.ExercisesPublish]: ['canManageContent'],
  [Permission.RoutinesView]: ['canViewContent'],
  [Permission.RoutinesCreate]: ['canManageContent'],
  [Permission.RoutinesEdit]: ['canManageContent'],
  [Permission.RoutinesDelete]: ['canManageContent'],
  [Permission.RoutinesPublish]: ['canManageContent'],
  [Permission.BannersView]: ['canViewContent'],
  [Permission.BannersCreate]: ['canManageContent'],
  [Permission.BannersEdit]: ['canManageContent'],
  [Permission.BannersDelete]: ['canManageContent'],
  [Permission.BannersReorder]: ['canManageContent'],
  [Permission.BlogsView]: ['canViewContent'],
  [Permission.BlogsCreate]: ['canManageContent'],
  [Permission.BlogsEdit]: ['canManageContent'],
  [Permission.BlogsPublish]: ['canManageContent'],
  [Permission.BlogsDelete]: ['canManageContent'],
  [Permission.BlogsRestore]: ['canManageContent'],
  [Permission.AnnouncementsView]: ['canViewContent'],
  [Permission.AnnouncementsCreate]: ['canManageContent'],
  [Permission.AnnouncementsEdit]: ['canManageContent'],
  [Permission.AnnouncementsPublish]: ['canManageContent'],
  [Permission.AnnouncementsDelete]: ['canManageContent'],
  [Permission.AnnouncementsRestore]: ['canManageContent'],
  [Permission.ArticleCategoriesView]: ['canViewContent'],
  [Permission.ArticleCategoriesCreate]: ['canManageContent'],
  [Permission.ArticleCategoriesEdit]: ['canManageContent'],
  [Permission.ArticleCategoriesDelete]: ['canManageContent'],

  // --- お知らせ・メンテナンス通知 -----------------------------------------
  [Permission.AppMaintenanceCreate]: ['canManageNotification'],
  [Permission.AppMaintenanceEdit]: ['canManageNotification'],
  [Permission.AppMaintenanceDelete]: ['canManageNotification'],
  [Permission.CrmMaintenanceNotify]: ['canManageNotification'],

  // --- 組織 (スタッフ / 職位 / 店舗設定) ---------------------------------
  [Permission.StaffsView]: ['canViewStaff'],
  [Permission.StaffsCreate]: ['canManageStaff'],
  // NOT flag-gated. `StaffsEdit` is only ever read as the page permission for
  // `/staffs/:id/edit`, and Y-01's 権限マトリクス grants 職位割り当て（担当店舗分）to Manager
  // with a plain ○ — no 「職位による」 qualifier, unlike the CSV出力 row that does carry one.
  // Requiring `canManageStaff` here 403'd every Manager whose 職位 lacks the flag (all of
  // them in the dev master), so the row the matrix calls ○ was unreachable (TC-014/TC-034).
  // Per-resource scoping still applies — `canEditStaffAccount` narrows the Manager to
  // Staff-role accounts in their managed stores, and the backend enforces it again.
  // [Permission.StaffsEdit]: ['canManageStaff'],
  [Permission.StaffsDelete]: ['canManageStaff'],
  [Permission.StaffsInvite]: ['canManageStaff'],
  [Permission.PositionsView]: ['canManagePosition', 'canViewStaff'],
  [Permission.PositionsCreate]: ['canManagePosition'],
  [Permission.PositionsEdit]: ['canManagePosition'],
  [Permission.PositionsDelete]: ['canManagePosition'],
  // 店舗設定 is split per section on the live API; `canManageStoreSetting` stays as
  // the blanket grant, with the finer flags as alternatives.
  [Permission.StoresEdit]: ['canManageStoreSetting', 'canEditStoreBasicInfo', 'canEditStorePhoto'],
  [Permission.StoresConfigContract]: ['canManageStoreSetting'],
  [Permission.StoresConfigAccess]: ['canManageStoreSetting', 'canEditGateSetting'],
  [Permission.StoresConfigBusiness]: ['canManageStoreSetting', 'canEditStoreBusinessHours'],

  // --- 規約ドキュメント (Y-04) -------------------------------------------
  [Permission.TermsView]: ['canViewTermsDocuments'],
  [Permission.TermsCreate]: ['canManageTermsDocuments'],
  [Permission.TermsEdit]: ['canManageTermsDocuments'],
  [Permission.TermsDelete]: ['canManageTermsDocuments'],
};

/**
 * Roles whose `Permission` grants are not narrowed by `PERMISSION_FLAG_RULES`.
 *
 * `system` is the platform superuser — it is the role that maintains the position
 * master itself, so gating it on a position's flags risks locking the only account
 * that could fix a bad position out of the screen that fixes it.
 */
export const FLAG_EXEMPT_ROLES: readonly UserRole[] = [UserRole.System];
