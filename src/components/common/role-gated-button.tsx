'use client';

/**
 * RoleGatedButton
 *
 * Renders a Button that is automatically disabled + wrapped in a Tooltip
 * when the current user lacks the required role or permission.
 *
 * Usage — role-based:
 * ```tsx
 * <RoleGatedButton allowedRoles={[UserRole.System, UserRole.Headquarter]} onClick={...}>
 *   <Plus className="size-4" /> 新規登録
 * </RoleGatedButton>
 * ```
 *
 * Usage — permission-based:
 * ```tsx
 * <RoleGatedButton requiredPermission={Permission.StaffsInvite} onClick={...}>
 *   招待
 * </RoleGatedButton>
 * ```
 *
 * Logic:
 * - allowedRoles only  → user's role must be in the list
 * - requiredPermission only → user must hold the permission
 * - both specified    → AND (role AND permission must pass)
 * - neither specified → always allowed
 *
 * When denied:
 * - Button is disabled + aria-disabled
 * - Wrapped in a Tooltip showing `denyTooltip`
 */
import { type ComponentProps, type ReactNode } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import type { PermissionVerdict } from '@/utils/permission.util';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

import { Permission, UserRole } from '@/types/permission.type';

const ALLOWED: PermissionVerdict = { allowed: true };

interface RoleGatedButtonProps extends ComponentProps<typeof Button> {
  /** Roles that are permitted to use this action */
  allowedRoles?: readonly UserRole[];
  /** Fine-grained permission required (on top of, or instead of, role check) */
  requiredPermission?: Permission;
  /**
   * Tooltip shown when the user is not allowed. Defaults to copy derived from the
   * denial reason — '権限がありません' for a role denial, 'この操作は職位に許可されて
   * いません' when the role allows it but the user's 職位 was not granted the flag.
   */
  denyTooltip?: string;
  /** Optional tooltip shown even when the user is allowed (e.g. to explain why the button might be disabled) */
  tooltip?: string;
  /** Stretch the trigger wrapper and button to full container width */
  fullWidth?: boolean;
  children: ReactNode;
}

export function RoleGatedButton({
  allowedRoles,
  requiredPermission,
  denyTooltip,
  children,
  className,
  disabled: externalDisabled,
  tooltip: externalTooltip,
  fullWidth = false,
  onClick,
  ...props
}: Readonly<RoleGatedButtonProps>) {
  const { hasRole, checkPermission, isLoading } = useAuthUser();

  const roleAllowed = allowedRoles ? hasRole(allowedRoles) : true;
  const verdict = requiredPermission ? checkPermission(requiredPermission) : ALLOWED;
  const allowed = roleAllowed && verdict.allowed;
  // Deny copy has to tell the two failures apart: a role can never be changed by
  // the operator, a 職位 grant can (ask an administrator to edit the position).
  const resolvedDenyTooltip =
    denyTooltip ??
    (isLoading
      ? '権限を確認中です'
      : !verdict.allowed && verdict.reason === 'position'
        ? 'この操作は職位に許可されていません'
        : '権限がありません');
  const triggerClassName = cn('inline-flex', fullWidth && 'w-full');
  const buttonClassName = cn(fullWidth && 'w-full', className);

  if (allowed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className={triggerClassName} />}>
            <Button
              className={buttonClassName}
              onClick={onClick}
              disabled={externalDisabled}
              {...props}
            >
              {children}
            </Button>
          </TooltipTrigger>
          {externalTooltip && (
            <TooltipContent>
              <p className="text-xs">{externalTooltip}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        {/* span wrapper is required because a disabled button swallows pointer events; it is
            focusable so keyboard users can reach the deny reason too (a disabled button is skipped). */}
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              className={cn(
                triggerClassName,
                'focus-visible:ring-ring/50 cursor-not-allowed rounded-lg outline-none focus-visible:ring-3',
              )}
            />
          }
        >
          <Button
            {...props}
            disabled
            aria-disabled="true"
            className={cn('pointer-events-none opacity-50', buttonClassName)}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{resolvedDenyTooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
