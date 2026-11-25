import { z } from 'zod';

// Field names and enum values mirror the backend design doc (API-103 Connected Device
// Management). Fields the design doc does not carry — storeName, linkedContractLabels,
// controllerNumber, usageControlRule, controllerSummary — are mock-only and are tracked as
// gaps in specs/029-equipment-list.

export const EquipmentStatusSchema = z.enum([
  'normal',
  'abnormal',
  'under_maintenance',
  'discarded',
]);

export const EquipmentTypeSchema = z.enum([
  'entry_gate',
  'exit_gate',
  'hydrogen_water',
  'body_composition',
  'tanning',
  'protein',
  'other',
]);

export const EquipmentAuthMethodSchema = z.enum(['member_scan', 'device_scan', 'none']);

// ─── List projection (FR-001) ───────────────────────────────────────────────
// Column set is the E-02 FR-001 display list. controllerNumber is deliberately absent here:
// it is not an FR-001 display item, so it lives on the detail projection only (the prototype
// shows 接点制御先番号 on the detail screen and nowhere else).
export const ConnectedEquipmentListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  storeId: z.string(),
  storeName: z.string(),
  deviceType: EquipmentTypeSchema,
  serialNumber: z.string(),
  ipAddress: z.string().nullable(),
  macAddress: z.string().nullable(),
  location: z.string(),
  installedOn: z.string(),
  status: EquipmentStatusSchema,
  authMethod: EquipmentAuthMethodSchema,
  linkedContractLabels: z.array(z.string()),
  updatedAt: z.string(),
});

// Prototype sorts every data column. The design doc's `sort` enum only covers four of them,
// so the extra keys are mock-side until the backend widens it (spec 029 gap A3 / Q2).
export const GetEquipmentSortSchema = z.enum([
  'id',
  'name',
  // Sortable only while the header scope is 全店舗 — that is the only time the 店舗 column exists.
  'storeName',
  'deviceType',
  'serialNumber',
  'ipAddress',
  'macAddress',
  'location',
  'installedOn',
  'status',
  'authMethod',
  'linkedContractLabels',
]);

export const GetEquipmentQuerySchema = z.object({
  q: z.string().optional(),
  storeId: z.string().optional(),
  deviceType: EquipmentTypeSchema.optional(),
  status: EquipmentStatusSchema.optional(),
  sort: GetEquipmentSortSchema.default('id'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((value) => [25, 50, 100, 200].includes(value))
    .default(50),
});

export const EquipmentPaginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  /**
   * Rows before the keyword/type/status filters are applied but still inside the store scope.
   * Mock-only (the design doc's pagination object has no equivalent) — it powers the
   * "全N件中M件を抽出中" banner without a second request, matching other list screens.
   */
  totalAllItems: z.number().int().nonnegative(),
});

export const GetEquipmentResponseSchema = z.object({
  items: z.array(ConnectedEquipmentListItemSchema),
  pagination: EquipmentPaginationSchema,
});

// Aggregate counters powering the 店舗機器管理 tabs (接続機器一覧 / 接点制御装置一覧).
// Mock-only: the design doc has no summary endpoint (spec 029 gap A10).
export const GetEquipmentSummaryQuerySchema = z.object({
  /** Restricts both counts to one store, mirroring the header store selector (SR-006). */
  storeId: z.string().optional(),
});

export const GetEquipmentSummaryResponseSchema = z.object({
  equipmentCount: z.number().int().nonnegative(),
  controllersCount: z.number().int().nonnegative(),
});

// ─── CSV export (FR-011) ────────────────────────────────────────────────────
// Design doc shape: a JSON envelope carrying the CSV body inline, not a file stream.
export const ExportEquipmentQuerySchema = GetEquipmentQuerySchema.omit({
  page: true,
  limit: true,
});

export const ExportEquipmentResponseSchema = z.object({
  filename: z.string(),
  rowCount: z.number().int().nonnegative(),
  csv: z.string(),
});

// ─── Bulk status update (FR-010) ────────────────────────────────────────────
// `changedReason` from the design doc is deliberately not collected: the prototype dialog
// offers a single free-text field, which maps to `changedNote` (spec 029 Q3).
export const BulkUpdateEquipmentStatusRequestSchema = z.object({
  deviceIds: z.array(z.string().min(1)).min(1).max(100),
  status: EquipmentStatusSchema,
  changedNote: z.string().max(1000).optional(),
});

export const BulkUpdateEquipmentStatusResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
  status: EquipmentStatusSchema,
});

// ─── Detail projection (FR-004) ─────────────────────────────────────────────

// E-02 FR-008 (v2, 2026-07-31): the rule has exactly two judgment axes — 主契約判定 and
// サービス種別判定. 課金種別 (通常/都度) is deliberately NOT one of them: a device starts when any
// one option of the same service type is active, whatever its billing type (OR judgment), so the
// old 'option' / 'per_use' pair collapsed into a single 'service' axis carrying multiple types.
export const EquipmentContractLinkTypeSchema = z.enum(['main', 'service']);

export const UsageControlRuleDisplaySchema = z.object({
  contractLinkTypes: z.array(EquipmentContractLinkTypeSchema),
  mainContractTypeLabel: z.string().nullable(),
  /** サービス種別判定 targets, empty when the axis is off. */
  serviceTypeLabels: z.array(z.string()),
  showGateStopInfo: z.boolean(),
});

// Contact-control devices keep their own status value set, deliberately separate from the
// connected-equipment enum above: the design doc models them as a different lifecycle
// (API-104) and specs/008-controller-management owns those screens. Declared here rather than
// in controller.schema.ts because that module already imports from this one.
export const ControllerStatusSchema = z.enum(['normal', 'error', 'maintenance', 'discarded']);

export const ControllerSummarySchema = z.object({
  controllerId: z.string(),
  ipAddress: z.string(),
  port: z.number().int().positive(),
  status: ControllerStatusSchema,
  name: z.string().nullable(),
});

export const ConnectedEquipmentDetailSchema = ConnectedEquipmentListItemSchema.extend({
  /** 接点制御先番号: the contact-output port the device is wired to on its relay controller. */
  controllerNumber: z.number().int().nonnegative(),
  usageControlRule: UsageControlRuleDisplaySchema,
  controllerSummary: ControllerSummarySchema,
  relayControllerId: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  lastStatusConfirmedAt: z.string(),
});

// Status-change reasons as the design doc models them (API-103 §5). The prototype's 変更理由
// column renders the free-text note rather than this code, so it is stored but not displayed.
export const EquipmentStatusChangedReasonSchema = z.enum([
  'install',
  'fault_report',
  'maintenance_start',
  'maintenance_complete',
  'disposal',
]);

export const EquipmentStatusHistoryActorSchema = z.object({
  staffId: z.string(),
  /**
   * The design doc always returns null here (staff lookup is not wired backend-side), but the
   * prototype's 操作者 column shows a name, so the mock resolves one.
   */
  name: z.string().nullable(),
});

export const EquipmentStatusHistoryItemSchema = z.object({
  historyId: z.string(),
  /** Null only on the install row — that is what identifies the first entry (design doc §5). */
  previousStatus: EquipmentStatusSchema.nullable(),
  newStatus: EquipmentStatusSchema,
  changedReason: EquipmentStatusChangedReasonSchema.nullable(),
  changedNote: z.string().nullable(),
  changedBy: EquipmentStatusHistoryActorSchema.nullable(),
  changedAt: z.string(),
});

// ─── Create / Update (FR-003 / FR-005) ──────────────────────────────────────

export const EquipmentUsageControlRuleInputSchema = z.object({
  mainEnabled: z.boolean().default(false),
  mainContractType: z.string().nullable().default(null),
  serviceEnabled: z.boolean().default(false),
  /** One or more G-02 サービス種別; billing type is not part of the judgment (FR-008 v2). */
  serviceTypes: z.array(z.string()).default([]),
});

function refineUsageControlRule(
  rule: EquipmentUsageControlRuleInput | null | undefined,
  ctx: z.RefinementCtx,
) {
  if (!rule) return;

  // FR-008 異常系: 契約種別が未選択の場合はバリデーションエラー. Checked only when a rule object is
  // actually supplied — an omitted PATCH field means "leave the rule untouched".
  if (!rule.mainEnabled && !rule.serviceEnabled) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '契約種別を選択してください',
      path: ['usageControlRule'],
    });
  }
  if (rule.mainEnabled && !rule.mainContractType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '主契約タイプを選択してください',
      path: ['usageControlRule', 'mainContractType'],
    });
  }
  if (rule.serviceEnabled && rule.serviceTypes.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'サービス種別を1つ以上選択してください',
      path: ['usageControlRule', 'serviceTypes'],
    });
  }
}

// Create body (FR-003). Mirrors the design doc's CreateConnectedDeviceDto: the store is
// derived from the chosen relay controller, so `storeId` is never accepted from the client,
// and 接点制御先番号 is assigned server-side (the prototype form has no field for it).
export const UpsertEquipmentRequestSchema = z
  .object({
    name: z.string().trim().min(1, '機器名を入力してください').max(255),
    deviceType: EquipmentTypeSchema,
    serialNumber: z.string().trim().min(1, 'シリアルナンバーを入力してください').max(255),
    location: z.string().trim().min(1, '設置場所を入力してください').max(255),
    installedOn: z.string().min(1, '設置日を入力してください'),
    status: EquipmentStatusSchema.default('normal'),
    authMethod: EquipmentAuthMethodSchema,
    relayControllerId: z.string().min(1, '接続先接点制御装置を選択してください'),
    ipAddress: z.string().nullable().default(null),
    macAddress: z.string().nullable().default(null),
    usageControlRule: EquipmentUsageControlRuleInputSchema.nullable().default(null),
    note: z.string().max(1000).nullable().default(null),
  })
  .superRefine((data, ctx) => refineUsageControlRule(data.usageControlRule, ctx));

// PATCH body (FR-005): every field optional, no defaults — only changed fields are sent/applied.
export const PatchEquipmentRequestSchema = z
  .object({
    name: z.string().trim().min(1, '機器名を入力してください').max(255).optional(),
    deviceType: EquipmentTypeSchema.optional(),
    serialNumber: z
      .string()
      .trim()
      .min(1, 'シリアルナンバーを入力してください')
      .max(255)
      .optional(),
    location: z.string().trim().min(1, '設置場所を入力してください').max(255).optional(),
    installedOn: z.string().min(1, '設置日を入力してください').optional(),
    status: EquipmentStatusSchema.optional(),
    authMethod: EquipmentAuthMethodSchema.optional(),
    relayControllerId: z.string().min(1, '接続先接点制御装置を選択してください').optional(),
    ipAddress: z.string().nullable().optional(),
    macAddress: z.string().nullable().optional(),
    usageControlRule: EquipmentUsageControlRuleInputSchema.nullable().optional(),
    note: z.string().max(1000).nullable().optional(),
    /**
     * Annotates the status-history row a status change appends (design doc §6.2). The prototype
     * edit form has no field for it, so it is accepted but never sent from this screen.
     */
    changedNote: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => refineUsageControlRule(data.usageControlRule, ctx));

export const CreateEquipmentResponseSchema = z.object({
  equipment: ConnectedEquipmentDetailSchema,
});

export const UpdateEquipmentResponseSchema = z.object({
  equipment: ConnectedEquipmentDetailSchema,
});

export const GetEquipmentDetailResponseSchema = z.object({
  equipment: ConnectedEquipmentDetailSchema,
});

export const GetEquipmentHistoryResponseSchema = z.object({
  history: z.array(EquipmentStatusHistoryItemSchema),
});

export type ConnectedEquipmentListItem = z.infer<typeof ConnectedEquipmentListItemSchema>;
export type GetEquipmentQuery = z.infer<typeof GetEquipmentQuerySchema>;
export type GetEquipmentSort = z.infer<typeof GetEquipmentSortSchema>;
export type GetEquipmentResponse = z.infer<typeof GetEquipmentResponseSchema>;
export type GetEquipmentSummaryQuery = z.infer<typeof GetEquipmentSummaryQuerySchema>;
export type GetEquipmentSummaryResponse = z.infer<typeof GetEquipmentSummaryResponseSchema>;
export type ExportEquipmentQuery = z.infer<typeof ExportEquipmentQuerySchema>;
export type ExportEquipmentResponse = z.infer<typeof ExportEquipmentResponseSchema>;
export type BulkUpdateEquipmentStatusRequest = z.infer<
  typeof BulkUpdateEquipmentStatusRequestSchema
>;
export type BulkUpdateEquipmentStatusResponse = z.infer<
  typeof BulkUpdateEquipmentStatusResponseSchema
>;
export type UsageControlRuleDisplay = z.infer<typeof UsageControlRuleDisplaySchema>;
export type ControllerStatus = z.infer<typeof ControllerStatusSchema>;
export type ControllerSummary = z.infer<typeof ControllerSummarySchema>;
export type ConnectedEquipmentDetail = z.infer<typeof ConnectedEquipmentDetailSchema>;
export type EquipmentStatusChangedReason = z.infer<typeof EquipmentStatusChangedReasonSchema>;
export type EquipmentStatusHistoryItem = z.infer<typeof EquipmentStatusHistoryItemSchema>;
export type GetEquipmentDetailResponse = z.infer<typeof GetEquipmentDetailResponseSchema>;
export type GetEquipmentHistoryResponse = z.infer<typeof GetEquipmentHistoryResponseSchema>;
export type EquipmentUsageControlRuleInput = z.infer<typeof EquipmentUsageControlRuleInputSchema>;
export type UpsertEquipmentRequest = z.infer<typeof UpsertEquipmentRequestSchema>;
export type PatchEquipmentRequest = z.infer<typeof PatchEquipmentRequestSchema>;
export type CreateEquipmentResponse = z.infer<typeof CreateEquipmentResponseSchema>;
export type UpdateEquipmentResponse = z.infer<typeof UpdateEquipmentResponseSchema>;
