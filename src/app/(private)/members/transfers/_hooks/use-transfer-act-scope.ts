import { useCallback } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';

import { UserRole } from '@/types/permission.type';

import {
  TRANSFER_APPLICATION_STATUS,
  type TransferApplicationStatus,
} from '../_constants/constants';

/** The slice of a list item / detail the rule reads — both screens satisfy it. */
interface ActScopeTransfer {
  status: TransferApplicationStatus;
  fromStore: { storeId: string; name: string | null };
  toStore: { storeId: string; name: string | null };
}

/**
 * A-02 権限マトリクス「Staff ○ 所属店舗分」: only the store that owns the current approval step
 * may approve or reject it — the source store while 移籍元承認待ち, the destination store while
 * 移籍先承認待ち. HQ/System act on every store.
 *
 * The API returns no per-row "can act" flag, so this mirrors the prototype's rule against the
 * stores `/crm/me` authorises (and the header store selection, when one is picked).
 * Returns the reason the row is blocked, or `null` when the user may act.
 */
export function useTransferActScope() {
  const { user, hasRole } = useAuthUser();
  const { currentStoreId } = useCurrentStore();

  return useCallback(
    (transfer: ActScopeTransfer): string | null => {
      const isSourceStep = transfer.status === TRANSFER_APPLICATION_STATUS.PENDING_SOURCE_APPROVAL;
      const isDestinationStep =
        transfer.status === TRANSFER_APPLICATION_STATUS.PENDING_DESTINATION_APPROVAL;
      if (!isSourceStep && !isDestinationStep) return null;
      if (hasRole([UserRole.System, UserRole.Headquarter])) return null;

      const approvingStore = isSourceStep ? transfer.fromStore : transfer.toStore;
      const allowedStoreIds = new Set(
        user?.managedStoreIds.length ? user.managedStoreIds : user?.storeId ? [user.storeId] : [],
      );
      const canAct =
        currentStoreId !== ALL_STORES
          ? currentStoreId === approvingStore.storeId
          : allowedStoreIds.has(approvingStore.storeId);
      if (canAct) return null;

      const side = isSourceStep ? '移籍元' : '移籍先';
      return `${side}店舗（${approvingStore.name ?? '—'}）の承認待ちのため、所属店舗からは操作できません`;
    },
    [user, hasRole, currentStoreId],
  );
}
