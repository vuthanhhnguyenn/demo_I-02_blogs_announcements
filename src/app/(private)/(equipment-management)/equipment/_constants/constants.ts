import type { ConnectedDeviceDto, PutDeviceUsageControlDto } from '@/lib/api-real/types.gen';

import { MAIN_CONTRACT_TYPE_LABELS } from '../../../contracts/_constants/constants';

export type EquipmentStatus = ConnectedDeviceDto['status'];
export type EquipmentType = ConnectedDeviceDto['deviceType'];

// Order of E-02 v5 §機能の定義 (機器タイプ).
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  entry_gate: '入館ゲート',
  exit_gate: '退館ゲート',
  gate_tablet: '入退館タブレット',
  area_door: 'エリア扉',
  hydrogen_water: '水素水サーバー',
  body_composition: '体組成計',
  tanning: 'タンニングマシン',
  protein: 'プロテインサーバー',
  other: 'その他',
};

export type EquipmentAuthMethod = ConnectedDeviceDto['authMethod'];

export const EQUIPMENT_AUTH_METHOD_LABELS: Record<EquipmentAuthMethod, string> = {
  member_scan: '会員読取型',
  device_scan: '機器読取型',
  none: 'なし',
};

/** 主契約タイプ — the API-103 §6.6 enum, labelled as the 主契約管理 screen labels it (D6). */
export type EquipmentMainContractType = PutDeviceUsageControlDto['allowedContractTypes'][number];

export const EQUIPMENT_MAIN_CONTRACT_TYPE_LABELS: Record<EquipmentMainContractType, string> =
  MAIN_CONTRACT_TYPE_LABELS;

/** G-01 FR-001 order (the 主契約管理 list's), the order the checkboxes and badges use. */
export const EQUIPMENT_MAIN_CONTRACT_TYPE_VALUES = [
  'general',
  'oneDay',
  'family',
  'kids',
  'student',
  'corporate',
  'welfare',
  'prepaid',
  'special',
] as const satisfies readonly EquipmentMainContractType[];

/**
 * JOYFIT-only 主契約タイプ: a device in a FIT365 store does not offer them (prototype 11/7 — the
 * types are narrowed by the brand of the device's store, which is its controller's store).
 */
export const JOYFIT_ONLY_MAIN_CONTRACT_TYPES: readonly EquipmentMainContractType[] = [
  'kids',
  'student',
  'welfare',
];

export type StoreBrandGroup = 'JOYFIT' | 'FIT365';

/** 主契約タイプ a store of this brand group can pick: FIT365 6, JOYFIT (and unknown) all 9. */
export function getSelectableMainContractTypes(
  brandGroup: StoreBrandGroup | null | undefined,
): EquipmentMainContractType[] {
  return brandGroup === 'FIT365'
    ? EQUIPMENT_MAIN_CONTRACT_TYPE_VALUES.filter(
        (type) => !JOYFIT_ONLY_MAIN_CONTRACT_TYPES.includes(type),
      )
    : [...EQUIPMENT_MAIN_CONTRACT_TYPE_VALUES];
}

/**
 * Every type the store's brand allows is ticked — it then behaves like 「全て」 (an option is never
 * looked at), so the same notice is shown. Unknown brand → cannot tell → false.
 */
export function hasAllSelectableMainContractTypes(
  types: readonly string[],
  brandGroup: StoreBrandGroup | null | undefined,
): boolean {
  if (!brandGroup) return false;
  return getSelectableMainContractTypes(brandGroup).every((type) => types.includes(type));
}

// Wording shared by the form, the detail card and the list (prototype `data/equipment.ts`).
export const MAIN_CONTRACT_ALL_LABEL = '全て';
export const MAIN_CONTRACT_ALL_NOTE = 'タイプを問わず、有効な主契約があれば起動します';
export const NOT_JUDGED_LABEL = '判定しない';
/** E-02 FR-008: the conditions an area door applies by itself (prototype AREA_DOOR_NOTE). */
export const AREA_DOOR_NOTE = {
  title: 'エリア扉の自動適用の条件',
  body: '家族会員利用中の会員は開錠できません。ブラックリスト・未納はエリア扉では判定しません。退室時は判定しません。',
} as const;

export const OPTION_BYPASS_ALERT = {
  title: 'オプションの有無を問わず起動します',
  body: '主契約が有効な会員は、オプションを持っていなくても起動できます。オプションを持つ会員だけに使わせる場合は、主契約判定のチェックを外してください。',
} as const;

/** The 主契約判定 scope a device's API rule stands for: off, 「全て」 (`[]`), or listed types. */
export type DeviceMainContractRule =
  | { scope: 'none' }
  | { scope: 'all' }
  | { scope: 'specified'; types: EquipmentMainContractType[] };

export function getMainContractRule(
  device: Pick<ConnectedDeviceDto, 'isMainContractRequired' | 'allowedContractTypes'>,
): DeviceMainContractRule {
  if (!device.isMainContractRequired) return { scope: 'none' };
  if (device.allowedContractTypes.length === 0) return { scope: 'all' };
  // Show in the G-01 order whatever order the API stored them in.
  const types = EQUIPMENT_MAIN_CONTRACT_TYPE_VALUES.filter((type) =>
    device.allowedContractTypes.includes(type),
  );
  return { scope: 'specified', types };
}

/** One 紐づき契約種別 badge; `tooltip` only on a shortened (ほかN種) or possibly clipped badge. */
export interface UsageRuleBadge {
  label: string;
  tooltip?: string;
}

// A badge whose full text is longer than this may be clipped at the list's column width.
const USAGE_RULE_BADGE_MAX_LENGTH = 16;

function buildUsageRuleBadge(axis: string, names: string[]): UsageRuleBadge {
  if (names.length >= 3) {
    return { label: `${axis}（${names[0]} ほか${names.length - 1}種）`, tooltip: names.join('・') };
  }
  const label = `${axis}（${names.join('・')}）`;
  return label.length > USAGE_RULE_BADGE_MAX_LENGTH ? { label, tooltip: label } : { label };
}

/**
 * The list's 紐づき契約種別 badges, one per judged axis (prototype 11/7): `エリア（女性専用エリア）` for an
 * area door (prototype 11/12), `主契約（全て）` or
 * `主契約（通常会員・家族会員）`, then `サービス種別（プロテイン・水素水）`; three or more names collapse
 * to `（○○ ほかN種）` with the full list in a tooltip. An axis that is not judged has no badge.
 */
export function getUsageRuleBadges(
  device: Pick<
    ConnectedDeviceDto,
    'isMainContractRequired' | 'allowedContractTypes' | 'allowedServiceTypes'
  > &
    Partial<Pick<ConnectedDeviceDto, 'area'>>,
): UsageRuleBadge[] {
  const badges: UsageRuleBadge[] = [];
  if (device.area) badges.push(buildUsageRuleBadge('エリア', [device.area.name]));
  const main = getMainContractRule(device);
  if (main.scope === 'all') badges.push({ label: `主契約（${MAIN_CONTRACT_ALL_LABEL}）` });
  if (main.scope === 'specified') {
    badges.push(
      buildUsageRuleBadge(
        '主契約',
        main.types.map((type) => EQUIPMENT_MAIN_CONTRACT_TYPE_LABELS[type]),
      ),
    );
  }
  if (device.allowedServiceTypes.length > 0) {
    badges.push(
      buildUsageRuleBadge(
        'サービス種別',
        device.allowedServiceTypes.map((type) => EQUIPMENT_SERVICE_TYPE_LABELS[type]),
      ),
    );
  }
  return badges;
}

/**
 * サービス種別 as G-02 defines them (Protein / Supplement / Tanning / Collagen / HydrogenWater /
 * BodyPlanner / Shower), keyed on the API enum so a backend catalog change fails `tsc`. Labels are
 * the prototype's; billing type is a separate axis and never appears here (D7).
 */
export type EquipmentServiceType = PutDeviceUsageControlDto['allowedServiceTypes'][number];

export const EQUIPMENT_SERVICE_TYPE_LABELS: Record<EquipmentServiceType, string> = {
  protein: 'プロテイン',
  supplement: 'サプリメント',
  tanning: '日焼け',
  collagen: 'コラーゲン',
  hydrogen_water: '水素水',
  body_planner: '体組成計',
  shower: 'シャワー',
};

export const EQUIPMENT_SERVICE_TYPE_VALUES = [
  'protein',
  'supplement',
  'tanning',
  'collagen',
  'hydrogen_water',
  'body_planner',
  'shower',
] as const satisfies readonly EquipmentServiceType[];

/** Label lookup for a free-typed API string; unknown values are shown as-is rather than dropped. */
export function getMainContractTypeLabel(value: string | null): string | null {
  if (!value) return null;
  return EQUIPMENT_MAIN_CONTRACT_TYPE_LABELS[value as EquipmentMainContractType] ?? value;
}

export function getServiceTypeLabel(value: string | null): string | null {
  if (!value) return null;
  return EQUIPMENT_SERVICE_TYPE_LABELS[value as EquipmentServiceType] ?? value;
}

/** 変更理由 codes the status history can carry (API-103 `changedReason`). */
export const EQUIPMENT_CHANGED_REASON_LABELS: Record<string, string> = {
  install: '設置',
  fault_report: '故障報告',
  maintenance_start: 'メンテナンス開始',
  maintenance_complete: 'メンテナンス完了',
  disposal: '廃棄',
};

/**
 * QR sticker events in the 変更履歴 trail (API-103 `changedReason`): issuing the first number and
 * replacing it. They are not status changes (previousStatus = newStatus), so they render as a single
 * badge in the ステータス変化 column and are kept out of the 変更理由 map above.
 */
export const EQUIPMENT_QR_HISTORY_LABELS: Record<string, string> = {
  qr_create: 'QRコード発行',
  qr_change: 'QRコード再発行',
};

export function isQrHistoryReason(reason: string | null | undefined): boolean {
  return reason != null && Object.hasOwn(EQUIPMENT_QR_HISTORY_LABELS, reason);
}

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  normal: '正常',
  abnormal: '異常',
  under_maintenance: 'メンテナンス中',
  discarded: '廃棄',
};

export const EQUIPMENT_STATUS_BADGE_MAP: Record<
  EquipmentStatus,
  { badgeClassName: string; dotClassName: string }
> = {
  normal: {
    badgeClassName: 'border-success/20 bg-success/15 text-success gap-1 text-xs font-medium',
    dotClassName: 'bg-success',
  },
  abnormal: {
    badgeClassName:
      'border-destructive/20 bg-destructive/15 text-destructive gap-1 text-xs font-medium',
    dotClassName: 'bg-destructive',
  },
  // メンテナンス中 is `warning` on every screen (006 Q5 default, PO decision 2026-10-12 — BUG-E02-B-01).
  under_maintenance: {
    badgeClassName: 'border-warning/20 bg-warning/15 text-warning gap-1 text-xs font-medium',
    dotClassName: 'bg-warning',
  },
  discarded: {
    badgeClassName:
      'border-muted-foreground/20 bg-muted text-muted-foreground gap-1 text-xs font-medium',
    dotClassName: 'bg-muted-foreground',
  },
};
