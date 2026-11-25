import { STAFF_ROLE_LABELS } from '@/constants/staff.constants';

import type {
  LockerContractItemDto,
  LockerDetailDto,
  LockerHistoryEntryDto,
  LockerSlotGridItemDto,
} from '@/lib/api-real/types.gen';

/**
 * Display labels for every locker enum (API-100 §7.5 / API-101).
 * The label strings are part of the API contract — do not compose new ones on the UI side.
 * Each map is a `Record` over the generated union, so a new BE value fails `tsc` here.
 */

export type LockerShapeType = LockerDetailDto['shapeType'];
export type LockerOrderType = LockerDetailDto['orderType'];
export type LockerLockMethod = LockerDetailDto['lockMethod'];
export type LockerOpenMethod = LockerDetailDto['openMethod'];
export type LockerSlotStatus = LockerSlotGridItemDto['status'];
export type LockerOptionStatus = NonNullable<LockerContractItemDto['optionStatus']>;
export type LockerChangedByRole = NonNullable<LockerHistoryEntryDto['changedByRole']>;

export const LOCKER_SHAPE_TYPE_LABELS: Record<LockerShapeType, string> = {
  three_by_nine: '3 列 × 9 段',
  three_by_seven: '3 列 × 7 段',
  three_by_five: '3 列 × 5 段',
  three_by_two: '3 列 × 2 段',
};

/** `three_by_nine` → 9 rows × 3 columns (API-100 §6.1 SHAPE_TO_GRID) */
export const LOCKER_SHAPE_GRID: Record<LockerShapeType, { rows: number; cols: number }> = {
  three_by_nine: { rows: 9, cols: 3 },
  three_by_seven: { rows: 7, cols: 3 },
  three_by_five: { rows: 5, cols: 3 },
  three_by_two: { rows: 2, cols: 3 },
};

export const LOCKER_SHAPE_TYPE_OPTIONS = (
  Object.keys(LOCKER_SHAPE_TYPE_LABELS) as LockerShapeType[]
).map((value) => ({ value, label: LOCKER_SHAPE_TYPE_LABELS[value] }));

export const LOCKER_ORDER_TYPE_LABELS: Record<LockerOrderType, string> = {
  top_left_to_top_right: '左上→右上',
  top_right_to_top_left: '右上→左上',
  top_left_to_bottom_left: '左上→左下',
  top_right_to_bottom_right: '右上→右下',
};

export const LOCKER_ORDER_TYPE_OPTIONS = (
  Object.keys(LOCKER_ORDER_TYPE_LABELS) as LockerOrderType[]
).map((value) => ({ value, label: LOCKER_ORDER_TYPE_LABELS[value] }));

export const LOCKER_LOCK_METHOD_LABELS: Record<LockerLockMethod, string> = {
  dial_lock: 'ダイヤル錠',
  key_lock: 'シリンダー錠',
  padlock: '南京錠',
  ic_lock: 'IC 錠',
};

/** `ic_lock` is reserved (API-100 §7.5) — create / update reject it with 400 E-VAL-001 */
export const LOCKER_SELECTABLE_LOCK_METHODS: LockerLockMethod[] = [
  'dial_lock',
  'key_lock',
  'padlock',
];

/** FIT365 new cabinets accept dial locks only (BR-LCK-009) */
export const LOCKER_FIT365_LOCK_METHODS: LockerLockMethod[] = ['dial_lock'];

export const LOCKER_OPEN_METHOD_LABELS: Record<LockerOpenMethod, string> = {
  door: '扉型',
  drawer: '引き出し型',
};

export const LOCKER_OPEN_METHOD_OPTIONS = (
  Object.keys(LOCKER_OPEN_METHOD_LABELS) as LockerOpenMethod[]
).map((value) => ({ value, label: LOCKER_OPEN_METHOD_LABELS[value] }));

/** Slot status — a different field from the contract status below; never mix the two */
export const LOCKER_SLOT_STATUS_LABELS: Record<LockerSlotStatus, string> = {
  available: '利用可',
  in_use: '使用中',
  pending_release: '開放待ち',
};

export const LOCKER_SLOT_STATUS_BADGE_CLASSES: Record<LockerSlotStatus, string> = {
  in_use: 'bg-info/15 text-info border-info/20',
  pending_release: 'bg-warning/15 text-warning border-warning/20',
  available: 'bg-muted text-muted-foreground border-border',
};

export const LOCKER_SLOT_STATUS_DOT_CLASSES: Record<LockerSlotStatus, string> = {
  in_use: 'bg-info',
  pending_release: 'bg-warning',
  available: 'bg-muted-foreground',
};

export const LOCKER_SLOT_STATUS_CELL_CLASSES: Record<LockerSlotStatus, string> = {
  in_use: 'border-info/20 bg-info/15 text-info',
  pending_release: 'border-warning/20 bg-warning/15 text-warning',
  available: 'border-border bg-background text-muted-foreground',
};

/** Slot statuses a contract row can carry — the contract list's スロット状態 filter (API-101 §4.2) */
export type LockerContractSlotStatus = Exclude<LockerSlotStatus, 'available'>;

export const LOCKER_CONTRACT_SLOT_STATUS_OPTIONS = (
  ['in_use', 'pending_release'] as const satisfies readonly LockerContractSlotStatus[]
).map((value) => ({ value, label: LOCKER_SLOT_STATUS_LABELS[value] }));

/** Contract (option contract) status — API-101 wording; 開始前 is API-101's own label */
export const LOCKER_OPTION_STATUS_LABELS: Record<LockerOptionStatus, string> = {
  pending_start: '開始前',
  active: '利用中',
  pending_cancel: '解約予定',
  cancelled: '終了',
};

export const LOCKER_OPTION_STATUS_BADGE_CLASSES: Record<LockerOptionStatus, string> = {
  pending_start: 'border-info/20 bg-info/15 text-info',
  active: 'border-success/20 bg-success/15 text-success',
  pending_cancel: 'border-warning/20 bg-warning/15 text-warning',
  cancelled: 'border-muted bg-muted/50 text-muted-foreground',
};

export const LOCKER_OPTION_STATUS_DOT_CLASSES: Record<LockerOptionStatus, string> = {
  pending_start: 'bg-info',
  active: 'bg-success',
  pending_cancel: 'bg-warning',
  cancelled: 'bg-muted-foreground',
};

export const LOCKER_OPTION_STATUS_OPTIONS = (
  Object.keys(LOCKER_OPTION_STATUS_LABELS) as LockerOptionStatus[]
).map((value) => ({ value, label: LOCKER_OPTION_STATUS_LABELS[value] }));

/** 解約 is offered only for these statuses (API-101 §6.2 #2) */
export const LOCKER_RELEASABLE_OPTION_STATUSES: LockerOptionStatus[] = ['active', 'pending_start'];

/** Same wording as the staff screens; a batch transition reads 「システム」 instead of being hidden */
export const LOCKER_CHANGED_BY_ROLE_LABELS: Record<LockerChangedByRole, string> = {
  ...STAFF_ROLE_LABELS,
  system: 'システム',
};

type LockerHistoryActorRow = {
  changedBy: string | null;
  changedByName: string | null;
  changedByRole: LockerChangedByRole | null;
  memberName: string | null;
};

/**
 * No `changedBy`: the member did it in the app (API-153 enrollment), confirmed by Otaki — 案A,
 * BE !845. The daily batch (BAT-048) and system rollbacks come back as the system user instead.
 * Rows written before !845 can still carry a null `changedBy` for a CRM approve / cancel.
 */
export function isLockerMemberAppRow(row: LockerHistoryActorRow): boolean {
  return row.changedBy === null;
}

/** History actor: the member on app rows, 「システム（自動）」 for the system user, else the staff */
export function formatLockerHistoryActor(row: LockerHistoryActorRow): string {
  if (isLockerMemberAppRow(row)) return row.memberName ?? '—';
  if (row.changedByRole === 'system') return 'システム（自動）';
  return row.changedByName ?? '—';
}

/**
 * 「001」 — `slot_code` is stored zero-padded (API-100 §6.1) since BE !734; older rows are not, so
 * numeric codes are padded the same way the BE pads them in the contract / history responses.
 */
export function normalizeLockerSlotCode(slotCode: string): string {
  return /^\d+$/.test(slotCode) ? slotCode.padStart(3, '0') : slotCode;
}

/** Slot label 「A-001」 — `locationCode` + `slotCode` (API-100: composed client-side) */
export function formatLockerSlotLabel(
  locationCode: string | null | undefined,
  slotCode: string,
): string {
  const code = normalizeLockerSlotCode(slotCode);
  return locationCode ? `${locationCode}-${code}` : code;
}
