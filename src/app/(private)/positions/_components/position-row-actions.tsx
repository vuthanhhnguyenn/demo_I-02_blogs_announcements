'use client';

// Client component: dropdown menu interaction + role-gated actions
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { PositionListItemDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import {
  SYSTEM_MANAGED_DELETE_TOOLTIP,
  SYSTEM_MANAGED_EDIT_TOOLTIP,
} from '../_constants/position.constants';

type PositionRowActionsProps = {
  position: PositionListItemDto;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
};

export function PositionRowActions({
  position,
  onEdit,
  onClone,
  onDelete,
}: PositionRowActionsProps) {
  const hasAssignedStaff = position.staffCount > 0;
  // システム管理の職位は API 側で読み取り専用 (422 E-STF-012) — UI でも編集/削除を塞ぐ (D7)
  const isSystemManaged = position.isSystemManaged;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-muted flex size-8 items-center justify-center rounded-md">
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <RoleGatedMenuItem
          requiredPermission={Permission.PositionsEdit}
          onClick={onEdit}
          disabled={isSystemManaged}
          tooltip={isSystemManaged ? SYSTEM_MANAGED_EDIT_TOOLTIP : undefined}
        >
          <Pencil className="size-4" />
          編集
        </RoleGatedMenuItem>
        <RoleGatedMenuItem requiredPermission={Permission.PositionsCreate} onClick={onClone}>
          <Copy className="size-4" />
          複製
        </RoleGatedMenuItem>
        <DropdownMenuSeparator />
        {hasAssignedStaff ? (
          // 割当スタッフが1名以上いる職位は削除不可 (FR-014 / PAR027) — API 側は 409 E-STF-011
          <DropdownMenuItem
            className="text-muted-foreground"
            disabled
            onSelect={(event) => event.preventDefault()}
          >
            <Trash2 className="size-4" />
            削除（割当あり）
          </DropdownMenuItem>
        ) : (
          <RoleGatedMenuItem
            requiredPermission={Permission.PositionsDelete}
            className="text-destructive"
            onClick={onDelete}
            disabled={isSystemManaged}
            tooltip={isSystemManaged ? SYSTEM_MANAGED_DELETE_TOOLTIP : undefined}
          >
            <Trash2 className="size-4" />
            削除
          </RoleGatedMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
