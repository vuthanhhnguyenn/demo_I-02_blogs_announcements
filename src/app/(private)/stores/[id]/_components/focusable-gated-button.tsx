'use client';

import { type ComponentProps, type ReactNode } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import type { PermissionVerdict } from '@/utils/permission.util';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

import type { Permission, UserRole } from '@/types/permission.type';

const ALLOWED: PermissionVerdict = { allowed: true };

interface FocusableGatedButtonProps extends Omit<ComponentProps<typeof Button>, 'disabled'> {
  /** Roles permitted to use the action (same semantics as `RoleGatedButton`) */
  allowedRoles?: readonly UserRole[];
  /** Permission required on top of / instead of the role check */
  requiredPermission?: Permission;
  /** Tooltip for a role/permission denial; defaults to the `RoleGatedButton` copy */
  denyTooltip?: string;
  /** Closes the action for everyone with this reason (e.g. a closed store), whatever the role */
  blockedReason?: string;
  /** Stretch the button to the full container width */
  fullWidth?: boolean;
  children: ReactNode;
}

/**
 * The store detail's gated actions (header 編集, ステータス変更, 店舗写真 編集) — same gate as
 * `RoleGatedButton`, but a denied control stays in the Tab order: it is `aria-disabled` (Base UI
 * `focusableWhenDisabled`) instead of native-disabled, so keyboard users reach it and the deny
 * tooltip opens on focus as well as on hover (D-FR-091 / BUG-U3-03). Base UI blocks the click and
 * Enter/Space activation of a disabled button, and no `onClick` is passed on that path anyway.
 */
export function FocusableGatedButton({
  allowedRoles,
  requiredPermission,
  denyTooltip,
  blockedReason,
  fullWidth = false,
  className,
  onClick,
  children,
  ...props
}: Readonly<FocusableGatedButtonProps>) {
  const { hasRole, checkPermission, isLoading } = useAuthUser();

  const roleAllowed = allowedRoles ? hasRole(allowedRoles) : true;
  const verdict = requiredPermission ? checkPermission(requiredPermission) : ALLOWED;
  const allowed = roleAllowed && verdict.allowed;
  const reason =
    blockedReason ??
    (allowed
      ? null
      : (denyTooltip ??
        (isLoading
          ? '権限を確認中です'
          : !verdict.allowed && verdict.reason === 'position'
            ? 'この操作は職位に許可されていません'
            : '権限がありません')));
  const buttonClassName = cn(fullWidth && 'w-full', className);

  if (reason === null) {
    return (
      <Button className={buttonClassName} onClick={onClick} {...props}>
        {children}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              {...props}
              disabled
              focusableWhenDisabled
              className={cn('cursor-not-allowed opacity-50', buttonClassName)}
            />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
