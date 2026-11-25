import type {
  CreateRelayControllerDto,
  RelayControllerDetailDto,
  UpdateRelayControllerDto,
} from '@/lib/api-real/types.gen';

import { DEVICE_ERROR_CODE, getDeviceErrorCode } from '../../_utils/device-api.util';
import type {
  ControllerFormSubmitValues,
  ControllerFormValues,
} from '../_schemas/controller-form.schema';

export const emptyControllerFormDefaults: ControllerFormValues = {
  relayId: '',
  name: '',
  storeId: '',
  location: '',
  ipAddress: '',
  controlPortCount: '',
  firmwareVersion: '',
  // No preselected 状態: the prototype requires the user to choose one (see the form schema).
  status: '',
};

export function controllerDetailToFormValues(
  detail: RelayControllerDetailDto,
): ControllerFormValues {
  return {
    relayId: detail.relayId,
    name: detail.name,
    storeId: detail.storeId,
    location: detail.location ?? '',
    ipAddress: detail.ipAddress ?? '',
    controlPortCount: String(detail.controlPortCount),
    firmwareVersion: detail.firmwareVersion ?? '',
    status: detail.status,
  };
}

/** `POST /admin/relay-controllers` (API-104 §6.1). Only the FR-007 items are sent. */
export function controllerFormValuesToCreateBody(
  values: ControllerFormSubmitValues,
): CreateRelayControllerDto {
  const firmwareVersion = values.firmwareVersion.trim();

  return {
    relayId: values.relayId.trim(),
    name: values.name.trim(),
    storeId: values.storeId.trim(),
    location: values.location.trim(),
    ipAddress: values.ipAddress.trim(),
    controlPortCount: Number(values.controlPortCount),
    ...(firmwareVersion ? { firmwareVersion } : {}),
    status: values.status,
  };
}

/**
 * Build a PATCH payload containing only the fields the user actually changed. `storeId` is
 * immutable in API-104 (the edit form disables it), and every write carries the detail's
 * `updatedAt` as `expectedUpdatedAt` so a stale edit is refused with `E-DEV-014` (D13).
 */
export function controllerFormValuesToPatchBody(
  values: ControllerFormSubmitValues,
  dirtyFields: Partial<Record<keyof ControllerFormValues, unknown>>,
  expectedUpdatedAt: string,
): UpdateRelayControllerDto {
  const patch: UpdateRelayControllerDto = { expectedUpdatedAt };

  if (dirtyFields.name) patch.name = values.name.trim();
  if (dirtyFields.location) patch.location = values.location.trim();
  if (dirtyFields.ipAddress) patch.ipAddress = values.ipAddress.trim();
  if (dirtyFields.controlPortCount) {
    patch.controlPortCount = Number(values.controlPortCount);
  }
  if (dirtyFields.firmwareVersion) {
    patch.firmwareVersion = values.firmwareVersion.trim() || null;
  }
  if (dirtyFields.status) patch.status = values.status;

  return patch;
}

/** Form fields an `E-DEV-*` response points at (D11). */
const ERROR_FIELD_MAP: Partial<
  Record<string, { field: keyof ControllerFormValues; message: string }>
> = {
  [DEVICE_ERROR_CODE.duplicateRelayId]: {
    field: 'relayId',
    message: 'この接点制御装置IDはすでに登録されています',
  },
  [DEVICE_ERROR_CODE.duplicateControllerIp]: {
    field: 'ipAddress',
    message: 'このIPアドレスは店舗内ですでに使用されています',
  },
  [DEVICE_ERROR_CODE.invalidControllerSettings]: {
    field: 'controlPortCount',
    // API-104 refuses a port count below the highest 出力ポート still wired (BE-REQUESTS No.2). The device
    // count is no bound: devices may share a port (2026-11-09).
    message:
      '設定内容が不正です（制御ポート数が使用中の出力ポート番号を下回っていないか確認してください）',
  },
};

export function getControllerFieldError(error: unknown) {
  const code = getDeviceErrorCode(error);
  return code ? ERROR_FIELD_MAP[code] : undefined;
}
