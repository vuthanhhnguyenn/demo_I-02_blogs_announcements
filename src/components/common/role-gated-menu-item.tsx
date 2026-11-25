'use client';

/**
 * RoleGatedMenuItem — Switches a DropdownMenuItem between normal / disabled+Badge based on role or permission flag.
 *
 * Usage (role-based):
 * ```tsx
 * <RoleGatedMenuItem allowedRoles={[UserRole.Headquarter, UserRole.System]} onClick={handleEdit}>
 *   <Pencil className="size-4" /> Edit
 * </RoleGatedMenuItem>
 * ```
 *
 * Usage (permission-based):
 * ```tsx
 * <RoleGatedMenuItem requiredPermission={Permission.StaffsDelete}>
 *   Delete
 * </RoleGatedMenuItem>
 * ```
 *
 * Access logic:
 * - allowedRoles only: allowed if the current role matches any entry
 * - requiredPermission only: allowed if the user holds the permission flag
 * - both specified: AND condition
 * - neither specified: always allowed
 *
 * When denied:
 * - Button is disabled + aria-disabled
 * - A badge (default "本部") is appended at the end; customize via denyBadge
 */
import type { ComponentProps, MouseEvent, ReactNode } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import type { PermissionVerdict } from '@/utils/permission.util';

import { Badge } from '@/components/ui/badge';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

import { Permission, UserRole } from '@/types/permission.type';

const ALLOWED: PermissionVerdict = { allowed: true };

interface RoleGatedMenuItemProps extends ComponentProps<typeof DropdownMenuItem> {
  /** Roles that are allowed to perform this action */
  allowedRoles?: readonly UserRole[];
  /** Permission flag required for this action */
  requiredPermission?: Permission;
  /**
   * Badge label shown when access is denied. Defaults to "本部" for a role denial
   * and "職位" when the role allows the action but the user's position does not.
   */
  denyBadge?: string;
  /** Optional tooltip shown even when the user is allowed (e.g. to explain why the button might be disabled) */
  tooltip?: string;
  /** Side the tooltip opens on (default: the tooltip's own default, top) */
  tooltipSide?: ComponentProps<typeof TooltipContent>['side'];
  children: ReactNode;
}

export function RoleGatedMenuItem({
  allowedRoles,
  requiredPermission,
  denyBadge,
  children,
  onClick,
  className,
  disabled,
  tooltip: externalTooltip,
  tooltipSide,
  ...props
}: RoleGatedMenuItemProps) {
  const { hasRole, checkPermission } = useAuthUser();

  const roleAllowed = allowedRoles ? hasRole(allowedRoles) : true;
  const verdict = requiredPermission ? checkPermission(requiredPermission) : ALLOWED;
  const allowed = roleAllowed && verdict.allowed;
  // '本部' is only truthful for a role-tier denial. When the role would allow the
  // action but the user's 職位 was not granted the flag, say 職位 instead.
  const resolvedDenyBadge =
    denyBadge ?? (!verdict.allowed && verdict.reason === 'position' ? '職位' : '本部');

  // Case 1: no permission → disabled + badge, no tooltip
  // Case 2: has permission + parent disabled + tooltip → disabled + show tooltip
  // Case 3: has permission + not disabled → normal click
  const isDisabled = !allowed || !!disabled;
  const tooltipContent = allowed ? externalTooltip : null;

  const wrapperClassName = cn(isDisabled && 'flex cursor-not-allowed');
  const handleWrapperClickCapture = isDisabled
    ? (e: MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
      }
    : undefined;

  const menuItem = (
    <DropdownMenuItem
      {...props}
      className={className}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick?.(e);
      }}
      disabled={isDisabled}
    >
      {children}
      {!allowed && (
        <Badge
          variant="outline"
          className="border-border text-muted-foreground ml-auto h-4 shrink-0 rounded-sm px-1 text-[9px]"
        >
          {resolvedDenyBadge}
        </Badge>
      )}
    </DropdownMenuItem>
  );

  // The Tooltip swallows Escape while the item holds focus, which kept the whole menu open —
  // so it is only mounted when there is something to explain.
  if (!tooltipContent) {
    return (
      <div className={wrapperClassName} onClickCapture={handleWrapperClickCapture}>
        {menuItem}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<div className={wrapperClassName} onClickCapture={handleWrapperClickCapture} />}
        >
          {menuItem}
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          <p className="text-xs">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
