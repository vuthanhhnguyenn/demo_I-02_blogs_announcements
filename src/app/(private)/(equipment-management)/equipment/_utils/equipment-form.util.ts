import type {
  ConnectedDeviceDetailDto,
  CreateConnectedDeviceDto,
  PutDeviceUsageControlDto,
  UpdateConnectedDeviceDto,
} from '@/lib/api-real/types.gen';

import {
  DEVICE_ERROR_CODE,
  getDeviceErrorCode,
  getValidationErrorFields,
} from '../../_utils/device-api.util';
import {
  type EquipmentFormSubmitValues,
  type EquipmentFormValues,
  isAreaDoor,
} from '../_schemas/equipment-form.schema';

export const emptyEquipmentFormDefaults: EquipmentFormValues = {
  name: '',
  equipment_type: '' as EquipmentFormValues['equipment_type'],
  serial_number: '',
  install_location: '',
  installed_on: '',
  status: 'normal',
  authentication_method: '' as EquipmentFormValues['authentication_method'],
  controller_id: '',
  output_port: '',
  ip_address: '',
  mac_address: '',
  usage_control_rule: {
    main_enabled: false,
    main_scope: '',
    main_contract_types: [],
    service_enabled: false,
    service_types: [],
  },
  area_id: '',
  remarks: '',
};

// The form keeps its own snake_case field names (they are react-hook-form keys, not API
// fields); this module is the single place that maps them onto the API's camelCase contract.
export function equipmentDetailToFormValues(detail: ConnectedDeviceDetailDto): EquipmentFormValues {
  return {
    name: detail.name,
    equipment_type: detail.deviceType,
    serial_number: detail.serialNumber ?? '',
    install_location: detail.location ?? '',
    installed_on: detail.installedOn ?? '',
    status: detail.status,
    authentication_method: detail.authMethod,
    controller_id: detail.relayControllerId ?? '',
    output_port: detail.outputPort === null ? '' : String(detail.outputPort),
    ip_address: detail.ipAddress ?? '',
    mac_address: detail.macAddress ?? '',
    usage_control_rule: {
      main_enabled: detail.isMainContractRequired,
      // `[]` while the axis is on = 「全て」 (API-103 §6.6).
      main_scope: detail.isMainContractRequired
        ? detail.allowedContractTypes.length > 0
          ? 'specified'
          : 'all'
        : '',
      main_contract_types: [...detail.allowedContractTypes],
      service_enabled: detail.allowedServiceTypes.length > 0,
      service_types: [...detail.allowedServiceTypes],
    },
    area_id: detail.areaId ?? '',
    remarks: detail.note ?? '',
  };
}

/**
 * `POST /admin/connected-devices` (API-103 §6.1). The FR-008 usage-control rule travels in the
 * same body, so the device and its rule are written in one transaction (Q9). `outputPort` must be
 * null for 認証方式 なし (`E-VAL-001`), whatever the form still holds.
 */
export function equipmentFormValuesToCreateBody(
  values: EquipmentFormSubmitValues,
): CreateConnectedDeviceDto {
  // E-02 FR-003 / FR-008: an エリア扉 carries its area and no usage-control rule (the API refuses one).
  if (isAreaDoor(values.equipment_type))
    return { ...toDeviceFields(values), areaId: values.area_id };
  return { ...toDeviceFields(values), ...toUsageControlBody(values) };
}

/** The device's own columns, shared by the create body and the PATCH diff. */
function toDeviceFields(values: EquipmentFormSubmitValues) {
  return {
    relayControllerId: values.controller_id,
    name: values.name.trim(),
    deviceType: values.equipment_type,
    serialNumber: values.serial_number.trim(),
    location: values.install_location.trim(),
    installedOn: values.installed_on,
    status: values.status,
    authMethod: values.authentication_method,
    outputPort:
      values.authentication_method === 'none' || values.output_port === ''
        ? null
        : Number(values.output_port),
    ipAddress: values.ip_address.trim() || null,
    macAddress: values.mac_address.trim() || null,
    note: values.remarks.trim() || null,
  } satisfies CreateConnectedDeviceDto;
}

/**
 * `PUT …/usage-control` (API-103 §6.6), also spread into the create body. `allowedContractTypes`
 * is a set (OR): `[]` with the main axis on = 「全て」, and it must be `[]` while the axis is off.
 * An unchecked service axis sends `allowedServiceTypes: []`. The deprecated single
 * `allowedContractType` is never sent (both keys together → 400 E-VAL-001).
 */
export function toUsageControlBody(values: EquipmentFormSubmitValues): PutDeviceUsageControlDto {
  const rule = values.usage_control_rule;
  const isSpecified = rule.main_enabled && rule.main_scope === 'specified';

  return {
    isMainContractRequired: rule.main_enabled,
    allowedContractTypes: isSpecified ? rule.main_contract_types : [],
    allowedServiceTypes: rule.service_enabled ? rule.service_types : [],
  };
}

/**
 * Build a PATCH payload containing only the fields the user actually changed. `deviceType` is
 * immutable on PATCH (`E-VAL-001`), so it is never sent and the edit form disables it (D4). The
 * usage-control rule goes through `PUT …/usage-control` instead — see `isUsageControlDirty`.
 */
export function equipmentFormValuesToPatchBody(
  values: EquipmentFormSubmitValues,
  dirtyFields: Partial<Record<keyof EquipmentFormValues, unknown>>,
): UpdateConnectedDeviceDto {
  const full = toDeviceFields(values);
  const patch: UpdateConnectedDeviceDto = {};

  if (dirtyFields.name) patch.name = full.name;
  if (dirtyFields.serial_number) patch.serialNumber = full.serialNumber;
  if (dirtyFields.install_location) patch.location = full.location;
  if (dirtyFields.installed_on) patch.installedOn = full.installedOn;
  if (dirtyFields.status) patch.status = full.status;
  if (dirtyFields.authentication_method) patch.authMethod = full.authMethod;
  if (dirtyFields.controller_id) patch.relayControllerId = full.relayControllerId;
  // The API re-validates the port whenever authMethod or the controller changes, so it travels
  // with either of them as well as on its own edit.
  if (dirtyFields.output_port || dirtyFields.authentication_method || dirtyFields.controller_id) {
    patch.outputPort = full.outputPort;
  }
  if (dirtyFields.ip_address) patch.ipAddress = full.ipAddress;
  if (dirtyFields.mac_address) patch.macAddress = full.macAddress;
  if (dirtyFields.remarks) patch.note = full.note;
  if (dirtyFields.area_id && isAreaDoor(values.equipment_type) && values.area_id)
    patch.areaId = values.area_id;

  return patch;
}

/** An エリア扉 has no usage-control rule — its area travels on the PATCH instead. */
export function isUsageControlDirty(
  dirtyFields: Partial<Record<keyof EquipmentFormValues, unknown>>,
  equipmentType?: string,
): boolean {
  return !isAreaDoor(equipmentType) && Boolean(dirtyFields.usage_control_rule);
}

/** Form fields an `E-DEV-*` / `E-VAL-001` response points at (D11). */
const ERROR_FIELD_MAP: Partial<
  Record<
    string,
    { field: keyof EquipmentFormValues | 'usage_control_rule.main_contract_types'; message: string }
  >
> = {
  [DEVICE_ERROR_CODE.duplicateSerial]: {
    field: 'serial_number',
    message: 'このシリアルナンバーは店舗内ですでに登録されています',
  },
  [DEVICE_ERROR_CODE.incompatibleAuthMethod]: {
    field: 'authentication_method',
    message: 'この機器タイプでは選択できない認証方式です',
  },
  [DEVICE_ERROR_CODE.invalidController]: {
    field: 'controller_id',
    message: '選択した接点制御装置は使用できません（別店舗または削除済み）',
  },
  [DEVICE_ERROR_CODE.incompatibleContractType]: {
    field: 'usage_control_rule.main_contract_types',
    message: 'この店舗のブランドでは選択できない主契約タイプです',
  },
};

export function getEquipmentFieldError(error: unknown) {
  const code = getDeviceErrorCode(error);
  if (
    code === DEVICE_ERROR_CODE.validation &&
    getValidationErrorFields(error).includes('outputPort')
  ) {
    return { field: 'output_port', message: '出力ポートを選択してください' } as const;
  }
  if (
    code === DEVICE_ERROR_CODE.validation &&
    getValidationErrorFields(error).includes('ipAddress')
  ) {
    return { field: 'ip_address', message: 'IPアドレスの形式が正しくありません' } as const;
  }
  // エリア扉: the area is not one of the store brand's, or no longer exists (E-02 FR-003).
  if (code === DEVICE_ERROR_CODE.validation && getValidationErrorFields(error).includes('areaId')) {
    return {
      field: 'area_id',
      message: '選択したエリアは使用できません（別ブランドまたは削除済み）',
    } as const;
  }
  return code ? ERROR_FIELD_MAP[code] : undefined;
}
