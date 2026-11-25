import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { adminConnectedDeviceControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { RelayControllerDetailDto } from '@/lib/api-real/types.gen';

import type { EquipmentStatus } from '../../equipment/_constants/constants';

type ControllerRef = Pick<RelayControllerDetailDto, 'id' | 'storeId'>;

/**
 * One page of the devices hanging off a controller (D16). The connected-device list is used rather
 * than `/relay-controllers/{id}/connected-devices` because only it carries `outputPort`
 * (接点制御先番号). Paged on the server: devices with 認証方式 なし take no output port, so the
 * number of devices on a controller is not bounded by its 8 relay outputs.
 */
export function useControllerDevices(
  controller: ControllerRef,
  pagination: { page: number; limit: number },
) {
  return useQuery({
    ...adminConnectedDeviceControllerListOptions({
      query: {
        storeId: controller.storeId,
        relayControllerId: controller.id,
        page: pagination.page,
        limit: pagination.limit,
        sort: 'outputPort',
        order: 'asc',
      },
    }),
    placeholderData: keepPreviousData,
  });
}

function useControllerDeviceCount(controller: ControllerRef, status: EquipmentStatus) {
  return useQuery({
    ...adminConnectedDeviceControllerListOptions({
      query: {
        storeId: controller.storeId,
        relayControllerId: controller.id,
        status,
        limit: 1,
      },
    }),
    select: (data) => data.pagination.totalItems,
  });
}

/**
 * 正常 / 異常 counts for the 紐付き機器サマリー card and the devices tab footer, each the
 * `totalItems` of a one-row list request — exact whatever the number of devices. `undefined`
 * while loading or after a failure, so the screens render 「—」 rather than a false 0台
 * (BUG-E02-E-05).
 */
export function useControllerDeviceStatusCounts(controller: ControllerRef) {
  const normal = useControllerDeviceCount(controller, 'normal');
  const abnormal = useControllerDeviceCount(controller, 'abnormal');
  return { normal: normal.data, abnormal: abnormal.data };
}
