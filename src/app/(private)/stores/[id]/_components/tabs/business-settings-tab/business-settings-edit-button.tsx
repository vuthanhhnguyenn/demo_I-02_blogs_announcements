'use client';

import type { ComponentProps } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';

import { RoleGatedButton } from '@/components/common/role-gated-button';

import { Permission } from '@/types/permission.type';

import { canEditStore } from '../../../../_utils/can-edit-store.util';

type Props = Omit<
  ComponentProps<typeof RoleGatedButton>,
  'allowedRoles' | 'requiredPermission' | 'tooltip'
> & {
  storeId: string;
  denyTooltip: string;
};

/**
 * Every edit / add / delete affordance of the 営業設定 tab (FR-028, Y-02 「営業カレンダー設定」:
 * HQ / System ○, Staff 所属店舗 ○). The 職位 flag gate stays with `RoleGatedButton`; the
 * own-store half of the rule is `canEditStore` (research R10), which the flag cannot express. Both
 * failures read the same tooltip, as in the prototype.
 */
export function BusinessSettingsEditButton({ storeId, denyTooltip, disabled, ...props }: Props) {
  const { user } = useAuthUser();
  const ownStoreAllowed = canEditStore(user, storeId);

  return (
    <RoleGatedButton
      requiredPermission={Permission.StoresConfigBusiness}
      denyTooltip={denyTooltip}
      tooltip={ownStoreAllowed ? undefined : denyTooltip}
      disabled={disabled || !ownStoreAllowed}
      {...props}
    />
  );
}
