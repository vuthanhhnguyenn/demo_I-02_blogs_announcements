import type { RelayControllerListItemDto } from '@/lib/api-real/types.gen';

import {
  EQUIPMENT_STATUS_BADGE_MAP,
  EQUIPMENT_STATUS_LABELS,
  type EquipmentStatus,
} from '../../equipment/_constants/constants';

export type ControllerStatus = RelayControllerListItemDto['status'];

/**
 * API-104 uses the connected device's own enum (正常 / 異常 / メンテナンス中 / 廃棄, PO Q3), so the
 * controller shares the device's label and badge maps instead of keeping a second wording. The
 * assertion fails `tsc` if the two BE enums ever drift apart.
 */
type AssertSameEnum<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _controllerStatusMatchesDevice: AssertSameEnum<ControllerStatus, EquipmentStatus> = true;
void _controllerStatusMatchesDevice;

export const CONTROLLER_STATUS_LABELS: Record<ControllerStatus, string> = EQUIPMENT_STATUS_LABELS;

export const CONTROLLER_STATUS_BADGE_MAP: Record<
  ControllerStatus,
  { badgeClassName: string; dotClassName: string }
> = EQUIPMENT_STATUS_BADGE_MAP;

export const CONTROLLER_STATUS_VALUES = [
  'normal',
  'abnormal',
  'under_maintenance',
  'discarded',
] as const satisfies readonly ControllerStatus[];

// Form helper texts (sourced from the prototype controller form)
export const CONTROLLER_FORM_HELPER_TEXTS = {
  ipAddress: 'ローカルIPアドレス形式（例: 192.168.1.100）',
  firmwareVersion: '装置のラベルまたは設定画面に表示される vN.N.N 形式',
  controlPortCount: '装置の物理ポート数（通常 4 / 8 / 16）',
} as const;

export const CONTROLLER_LIST_COLUMN_HEADERS = {
  id: '装置ID',
  name: '装置名',
  storeCode: '店舗コード',
  location: '設置場所',
  ipAddress: 'IPアドレス',
  firmwareVersion: 'FW',
  controlPortCount: '制御ポート数',
  connectedDeviceCount: '紐付き機器数',
  status: 'ステータス',
} as const;
