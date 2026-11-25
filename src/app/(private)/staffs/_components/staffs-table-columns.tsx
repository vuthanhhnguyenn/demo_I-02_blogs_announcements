'use client';

import { useState } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, MoreHorizontal, Pencil, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { StaffSummaryDto } from '@/lib/api-real/types.gen';

import { UserRole } from '@/types/permission.type';

import { StaffReactivateAction } from '../[id]/_components/staff-reactivate-action';
import {
  STAFF_ROLE_BADGE_CLASSES,
  STAFF_ROLE_LABELS,
  STAFF_STATUS_CLASSES,
  STAFF_STATUS_LABELS,
  type StaffRole,
  StaffStatus,
} from '../_constants/constants';
import { canEditStaffAccount } from '../_utils/can-edit-staff.util';
import { formatRelativeTime } from '../_utils/format-relative-time.util';
import { StaffDeactivateAction } from './staff-deactivate-action';
import { StaffDeleteAction } from './staff-delete-action';

type Staff = StaffSummaryDto;

interface StaffsTableColumnsProps {
  onEditClick?: (staffId: string) => void;
  onPositionClick?: (positionId: string) => void;
  onResendInvite?: (staffId: string, email: string) => void;
  isSingleStoreContext?: boolean;
}

/**
 * Table column id <-> `GET /admin/staff` `sort` query value. Only columns the API can
 * order by are wired here — `email`/`role`/`linked_*` have no server-side sort field.
 */
export const STAFF_SORT_COLUMN_TO_API_FIELD = {
  id: 'id',
  name: 'name',
  positionName: 'position',
  status: 'status',
  last_login: 'lastLogin',
} as const;

export const STAFF_SORT_API_FIELD_TO_COLUMN = {
  id: 'id',
  name: 'name',
  position: 'positionName',
  status: 'status',
  lastLogin: 'last_login',
} as const;

function ActionsCell({
  staff,
  onEditClick,
  onResendInvite,
}: {
  staff: Staff;
  onEditClick?: (staffId: string) => void;
  onResendInvite?: (staffId: string, email: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Confirmation dialogs are rendered as siblings of the DropdownMenu (not children of
  // DropdownMenuContent) — the menu's Popup unmounts its subtree whenever it closes
  // (Base UI's Menu.Item closes on click by default), which would tear down a dialog
  // mounted inside it before it could ever render. See BUG-Y01LIST-08/09.
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'reactivate' | 'delete' | null>(
    null,
  );

  // FR-013: a Manager can additionally edit this specific row when it's a "Staff"-role
  // account in one of their managed stores — same shared check the detail-page header and
  // the edit route itself use. See specs/020-staff-permission-management/research.md #15.
  const { user } = useAuthUser();
  const isManagerEditAllowed = user?.role === UserRole.Manager && canEditStaffAccount(user, staff);
  const editAllowedRoles = isManagerEditAllowed
    ? ([UserRole.Headquarter, UserRole.System, UserRole.Manager] as const)
    : ([UserRole.Headquarter, UserRole.System] as const);

  // The lifecycle action is mutually exclusive per status — offering 再招待 on an 有効 row or
  // 無効化 on an already-無効 row only produces a no-op round-trip (BUG-P2-01-06 / BUG-P2-04-14).
  const status = staff.status as StaffStatus;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="sm" />}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <RoleGatedMenuItem
            allowedRoles={editAllowedRoles}
            onClick={() => onEditClick?.(staff.id)}
          >
            <Pencil className="size-4" />
            編集
          </RoleGatedMenuItem>
          <DropdownMenuSeparator />
          {status === StaffStatus.INVITED && (
            <RoleGatedMenuItem
              allowedRoles={[UserRole.Headquarter, UserRole.System]}
              className="text-info"
              onClick={() => onResendInvite?.(staff.id, staff.email)}
            >
              <RefreshCw className="size-4" />
              再招待
            </RoleGatedMenuItem>
          )}
          {status === StaffStatus.ACTIVE && (
            <RoleGatedMenuItem
              allowedRoles={[UserRole.Headquarter, UserRole.System]}
              className="text-warning"
              onClick={() => setConfirmAction('deactivate')}
            >
              <Ban className="size-4" />
              無効化
            </RoleGatedMenuItem>
          )}
          {status === StaffStatus.INACTIVE && (
            <RoleGatedMenuItem
              allowedRoles={[UserRole.Headquarter, UserRole.System]}
              className="text-success"
              onClick={() => setConfirmAction('reactivate')}
            >
              <RotateCcw className="size-4" />
              有効化
            </RoleGatedMenuItem>
          )}
          <DropdownMenuSeparator />
          <RoleGatedMenuItem
            allowedRoles={[UserRole.Headquarter, UserRole.System]}
            className="text-destructive"
            onClick={() => setConfirmAction('delete')}
          >
            <Trash2 className="size-4" />
            削除
          </RoleGatedMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/*
        `withReason={false}` is the list screen's approved copy — parity.md PAR038 (title
        「スタッフを無効化しますか？」, no 無効化理由 field). PAR063's "このスタッフを…" +
        optional-reason variant belongs to the detail screen's StatusCard. See BUG-P2-01-12.
      */}
      <StaffDeactivateAction
        staffId={staff.id}
        staffName={staff.name}
        withReason={false}
        open={confirmAction === 'deactivate'}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setConfirmAction(null);
        }}
      />
      <StaffReactivateAction
        staffId={staff.id}
        staffName={staff.name}
        open={confirmAction === 'reactivate'}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setConfirmAction(null);
        }}
      />
      <StaffDeleteAction
        staffId={staff.id}
        mode="list"
        open={confirmAction === 'delete'}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setConfirmAction(null);
        }}
      />
    </>
  );
}

/**
 * 所属店舗 cell. A Manager may belong to several stores (spec.md "Manager multi-store
 * affiliation"), so the first is shown with a 「他N店舗」 suffix and the full list on hover.
 */
function StaffStoresCell({ stores }: { stores: StaffSummaryDto['stores'] }) {
  if (stores.length === 0) return <span className="text-muted-foreground">—</span>;
  const names = stores.map((store) => store.storeName ?? '—');
  if (names.length === 1) {
    return (
      <TextWithTooltip
        text={names[0]}
        className="text-muted-foreground max-w-40"
        wrapperClassName="min-w-0"
      />
    );
  }
  return (
    <TooltipProvider delay={100}>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="text-muted-foreground inline-flex max-w-48 min-w-0 items-center gap-1">
              <span className="truncate">{names[0]}</span>
              <span className="shrink-0 text-xs">他{names.length - 1}店舗</span>
            </span>
          }
        />
        <TooltipContent>
          <ul aria-label="所属店舗一覧">
            {names.map((name, index) => (
              <li key={stores[index].storeId}>{name}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function StaffsTableColumns({
  onEditClick,
  onPositionClick,
  onResendInvite,
  isSingleStoreContext = false,
}: StaffsTableColumnsProps): ColumnDef<Staff>[] {
  const columns: ColumnDef<Staff>[] = [
    {
      accessorKey: 'id',
      header: ({ column }) => <DataTableColumnHeader column={column} title="スタッフID" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.id}</span>,
      meta: { label: 'スタッフID' },
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="氏名" />,
      // FR-005: an 招待中 account has not registered its own name yet, so the invited
      // placeholder is masked as 「未登録」 instead of exposing the inviter's draft (BUG-P2-01-05).
      cell: ({ row }) =>
        row.original.status === StaffStatus.INVITED ? (
          <span className="text-muted-foreground italic">未登録</span>
        ) : (
          <TextWithTooltip
            text={row.original.name}
            className="max-w-40 font-medium"
            wrapperClassName="min-w-0"
          />
        ),
      meta: { label: '氏名' },
    },
    {
      accessorKey: 'email',
      header: 'メールアドレス',
      // Truncated like 氏名 — an unbounded address stretches the cell and pushes every
      // following column (and the row-action control) off screen (BUG-P2-01-15).
      cell: ({ row }) => (
        <TextWithTooltip
          text={row.original.email}
          className="max-w-56"
          wrapperClassName="min-w-0"
        />
      ),
      enableSorting: false,
      meta: { label: 'メールアドレス' },
    },
    {
      accessorKey: 'role',
      header: 'ロール',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`text-[10px] ${STAFF_ROLE_BADGE_CLASSES[row.original.role as StaffRole]}`}
        >
          {STAFF_ROLE_LABELS[row.original.role as StaffRole] || '-'}
        </Badge>
      ),
      enableSorting: false,
      meta: { label: 'ロール' },
    },
    {
      accessorKey: 'positionName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="職位" />,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            onPositionClick?.(row.original.positionId);
          }}
        >
          {/* 職位名 can be up to 100 chars — cap the badge and truncate like 氏名, full name on hover */}
          <Badge
            variant="secondary"
            className="hover:bg-secondary/80 max-w-40 cursor-pointer text-[10px]"
          >
            <TextWithTooltip text={row.original.positionName} wrapperClassName="min-w-0" />
          </Badge>
        </Button>
      ),
      meta: { label: '職位' },
    },
    ...(isSingleStoreContext
      ? []
      : [
          {
            id: 'linked_store_name',
            header: '所属店舗',
            cell: ({ row }) => <StaffStoresCell stores={row.original.stores} />,
            enableSorting: false,
            meta: { label: '所属店舗' },
          } satisfies ColumnDef<Staff>,
        ]),
    {
      id: 'linked_fc_company_name',
      header: 'FC企業',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.fcCompanyName ?? '—'}</span>
      ),
      enableSorting: false,
      meta: { label: 'FC企業' },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ステータス" />,
      cell: ({ row }) => {
        const status = row.original.status as StaffStatus;
        return (
          <Badge variant="outline" className={`text-[10px] ${STAFF_STATUS_CLASSES[status]}`}>
            {STAFF_STATUS_LABELS[status]}
          </Badge>
        );
      },
      meta: { label: 'ステータス' },
    },
    {
      id: 'last_login',
      accessorKey: 'lastLoginAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="最終ログイン" />,
      // The relative text is the primary reading; `title` keeps the exact instant reachable
      // (BUG-P2-01-11). An 招待中 row never has a login, so it carries the invitation date
      // on a second line instead (FR-005, BUG-P2-01-05).
      cell: ({ row }) => {
        const { lastLoginAt, invitedAt, status } = row.original;
        if (lastLoginAt) {
          return (
            <span title={formatDateYYYYMMDD_HHMM(lastLoginAt)}>
              {formatRelativeTime(lastLoginAt)}
            </span>
          );
        }
        return (
          <div className="flex flex-col">
            <span className="text-muted-foreground">未ログイン</span>
            {status === StaffStatus.INVITED && invitedAt && (
              <span className="text-muted-foreground text-xs">
                招待: {formatDateYYYYMMDD(invitedAt)}
              </span>
            )}
          </div>
        );
      },
      meta: { label: '最終ログイン' },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <ActionsCell
          staff={row.original}
          onEditClick={onEditClick}
          onResendInvite={onResendInvite}
        />
      ),
      enableHiding: false,
      enableSorting: false,
    },
  ];

  return columns;
}
