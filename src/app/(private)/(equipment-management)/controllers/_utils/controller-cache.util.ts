import type { QueryClient } from '@tanstack/react-query';

import {
  adminConnectedDeviceControllerDetailQueryKey,
  adminConnectedDeviceControllerListQueryKey,
  adminRelayControllerControllerDetailQueryKey,
  adminRelayControllerControllerHistoryQueryKey,
  adminRelayControllerControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AdminRelayControllerControllerListData,
  RelayControllerListResponseDto,
} from '@/lib/api-real/types.gen';
import { invalidateOperation } from '@/lib/query-id.util';

/**
 * Every screen that reads a contact-control device's own fields, and therefore every query an edit
 * or a status change makes stale:
 *
 * - the controller list, under **any** filter / sort / page combination — passing no options keeps
 *   the key at its prefix so all of them are matched, not just the one on screen;
 * - the controller's own detail screen, and its 変更履歴 tab (a status change appends a row);
 * - the connected devices hanging off it — 接続機器詳細 renders the controller's 装置名 / IP /
 *   ステータス through `relayController`, and the 接続機器一覧 rows carry `relayControllerName`. Which devices those are is not known here (the response does not say), so both
 *   equipment queries are matched at their prefix / operation.
 *
 * Without this, `staleTime: 2 * 60 * 1000` + `refetchOnWindowFocus: false`
 * (`src/providers/react-query.provider.tsx`) serves the pre-change controller for up to two
 * minutes, even after navigating away and back.
 */
export function invalidateControllerCaches(queryClient: QueryClient, controllerId?: string) {
  void queryClient.invalidateQueries({ queryKey: adminRelayControllerControllerListQueryKey() });

  if (controllerId) {
    void queryClient.invalidateQueries({
      queryKey: adminRelayControllerControllerDetailQueryKey({
        path: { relayControllerId: controllerId },
      }),
    });
    void queryClient.invalidateQueries({
      queryKey: adminRelayControllerControllerHistoryQueryKey({
        path: { relayControllerId: controllerId },
      }),
    });
  }

  void queryClient.invalidateQueries({ queryKey: adminConnectedDeviceControllerListQueryKey() });
  invalidateOperation(
    queryClient,
    adminConnectedDeviceControllerDetailQueryKey({ path: { deviceId: '' } }),
  );
}

/**
 * Create and delete touch the same queries as an edit; the layout tab counts are list queries
 * (`limit: 1`), so the list prefix already covers them.
 */
export function invalidateControllerRosterCaches(queryClient: QueryClient, controllerId?: string) {
  invalidateControllerCaches(queryClient, controllerId);
}

type ControllerListQuery = NonNullable<AdminRelayControllerControllerListData['query']>;

/** The conditions that decide a list's result set; sort / page / limit only reorder or slice it. */
type ControllerResultSet = Pick<ControllerListQuery, 'q' | 'storeId' | 'status'>;

/**
 * BUG-E02-D-09 — `freshTotal` was just served for `resultSet`. Every other cached controller list
 * over the same result set (another sort or page, the layout's `limit: 1` tab count) must report
 * the same `totalItems`; one that does not predates a create / delete made elsewhere, so it is
 * invalidated — refetched now while on screen, on its next use otherwise.
 */
export function invalidateDivergentControllerLists(
  queryClient: QueryClient,
  resultSet: ControllerResultSet,
  freshTotal: number,
) {
  const isSameResultSet = (query: ControllerListQuery | undefined) =>
    (query?.q || undefined) === (resultSet.q || undefined) &&
    (query?.storeId || undefined) === (resultSet.storeId || undefined) &&
    (query?.status || undefined) === (resultSet.status || undefined);

  void queryClient.invalidateQueries({
    queryKey: adminRelayControllerControllerListQueryKey(),
    predicate: (query) => {
      const [params] = query.queryKey as [{ _infinite?: boolean; query?: ControllerListQuery }];
      // useInfiniteQuery caches (the 接続機器 controller picker) hold `{ pages, pageParams }`, with
      // no top-level `pagination` — they share the list prefix but are not plain list responses.
      if (params?._infinite) return false;

      const cached = query.state.data as RelayControllerListResponseDto | undefined;
      return (
        isSameResultSet(params?.query) &&
        cached?.pagination !== undefined &&
        cached.pagination.totalItems !== freshTotal
      );
    },
  });
}

/**
 * A deleted controller's own detail query is dropped only once its detail screen has unmounted:
 * invalidating it while mounted refetches into a 404 (`E-DEV-010`) and flashes the error state
 * before the list appears — the same reason `removeDeletedEquipmentQueries` exists.
 */
export function removeDeletedControllerQueries(queryClient: QueryClient, controllerId: string) {
  queryClient.removeQueries({
    queryKey: adminRelayControllerControllerDetailQueryKey({
      path: { relayControllerId: controllerId },
    }),
  });
}
