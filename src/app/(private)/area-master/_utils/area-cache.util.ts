import type { QueryClient } from '@tanstack/react-query';

import {
  adminAreaControllerDetailQueryKey,
  adminAreaControllerListQueryKey,
  adminCampaignControllerListStoreCampaignsQueryKey,
  adminConnectedDeviceControllerDetailQueryKey,
  adminConnectedDeviceControllerListQueryKey,
  adminOptionControllerDetailQueryKey,
  adminOptionControllerListQueryKey,
  adminPlanControllerDetailQueryKey,
  adminPlanControllerListQueryKey,
  adminStoreSettingsControllerListOptionsQueryKey,
  adminStoreSettingsControllerListPlansQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { invalidateOperation } from '@/lib/query-id.util';

/**
 * 使われている所 of the area master (E-02 FR-016): an area's usage counts change whenever a plan, an
 * option or an エリア扉 starts or stops using it. The list column, the sheet and the 削除 guard all
 * read them.
 *
 * Without this, `staleTime: 2 * 60 * 1000` + `refetchOnWindowFocus: false`
 * (`src/providers/react-query.provider.tsx`) keeps the old counts for up to two minutes.
 */
export function invalidateAreaUsageCaches(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: adminAreaControllerListQueryKey() });
  invalidateOperation(queryClient, adminAreaControllerDetailQueryKey({ path: { areaId: '' } }));
}

/**
 * The sale / grant candidates filtered by gender (E-02 FR-016): the store's plans and options offered
 * on member detail, and the store campaigns offered on enrolment. The filter folds in the 性別の条件
 * of the areas a plan / option uses, so it moves with either.
 */
export function invalidateGenderCandidateCaches(queryClient: QueryClient) {
  invalidateOperation(
    queryClient,
    adminStoreSettingsControllerListPlansQueryKey({ path: { id: '' } }),
  );
  invalidateOperation(
    queryClient,
    adminStoreSettingsControllerListOptionsQueryKey({ path: { id: '' } }),
  );
  invalidateOperation(
    queryClient,
    adminCampaignControllerListStoreCampaignsQueryKey({ path: { id: '' } }),
  );
}

/**
 * Everything that shows an area's name or 性別の条件, refreshed after the area itself changes: the
 * devices (エリア扉 badge and 利用制御ルール card), the plans' and options' 利用できるエリア, and the
 * gender-filtered sale candidates.
 */
export function invalidateAreaReaderCaches(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: adminConnectedDeviceControllerListQueryKey() });
  invalidateOperation(
    queryClient,
    adminConnectedDeviceControllerDetailQueryKey({ path: { deviceId: '' } }),
  );
  void queryClient.invalidateQueries({ queryKey: adminPlanControllerListQueryKey() });
  invalidateOperation(queryClient, adminPlanControllerDetailQueryKey({ path: { planId: '' } }));
  void queryClient.invalidateQueries({ queryKey: adminOptionControllerListQueryKey() });
  invalidateOperation(queryClient, adminOptionControllerDetailQueryKey({ path: { optionId: '' } }));
  invalidateGenderCandidateCaches(queryClient);
}
