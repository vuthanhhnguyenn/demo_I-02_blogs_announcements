'use client';

// Interactive: dropdown menu with click handlers.
import { MoreHorizontal, Undo2 } from 'lucide-react';

import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { SuspWdrListItemDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { CancellationBlockedReason, LeaveStatus, LeaveType } from '../_constants/constants';

type LeaveRow = SuspWdrListItemDto;

interface Props {
  row: LeaveRow;
  onCancelClick: (row: LeaveRow) => void;
}

export function LeavesRowActions({ row, onCancelClick }: Readonly<Props>) {
  // FR-041 — suspension rows carry no row action at all, so no trigger is rendered.
  if (row.applicationType !== LeaveType.WITHDRAWAL) return null;

  // FR-042 — cancellability is server-derived; never recomputed from dates here (research.md §4).
  const canCancel =
    row.displayStatus === LeaveStatus.WITHDRAWAL_SCHEDULED && row.cancellable === true;

  const blockedTooltip =
    row.cancellationBlockedReason === CancellationBlockedReason.USAGE_STARTED
      ? '利用開始日以降のため取り消し不可'
      : '退会処理が開始されているため取り消し不可';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-muted flex size-8 items-center justify-center rounded-md">
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Cancelling a scheduled withdrawal is gated by A-03 権限マトリクス / FR-006. */}
        <RoleGatedMenuItem
          requiredPermission={Permission.MembersCancelWithdrawal}
          disabled={!canCancel}
          tooltip={canCancel ? undefined : blockedTooltip}
          className={canCancel ? undefined : 'cursor-not-allowed opacity-50'}
          onClick={() => onCancelClick(row)}
        >
          <Undo2 className="size-4" />
          退会取り消し
        </RoleGatedMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
