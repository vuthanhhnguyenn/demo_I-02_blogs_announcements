import { invalidateAreaUsageCaches } from '@/app/(private)/area-master/_utils/area-cache.util';
import type { QueryClient } from '@tanstack/react-query';

import {
  adminConnectedDeviceControllerDetailQueryKey,
  adminConnectedDeviceControllerHistoryQueryKey,
  adminConnectedDeviceControllerListQueryKey,
  adminRelayControllerControllerDetailQueryKey,
  adminRelayControllerControllerDevicesQueryKey,
  adminRelayControllerControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { invalidateOperation } from '@/lib/query-id.util';

/**
 * Every screen that reads a connected device's status, and therefore every query a status change
 * makes stale. A device's status is not local to the list it was changed from:
 *
 * - the list itself, under **any** filter / sort / page combination — passing no options keeps the
 *   key at its prefix so all of them are matched, not just the one on screen;
 * - the device's own detail card, and its 変更履歴 tab (a transition appends a history row);
 * - the contact-control device it hangs off — the detail screen's 紐付き機器サマリー counts device
 *   statuses and the 紐付き機器一覧 tab renders each device's status badge. A bulk change spans
 *   devices from several controllers and the response does not say which, so both controller
 *   queries are matched at their prefix.
 *
 * - the contact-control device list — its 接続機器数 column counts the devices hanging off each
 *   controller, so adding, deleting or moving a device changes it (for the old and the new
 *   controller alike). Matched at its prefix to cover every filter / sort / page.
 *
 * - the area master's 使われている所 — an エリア扉 counts as a use of its area, so adding,
 *   deleting or re-pointing one changes the counts that gate the area's 削除.
 *
 * Without this, `staleTime: 2 * 60 * 1000` + `refetchOnWindowFocus: false`
 * (`src/providers/react-query.provider.tsx`) serves the pre-change status for up to two minutes,
 * even after navigating away and back.
 */
export function invalidateEquipmentStatusCaches(
  queryClient: QueryClient,
  deviceIds: readonly string[],
) {
  invalidateEquipmentSharedCaches(queryClient);

  for (const deviceId of deviceIds) {
    void queryClient.invalidateQueries({
      queryKey: adminConnectedDeviceControllerDetailQueryKey({ path: { deviceId } }),
    });
    void queryClient.invalidateQueries({
      queryKey: adminConnectedDeviceControllerHistoryQueryKey({ path: { deviceId } }),
    });
  }
}

/**
 * The queries shared by every device change: the device list (which also backs the layout tab
 * count and the controller detail's 紐付き機器一覧 / サマリー, D16) and the controller screens.
 */
function invalidateEquipmentSharedCaches(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: adminConnectedDeviceControllerListQueryKey() });
  invalidateAreaUsageCaches(queryClient);
  void queryClient.invalidateQueries({ queryKey: adminRelayControllerControllerListQueryKey() });
  invalidateOperation(
    queryClient,
    adminRelayControllerControllerDetailQueryKey({ path: { relayControllerId: '' } }),
  );
  invalidateOperation(
    queryClient,
    adminRelayControllerControllerDevicesQueryKey({ path: { relayControllerId: '' } }),
  );
}

/**
 * Create and delete touch the same queries as a status change; the layout tab counts are list
 * queries (`limit: 1`), so the list prefix already covers them.
 *
 * A deleted device's own detail / history queries are left untouched here: the detail screen is
 * still mounted while the router navigates away, and invalidating (refetch → 404) or removing
 * (data → undefined) them would flash the error / empty state before the list appears. The delete
 * dialog calls `removeDeletedEquipmentQueries` once the detail screen has unmounted.
 */
export function invalidateEquipmentRosterCaches(queryClient: QueryClient) {
  invalidateEquipmentSharedCaches(queryClient);
}

export function removeDeletedEquipmentQueries(queryClient: QueryClient, deviceId: string) {
  queryClient.removeQueries({
    queryKey: adminConnectedDeviceControllerDetailQueryKey({ path: { deviceId } }),
  });
  queryClient.removeQueries({
    queryKey: adminConnectedDeviceControllerHistoryQueryKey({ path: { deviceId } }),
  });
}
