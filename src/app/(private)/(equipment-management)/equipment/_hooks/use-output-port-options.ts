import { useQuery } from '@tanstack/react-query';

import {
  adminConnectedDeviceControllerListOptions,
  adminRelayControllerControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { EQUIPMENT_OUTPUT_PORT_DEFAULT_COUNT } from '../_schemas/equipment-form.schema';

/**
 * API-103 page cap. `sort=outputPort` puts the port-holding devices first (NULLS LAST, so 認証方式
 * なし devices come after them). Devices may share a port, so port holders can outnumber 制御ポート数;
 * a page of 100 still covers every port a controller realistically carries.
 */
const CONTROLLER_DEVICES_LIMIT = 100;

export type OutputPortOption = {
  port: number;
  /** Names of the other devices already wired to this port (empty when free). */
  usedBy: string[];
};

/**
 * 出力ポート choices for the chosen relay controller (spec 007, Session 2026-10-12): 1 … the
 * controller's 制御ポート数 (8 when unrecorded, as API-103 does), each with the other devices already
 * on that port so the Select can show them. Every port stays selectable — devices may share a port,
 * e.g. an 入館ゲート and a 退館ゲート on one physical gate (Session 2026-11-09). The device being
 * edited is excluded so it never lists itself.
 */
export function useOutputPortOptions(controllerId: string, editingDeviceId?: string) {
  const { data: controller, isLoading: isControllerLoading } = useQuery({
    ...adminRelayControllerControllerDetailOptions({
      path: { relayControllerId: controllerId },
    }),
    enabled: Boolean(controllerId),
  });

  const { data: devices, isLoading: isDevicesLoading } = useQuery({
    ...adminConnectedDeviceControllerListOptions({
      query: {
        storeId: controller?.storeId ?? '',
        relayControllerId: controllerId,
        limit: CONTROLLER_DEVICES_LIMIT,
        sort: 'outputPort',
        order: 'asc',
      },
    }),
    enabled: Boolean(controllerId && controller?.storeId),
  });

  const portCount = controller
    ? (controller.controlPortCount ?? EQUIPMENT_OUTPUT_PORT_DEFAULT_COUNT)
    : 0;
  const usedBy = new Map<number, string[]>();
  for (const device of devices?.items ?? []) {
    if (device.id !== editingDeviceId && device.outputPort !== null) {
      usedBy.set(device.outputPort, [...(usedBy.get(device.outputPort) ?? []), device.name]);
    }
  }

  const options: OutputPortOption[] = Array.from({ length: portCount }, (_, index) => ({
    port: index + 1,
    usedBy: usedBy.get(index + 1) ?? [],
  }));

  return {
    options,
    isLoading: Boolean(controllerId) && (isControllerLoading || isDevicesLoading),
  };
}
