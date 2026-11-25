import { z } from 'zod';

import { ControllerStatusSchema, EquipmentStatusSchema } from './equipment.schema';

// Field names mirror the backend design doc (API-104 Relay Controller Management), so the mock
// speaks the same wire vocabulary as the real API. Where the two disagree, the prototype wins:
//
// - `status` keeps the four-value 正常 / 異常 / メンテナンス中 / 廃棄 set the prototype filters and
//   renders, not the design doc's three-value `active | inactive | maintenance`.
// - `storeCode` / `storeName` / `port` / `deviceSummary` and the change-history endpoint have no
//   counterpart in the design doc; they are mock-only (tracked as gaps in
//   specs/008-controller-management).
// - Design-doc fields no prototype screen shows — `model`, `serialNumber`, `installedOn`,
//   `secretArn`, `note` — are deliberately not modelled here.

const LOCAL_IP_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export const ControllerSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  /** 店舗コード — the list column and the form field the prototype shows. Mock-only. */
  storeCode: z.string(),
  /** Detail header subtitle ("{店舗名} — {IP}"). Mock-only. */
  storeName: z.string(),
  name: z.string().nullable(),
  location: z.string(),
  ipAddress: z.string(),
  /**
   * Administrative port of the controller. No design-doc counterpart and no controller screen
   * shows it (the prototype form omits it on purpose — 通信ポート番号 is not an E-02 requirement);
   * it survives only because the connected-equipment detail renders 接点制御装置 IP:ポート
   * (specs/006-equipment-detail). Seed-supplied, never editable from the controller form.
   */
  port: z.number().int().positive(),
  firmwareVersion: z.string().nullable(),
  controlPortCount: z.number().int().min(1).max(64),
  status: ControllerStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ControllerListItemSchema = ControllerSchema.extend({
  connectedDeviceCount: z.number().int().nonnegative(),
});

/** Counters behind the 紐付き機器サマリー card on the detail screen. Mock-only. */
export const ControllerDeviceSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  normal: z.number().int().nonnegative(),
  error: z.number().int().nonnegative(),
});

export const ControllerDetailSchema = ControllerListItemSchema.extend({
  deviceSummary: ControllerDeviceSummarySchema,
});

// Projection behind the 紐付き機器一覧 tab. The design doc's RelayControllerDeviceDto is wider,
// but the prototype table has exactly these four columns (機器ID / 機器名 / 接点番号 / ステータス).
export const ControllerConnectedDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** 接点番号: the contact-output port the device is wired to. Mock-only (no design-doc field). */
  controllerNumber: z.number().int(),
  status: EquipmentStatusSchema,
});

export const ControllerPaginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const ControllerHistoryActorSchema = z.object({
  staffId: z.string(),
  name: z.string().nullable(),
});

/**
 * One 変更履歴 row. The endpoint is mock-only (API-104 exposes no history), so the envelope
 * follows the connected-device status history of API-103 instead: a null `previousStatus` marks
 * the creation row, which the screen renders as a single 新規作成 badge. The tab shows
 * 日時 / 操作者 / ステータス変化 / 変更理由 only — the prototype dropped 種別, so no row carries one.
 */
export const ControllerHistoryItemSchema = z.object({
  historyId: z.string(),
  changedAt: z.string(),
  changedBy: ControllerHistoryActorSchema.nullable(),
  previousStatus: ControllerStatusSchema.nullable(),
  newStatus: ControllerStatusSchema,
  changedNote: z.string().nullable(),
});

// The prototype sorts every data column; the design doc's `sort` enum only covers three of them,
// so the extra keys are served mock-side (same divergence as the equipment list).
export const GetControllersSortSchema = z.enum([
  'id',
  'name',
  'storeCode',
  'location',
  'ipAddress',
  'firmwareVersion',
  'controlPortCount',
  'connectedDeviceCount',
  'status',
]);

export const GetControllersQuerySchema = z.object({
  q: z.string().optional(),
  storeId: z.string().optional(),
  status: ControllerStatusSchema.optional(),
  sort: GetControllersSortSchema.default('id'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((value) => [25, 50, 100, 200].includes(value))
    .default(50),
});

export const GetControllersResponseSchema = z.object({
  items: z.array(ControllerListItemSchema),
  pagination: ControllerPaginationSchema,
});

export const GetControllerDevicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export const GetControllerDevicesResponseSchema = z.object({
  items: z.array(ControllerConnectedDeviceSchema),
  pagination: ControllerPaginationSchema,
});

export const GetControllerHistoryResponseSchema = z.object({
  items: z.array(ControllerHistoryItemSchema),
});

// CSV export reuses the list filters/sort without pagination. API-104 has no export endpoint,
// so the shape follows the connected-device export of API-103: a JSON envelope carrying the CSV
// body inline rather than a file stream.
export const ExportControllersQuerySchema = GetControllersQuerySchema.omit({
  page: true,
  limit: true,
});

export const ExportControllersResponseSchema = z.object({
  filename: z.string(),
  rowCount: z.number().int().nonnegative(),
  csv: z.string(),
});

export const UpsertControllerRequestSchema = z.object({
  name: z.string().trim().min(1, '装置名を入力してください').max(255),
  storeId: z.string().trim().min(1, '店舗コードを選択してください'),
  location: z.string().trim().min(1, '設置場所を入力してください').max(255),
  ipAddress: z
    .string()
    .trim()
    .min(1, 'IPアドレスを入力してください')
    .regex(LOCAL_IP_REGEX, 'IPアドレスの形式が正しくありません'),
  firmwareVersion: z.string().max(255).nullable().optional(),
  controlPortCount: z.coerce.number().int().min(1).max(64),
  status: ControllerStatusSchema.default('normal'),
});

export const PatchControllerRequestSchema = UpsertControllerRequestSchema.partial().extend({
  /**
   * 変更理由 from the ステータス変更 dialog. Mock-only: it annotates the history row the mock
   * appends when `status` changes, and has no design-doc counterpart (API-104's PATCH carries
   * none, because it records no history).
   */
  changedNote: z.string().trim().max(1000).optional(),
});

export const CreateControllerResponseSchema = ControllerDetailSchema;
export const UpdateControllerResponseSchema = ControllerDetailSchema;
export const GetControllerDetailResponseSchema = ControllerDetailSchema;

export type Controller = z.infer<typeof ControllerSchema>;
export type ControllerListItem = z.infer<typeof ControllerListItemSchema>;
export type ControllerDeviceSummary = z.infer<typeof ControllerDeviceSummarySchema>;
export type ControllerDetail = z.infer<typeof ControllerDetailSchema>;
export type ControllerConnectedDevice = z.infer<typeof ControllerConnectedDeviceSchema>;
export type ControllerPagination = z.infer<typeof ControllerPaginationSchema>;
export type ControllerHistoryItem = z.infer<typeof ControllerHistoryItemSchema>;
export type GetControllersSort = z.infer<typeof GetControllersSortSchema>;
export type GetControllersQuery = z.infer<typeof GetControllersQuerySchema>;
export type GetControllersResponse = z.infer<typeof GetControllersResponseSchema>;
export type GetControllerDevicesQuery = z.infer<typeof GetControllerDevicesQuerySchema>;
export type GetControllerDevicesResponse = z.infer<typeof GetControllerDevicesResponseSchema>;
export type GetControllerHistoryResponse = z.infer<typeof GetControllerHistoryResponseSchema>;
export type ExportControllersQuery = z.infer<typeof ExportControllersQuerySchema>;
export type ExportControllersResponse = z.infer<typeof ExportControllersResponseSchema>;
export type UpsertControllerRequest = z.infer<typeof UpsertControllerRequestSchema>;
export type PatchControllerRequest = z.infer<typeof PatchControllerRequestSchema>;
export type CreateControllerResponse = z.infer<typeof CreateControllerResponseSchema>;
export type UpdateControllerResponse = z.infer<typeof UpdateControllerResponseSchema>;
export type GetControllerDetailResponse = z.infer<typeof GetControllerDetailResponseSchema>;
