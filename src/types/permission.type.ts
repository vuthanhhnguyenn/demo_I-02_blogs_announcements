import type { CrmMeStoreDto } from '@/lib/api-real/types.gen';

/**
 * CRM staff roles.
 *
 * Values are the **wire values** of `CrmMeResponseDto.role` / the `role` field of
 * `crm/login` — lowercase, exactly as the backend spells them. The enum *keys* are
 * ours (PascalCase reads better at call sites); the values are the API's and must
 * never be re-cased on the way in. Screens that show a human label map from the
 * enum themselves (see `ROLE_LABEL` in `app-header.tsx`).
 */
export enum UserRole {
  System = 'system',
  Headquarter = 'headquarter',
  Manager = 'manager',
  Staff = 'staff',
  Trainer = 'trainer',
  Observer = 'observer',
}

/** Narrows an arbitrary string (JWT claim, query param, mock row) to a known role. */
export function parseUserRole(value: string | null | undefined): UserRole | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return (Object.values(UserRole) as string[]).includes(normalized)
    ? (normalized as UserRole)
    : null;
}

/**
 * Fine-grained permissions grouped by screen/resource.
 * Format: "<resource>.<action>"
 * Extend this enum as new features are added.
 */
export enum Permission {
  // -------------------------------------------------------------------------
  // Staffs
  // -------------------------------------------------------------------------
  StaffsView = 'staffs.view',
  StaffsCreate = 'staffs.create',
  StaffsEdit = 'staffs.edit',
  StaffsDelete = 'staffs.delete',
  StaffsInvite = 'staffs.invite',

  // -------------------------------------------------------------------------
  // Stores
  // -------------------------------------------------------------------------
  StoresView = 'stores.view',
  StoresCreate = 'stores.create',
  StoresEdit = 'stores.edit',
  StoresDelete = 'stores.delete',
  StoresConfigContract = 'stores.config-contract',
  StoresConfigAccess = 'stores.config-access',
  StoresConfigBusiness = 'stores.config-business',
  StoresHistoryView = 'stores.history-view',

  // -------------------------------------------------------------------------
  // Positions
  // -------------------------------------------------------------------------
  PositionsView = 'positions.view',
  PositionsCreate = 'positions.create',
  PositionsEdit = 'positions.edit',
  PositionsDelete = 'positions.delete',

  // -------------------------------------------------------------------------
  // Members
  // -------------------------------------------------------------------------
  MembersView = 'members.view',
  MembersEdit = 'members.edit',
  MembersDelete = 'members.delete',
  MembersPersonalDataDelete = 'members.personal-data-delete',
  MembersSuspend = 'members.suspend',
  MembersWithdraw = 'members.withdraw',
  /** A-03 退会取り消し — gated by the position flag `can_cancel_withdrawal`, separate from filing a withdrawal. */
  MembersCancelWithdrawal = 'members.cancel-withdrawal',
  MembersTransfer = 'members.transfer',
  MembersGateStop = 'members.gate-stop',
  MembersForceWithdraw = 'members.force-withdraw',
  MembersOptionContractOperate = 'members.option-contract-operate',
  /** A-01 FR-025 動作確認用アカウント: 設定・解除は System / Headquarter のみ（他ロールは参照のみ）。 */
  MembersTestAccountSet = 'members.test-account-set',
  /** A-01 FR-027 アプリ連携: 手動紐付け・紐付け直し・ロック解除（System / Headquarter / Manager / Staff）。 */
  MembersAppLinkOperate = 'members.app-link-operate',
  /** A-01 FR-027 アプリ連携: 連携解除（System / Headquarter / Manager）。 */
  MembersAppLinkUnlink = 'members.app-link-unlink',

  // -------------------------------------------------------------------------
  // Members — Blacklist
  // -------------------------------------------------------------------------
  MembersBlacklistView = 'members.blacklist-view',
  /** 会員CSV出力 — the live API's `canExportMemberCsv`. No UI consumes it yet. */
  MembersExport = 'members.export',
  BlacklistCreate = 'blacklist.create',
  BlacklistDelete = 'blacklist.delete',

  // -------------------------------------------------------------------------
  // Members — Leaves
  // -------------------------------------------------------------------------
  MembersLeavesView = 'members.leaves-view',

  // -------------------------------------------------------------------------
  // Members — Transfers
  // -------------------------------------------------------------------------
  MembersTransfersView = 'members.transfers-view',
  /** A-02 権限マトリクス: System / Headquarter / Manager / Staff. Row-level scope is narrowed
   *  further for Staff by `canActOnTransfer` — approve rights alone are not enough. */
  MembersTransfersApprove = 'members.transfers-approve',
  /** A-02 FR-013: System / Headquarter / Manager only. */
  MembersTransfersBulkApprove = 'members.transfers-bulk-approve',
  /** A-02 FR-012 手動解除: System / Headquarter / Manager only. */
  MembersTransfersUnlock = 'members.transfers-unlock',

  // -------------------------------------------------------------------------
  // Membership applications
  // -------------------------------------------------------------------------
  MembershipApplicationsView = 'membership-applications.view',
  MembershipApplicationsCreate = 'membership-applications.create',
  MembershipApplicationsApprove = 'membership-applications.approve',
  /** C-01: 入会取り消し, separate from 承認・否認 — Staff hold it unconditionally. */
  MembershipApplicationsCancel = 'membership-applications.cancel',

  // -------------------------------------------------------------------------
  // Visit / experience management
  // -------------------------------------------------------------------------
  VisitExperiencesView = 'visit-experiences.view',

  // -------------------------------------------------------------------------
  // Family registrations
  // -------------------------------------------------------------------------
  FamilyRegistrationsView = 'family-registrations.view',
  FamilyRegistrationsDashboardView = 'family-registrations.dashboard-view',
  FamilyRegistrationsApprove = 'family-registrations.approve',

  // -------------------------------------------------------------------------
  // Contracts
  // -------------------------------------------------------------------------
  ContractsView = 'contracts.view',
  ContractsEdit = 'contracts.edit',
  ContractsDelete = 'contracts.delete',
  ContractsCreate = 'contracts.create',
  ContractsHistoryView = 'contracts.history-view',

  // -------------------------------------------------------------------------
  // Campaigns
  // -------------------------------------------------------------------------
  CampaignsView = 'campaigns.view',
  CampaignsCreate = 'campaigns.create',
  CampaignsEdit = 'campaigns.edit',
  CampaignsPromoCodeEdit = 'campaigns-promo-code.edit',
  CampaignsPromoCodeCreate = 'campaigns-promo-code.create',
  CampaignsPromoCodeDelete = 'campaigns-promo-code.delete',
  CampaignsPromoCodeExport = 'campaigns-promo-code.export',

  // -------------------------------------------------------------------------
  // Franchise companies
  // -------------------------------------------------------------------------
  FCCompaniesView = 'fc-companies.view',
  FCCompaniesCreate = 'fc-companies.create',
  FCCompaniesEdit = 'fc-companies.edit',
  FCCompaniesDelete = 'fc-companies.delete',

  // -------------------------------------------------------------------------
  // Options
  // -------------------------------------------------------------------------
  OptionsView = 'options.view',
  OptionsEdit = 'options.edit',
  OptionsCreate = 'options.create',
  OptionsDelete = 'options.delete',

  // -------------------------------------------------------------------------
  // Option discounts
  // -------------------------------------------------------------------------
  OptionDiscountsView = 'option-discounts.view',
  OptionDiscountsEdit = 'option-discounts.edit',
  OptionDiscountsCreate = 'option-discounts.create',

  // -------------------------------------------------------------------------
  // Brands
  // -------------------------------------------------------------------------
  BrandsView = 'brands.view',
  BrandsEdit = 'brands.edit',
  BrandsCreate = 'brands.create',

  // -------------------------------------------------------------------------
  // Lockers
  // -------------------------------------------------------------------------
  LockersView = 'lockers.view',
  LockersEdit = 'lockers.edit',
  LockersCreate = 'lockers.create',
  LockersDelete = 'lockers.delete',
  LockersExport = 'lockers.export',
  LockersPendingView = 'lockers-pending.view',
  LockersPendingExport = 'lockers-pending.export',
  LockersContractsView = 'lockers-contracts.view',
  LockersContractsEdit = 'lockers-contracts.edit',
  LockersContractsExport = 'lockers-contracts.export',

  // -------------------------------------------------------------------------
  // Surveys
  // -------------------------------------------------------------------------
  SurveysView = 'surveys.view',
  SurveysEdit = 'surveys.edit',
  SurveysCreate = 'surveys.create',
  SurveysDelete = 'surveys.delete',
  SurveysExport = 'surveys.export',
  /** 回答データ一覧 / 個別回答 only — the one survey area a Trainer may open (own booked members, counseling). */
  SurveysResponsesView = 'surveys.responses.view',

  // -------------------------------------------------------------------------
  // Banners
  // -------------------------------------------------------------------------
  BannersView = 'banners.view',
  BannersCreate = 'banners.create',
  BannersEdit = 'banners.edit',
  BannersDelete = 'banners.delete',
  BannersReorder = 'banners.reorder',

  // Blogs (I-02)
  BlogsView = 'blogs.view',
  BlogsCreate = 'blogs.create',
  BlogsEdit = 'blogs.edit',
  BlogsPublish = 'blogs.publish',
  BlogsDelete = 'blogs.delete',
  BlogsRestore = 'blogs.restore',
  // Announcements (I-02)
  AnnouncementsView = 'announcements.view',
  AnnouncementsCreate = 'announcements.create',
  AnnouncementsEdit = 'announcements.edit',
  AnnouncementsPublish = 'announcements.publish',
  AnnouncementsDelete = 'announcements.delete',
  AnnouncementsRestore = 'announcements.restore',

  // Manual notification delivery (I-03)
  ManualNotificationsView = 'manual-notifications.view',
  ManualNotificationsCreate = 'manual-notifications.create',
  ManualNotificationsEdit = 'manual-notifications.edit',
  ManualNotificationsDelete = 'manual-notifications.delete',
  ManualNotificationsApprove = 'manual-notifications.approve',

  // Lessons / Reservations (D-01)
  // -------------------------------------------------------------------------
  LessonsView = 'lessons.view',
  LessonsScheduleManage = 'lessons.schedule-manage',
  LessonsReservationManage = 'lessons.reservation-manage',
  LessonsAttendanceManage = 'lessons.attendance-manage',
  LessonsMemoManage = 'lessons.memo-manage',
  LessonsPenaltyRelease = 'lessons.penalty-release',

  // -------------------------------------------------------------------------
  // Lesson Content Management (D-02)
  // Distinct from the D-01 Lessons* (schedule/reservation) permissions above.
  // -------------------------------------------------------------------------
  LessonContentsView = 'lesson-contents.view',
  LessonContentsCreate = 'lesson-contents.create',
  LessonContentsEdit = 'lesson-contents.edit',
  LessonContentsDelete = 'lesson-contents.delete',
  LessonContentsHistoryView = 'lesson-contents.history-view',

  // -------------------------------------------------------------------------
  // Exercises
  // -------------------------------------------------------------------------
  ExercisesView = 'exercises.view',
  ExercisesCreate = 'exercises.create',
  ExercisesEdit = 'exercises.edit',
  ExercisesDelete = 'exercises.delete',
  ExercisesPublish = 'exercises.publish',

  // -------------------------------------------------------------------------
  // Equipment
  // -------------------------------------------------------------------------
  EquipmentView = 'equipment.view',
  EquipmentCreate = 'equipment.create',
  EquipmentEdit = 'equipment.edit',
  EquipmentDelete = 'equipment.delete',
  EquipmentExport = 'equipment.export',

  // -------------------------------------------------------------------------
  // Areas (E-02 FR-016 エリアマスタ管理)
  // -------------------------------------------------------------------------
  AreasView = 'areas.view',
  AreasCreate = 'areas.create',
  AreasEdit = 'areas.edit',
  AreasDelete = 'areas.delete',

  // -------------------------------------------------------------------------
  // Controllers
  // -------------------------------------------------------------------------
  ControllerView = 'controller.view',
  ControllerCreate = 'controller.create',
  ControllerEdit = 'controller.edit',
  ControllerDelete = 'controller.delete',
  ControllerExport = 'controller.export',

  // -------------------------------------------------------------------------
  // Studios (D-03)
  // -------------------------------------------------------------------------
  StudiosView = 'studios.view',
  StudiosCreate = 'studios.create',
  StudiosEdit = 'studios.edit',
  StudiosDelete = 'studios.delete',

  // -------------------------------------------------------------------------
  // Training Equipment
  // -------------------------------------------------------------------------
  TrainingEquipmentView = 'training-equipment.view',
  TrainingEquipmentEdit = 'training-equipment.edit',
  TrainingEquipmentCreate = 'training-equipment.create',
  TrainingEquipmentDelete = 'training-equipment.delete',
  TrainingEquipmentExport = 'training-equipment.export',
  TrainingEquipmentExerciseLinks = 'training-equipment.exercise-links',

  // -------------------------------------------------------------------------
  // Instructors (D-04)
  // -------------------------------------------------------------------------
  InstructorsView = 'instructors.view',
  InstructorsCreate = 'instructors.create',
  InstructorsEdit = 'instructors.edit',
  InstructorsDelete = 'instructors.delete',

  // -------------------------------------------------------------------------
  // Entry / Exit management
  // -------------------------------------------------------------------------
  EntryExitView = 'entry-exit.view',
  EntryExitHistoryView = 'entry-exit-history.view',
  EntryExitHistoryExport = 'entry-exit-history.export',

  // -------------------------------------------------------------------------
  // Article Categories
  // -------------------------------------------------------------------------
  ArticleCategoriesView = 'article-categories.view',
  ArticleCategoriesCreate = 'article-categories.create',
  ArticleCategoriesEdit = 'article-categories.edit',
  ArticleCategoriesDelete = 'article-categories.delete',

  // -------------------------------------------------------------------------
  // App Version Management (Y-05)
  // -------------------------------------------------------------------------
  AppVersionsView = 'app-versions.view',
  AppVersionsCreate = 'app-versions.create',
  AppVersionsEdit = 'app-versions.edit',
  AppVersionsDelete = 'app-versions.delete',

  // -------------------------------------------------------------------------
  // App Maintenance
  // -------------------------------------------------------------------------
  AppMaintenanceView = 'app-maintenance.view',
  AppMaintenanceCreate = 'app-maintenance.create',
  AppMaintenanceEdit = 'app-maintenance.edit',
  AppMaintenanceDelete = 'app-maintenance.delete',

  // -------------------------------------------------------------------------
  // Terms Document Master Management (Y-04)
  // -------------------------------------------------------------------------
  TermsView = 'terms.view',
  TermsCreate = 'terms.create',
  TermsEdit = 'terms.edit',
  TermsDelete = 'terms.delete',

  // Sales Management (F-01)
  // -------------------------------------------------------------------------
  SalesView = 'sales.view',
  SalesConfirm = 'sales.confirm',
  SalesRefundInitiate = 'sales.refund-initiate',
  SalesLineItemAdd = 'sales.line-item-add',
  SalesFeeAdjust = 'sales.fee-adjust',
  SalesManualRegister = 'sales.manual-register',
  SalesExport = 'sales.export',

  // -------------------------------------------------------------------------
  // Sales — Transaction History, Receivables, Refund Management (F-01-01/02/03)
  // -------------------------------------------------------------------------
  SalesTransactionsView = 'sales.transactions-view',
  SalesReceivablesView = 'sales.receivables-view',
  SalesRefundsView = 'sales.refunds-view',
  SalesBadDebtExclude = 'sales.bad-debt-exclude',
  SalesConvenienceIssue = 'sales.convenience-issue',
  SalesUpcomingBillingConfirm = 'sales.upcoming-billing-confirm',
  SalesRefundApprove = 'sales.refund-approve',
  SalesRefundExport = 'sales.refund-export',

  // -------------------------------------------------------------------------
  // Routines (Y-09)
  // -------------------------------------------------------------------------
  RoutinesView = 'routines.view',
  RoutinesCreate = 'routines.create',
  RoutinesEdit = 'routines.edit',
  RoutinesDelete = 'routines.delete',
  RoutinesPublish = 'routines.publish',

  // -------------------------------------------------------------------------
  // CRM Maintenance (Y-10) — System writes; System + Headquarter read
  // -------------------------------------------------------------------------
  CrmMaintenanceView = 'crm-maintenance.view',
  CrmMaintenanceCreate = 'crm-maintenance.create',
  CrmMaintenanceEdit = 'crm-maintenance.edit',
  CrmMaintenanceDelete = 'crm-maintenance.delete',
  CrmMaintenanceNotify = 'crm-maintenance.notify',

  // -------------------------------------------------------------------------
  // Domain Master Management (Y-14) — Headquarter / System only
  // -------------------------------------------------------------------------
  DomainsView = 'domains.view',
  DomainsCreate = 'domains.create',
  DomainsEdit = 'domains.edit',
  DomainsDelete = 'domains.delete',
}

// ---------------------------------------------------------------------------
// Backend position permission flags (the API's own vocabulary)
// ---------------------------------------------------------------------------
/**
 * The position permission flags the backend returns in
 * `CrmMeResponseDto.permissions` (and on `PositionDto`).
 *
 * The generated type for `permissions` is only `Record<string, boolean>`, so this
 * list is what gives the FE a compile-checked vocabulary. Keys are the API's
 * camelCase spelling verbatim — do not rename them here; rename at the
 * `Permission` layer below instead.
 *
 * **57 flags, matching `PositionDto` in the 2026-10-09 `openapi.real.json`.** That
 * schema dropped `canRegisterSocialDiscountMember` and caught up with the seven
 * store-detail / CSV-export flags that the live API sent ahead of it (2026-08-26), so
 * `FlagsAheadOfSchema` in `current-user.mapper.ts` is empty again — list a flag there
 * only while the live API is ahead of the committed schema.
 *
 * Kept in `PositionDto` order so a regenerated schema diffs cleanly.
 */
export const STAFF_PERMISSION_FLAGS = [
  // 会員管理
  'canViewMember',
  'canEditMember',
  'canApplyTransferSuspension',
  'canApproveTransfer',
  'canForceWithdrawal',
  'canCancelWithdrawal',
  'canSetTemporaryRecess',
  'canAnonymizeMember',
  'canExemptDelinquency',
  'canAdjustFee',
  // 入退館
  'canViewGateLog',
  'canEditGateSetting',
  // 入会申込
  'canViewApplication',
  'canApproveApplication',
  'canCancelApplication',
  'canCreateProxyApplication',
  'canRegisterCorporateMember',
  'canRegisterSpecialContract',
  'canDeleteOthersApplicationMemo',
  'canManageTrialVisit',
  // レッスン
  'canViewLessonReservation',
  'canManageLessonReservation',
  'canManageLessonSchedule',
  'canManageLessonMaster',
  'canManageTrainerProfile',
  'canEditOwnTrainerProfile',
  'canDeleteTrainerProfile',
  'canManageStudioMaster',
  'canDeleteStudioMaster',
  // 設備
  'canViewFacility',
  'canEditFacility',
  'canManageLockerContract',
  // 売上
  'canViewSales',
  'canEditSales',
  'canConfirmBilling',
  'canAddManualBilling',
  'canEditAfterBillingConfirmed',
  'canExecuteRefund',
  // プロモーション / コンテンツ
  'canViewPromotion',
  'canManagePromotion',
  'canCreateSurvey',
  'canViewContent',
  'canManageContent',
  'canManageNotification',
  // 組織
  'canViewStaff',
  'canManageStaff',
  'canManagePosition',
  'canManageStoreSetting',
  'canViewTermsDocuments',
  'canManageTermsDocuments',
  // --- present on the live API, not yet in the committed OpenAPI schema -----
  // 店舗詳細の項目別編集権限 — finer-grained than `canManageStoreSetting`.
  'canEditStorePhoto',
  'canEditStoreBusinessHours',
  'canEditStoreBasicInfo',
  // CSV エクスポート権限 — the position master's 「CSV出力」 category.
  'canExportMemberCsv',
  'canExportGateLogCsv',
  'canExportSurveyCsv',
  'canExportAccountingCsv',
] as const;

/** One of the backend position permission flag names. */
export type StaffPermissionFlag = (typeof STAFF_PERMISSION_FLAGS)[number];

/**
 * Every flag resolved to a boolean. The mapper defaults unknown/missing keys to
 * `false`, so consumers never have to deal with `undefined` — a flag the backend
 * stops sending fails closed rather than reading as granted.
 */
export type StaffPermissionFlagSet = Readonly<Record<StaffPermissionFlag, boolean>>;

// ---------------------------------------------------------------------------
// Authenticated user (FE model)
// ---------------------------------------------------------------------------
/**
 * The signed-in staff member, as the app consumes them.
 *
 * This is the FE's own model, mapped from `CrmMeResponseDto` in
 * `src/lib/auth/current-user.mapper.ts`. Field *names* are ours; every *value*
 * is passed through unchanged from the API.
 */
export interface AuthUser {
  /** `staffId` — the JWT `sub`. Also the caller's own staff-record id. */
  id: string;
  /** Same value as `id`; kept because several screens compare against a staff-record id. */
  staffId: string;
  name: string;
  nameKana: string | null;
  email: string;
  role: UserRole;
  /** Position (職位) master the permission flags below come from. */
  positionId: string;
  positionName: string;
  /** Home store (scope pattern A). `null` for HQ / FC-company staff. */
  storeId: string | null;
  /**
   * Home store code / name (API-069, BE !834). `null` with no home store, or when the BE store
   * lookup fails. The only store-name source for Trainer / Observer (API-083 store master is 403).
   */
  storeCode: string | null;
  storeName: string | null;
  /** FC company (scope pattern B). `null` unless FC-scoped. */
  fcCompanyId: string | null;
  /**
   * Every store the staff may work in (`/crm/me` `stores`): 所属店舗, plus every store of the FC
   * company for FC-company staff. The store scope for manager / staff / trainer / observer;
   * system / headquarter are not limited to it. Source of `restrictedStores`.
   */
  stores: readonly CrmMeStoreDto[];
  /**
   * Stores a Manager oversees. `/crm/me` does not carry this — it is filled in
   * separately from the staff detail endpoint where a screen needs it, so treat
   * an empty array as "not loaded", not as "oversees nothing".
   */
  managedStoreIds: readonly string[];
  /** Every backend flag, resolved. Read through `hasPermission` instead of directly. */
  flags: StaffPermissionFlagSet;
}
