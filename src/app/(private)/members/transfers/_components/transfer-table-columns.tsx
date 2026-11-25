'use client';

import type { ReactNode } from 'react';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, MoreHorizontal, XCircle } from 'lucide-react';

import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { TransferListItemDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import {
  TRANSFER_BRAND_GROUP_CLASSES,
  TRANSFER_BULK_APPROVE_LIMIT_REASON,
  TRANSFER_BULK_APPROVE_MAX,
  getTransferExclusionBlockReason,
  isTransferApplicationPending,
  toTransferBrandGroup,
} from '../_constants/constants';
import { TransferAutoBadge } from './transfer-auto-badge';
import { TransferApplicationStatusBadge } from './transfer-status-badge';

export type TransferItem = TransferListItemDto;

/** Returns why the current user cannot act on the row's current step, or `null`. */
export type TransferStoreBlockReason = (transfer: TransferItem) => string | null;

export function getTransferMemberName(transfer: {
  member: Pick<TransferItem['member'], 'lastName' | 'firstName'>;
}): string {
  const { lastName, firstName } = transfer.member;
  return [lastName, firstName].filter(Boolean).join(' ') || '—';
}

/**
 * A-02 FR-002 一括承認: any pending row whose current step belongs to the user's store and that
 * carries no auto-transfer exclusion, regardless of brand — each case approves its own current
 * step. Returns the reason a pending row cannot be selected, or `null` when it can.
 */
export function getTransferSelectBlockReason(
  transfer: TransferItem,
  getStoreBlockReason: TransferStoreBlockReason,
): string | null {
  const storeBlockReason = getStoreBlockReason(transfer);
  if (storeBlockReason) return storeBlockReason;
  if (getTransferExclusionBlockReason(transfer.autoTransfer)) {
    return '除外理由のため個別対応が必要です';
  }
  return null;
}

export function isTransferSelectable(
  transfer: TransferItem,
  getStoreBlockReason: TransferStoreBlockReason,
): boolean {
  return (
    isTransferApplicationPending(transfer.status) &&
    getTransferSelectBlockReason(transfer, getStoreBlockReason) === null
  );
}

function countSelected(rowSelection: Record<string, boolean>): number {
  return Object.values(rowSelection).filter(Boolean).length;
}

function DisabledWithReason({
  reason,
  children,
}: Readonly<{ reason: string; children: ReactNode }>) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<div />}>{children}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface TransferTableColumnsProps {
  onApproveClick: (transfer: TransferItem) => void;
  onRejectClick: (transfer: TransferItem) => void;
  onMemberClick: (transfer: TransferItem) => void;
  getStoreBlockReason: TransferStoreBlockReason;
  /**
   * Whether the current user holds MembersTransfersApprove. A role without it (e.g. Observer)
   * gets neither column at all — not a disabled checkbox/menu — since it can never act on any
   * row (BUG-A02-030).
   */
  canApprove: boolean;
  /**
   * The table still shows the previous query's rows while the next filter / page / header store
   * loads. Those rows may belong to another store, so none of them can be selected or decided
   * until the current result arrives.
   */
  isStale: boolean;
}

/**
 * Pure factory (no hooks) so the page can memoize the returned column defs. Their inline
 * `header`/`cell` render functions are what `flexRender` treats as component types; a fresh
 * identity on every render remounts the tooltips and makes them blink on refetch.
 */
export function TransferTableColumns({
  onApproveClick,
  onRejectClick,
  onMemberClick,
  getStoreBlockReason,
  canApprove,
  isStale,
}: TransferTableColumnsProps): ColumnDef<TransferItem>[] {
  const selectColumn: ColumnDef<TransferItem> = {
    id: 'select',
    header: ({ table }) => {
      const rows = table.getRowModel().rows;
      const selectableRows = rows.filter((row) =>
        isTransferSelectable(row.original, getStoreBlockReason),
      );
      const selectedCount = selectableRows.filter((row) => row.getIsSelected()).length;
      const allSelected = selectableRows.length > 0 && selectedCount === selectableRows.length;
      // Read from table state (not props) so the memoized column defs keep a stable identity.
      const totalSelected = countSelected(table.getState().rowSelection);
      const remaining = Math.max(0, TRANSFER_BULK_APPROVE_MAX - totalSelected);
      const limitReached = !allSelected && selectedCount === 0 && remaining === 0;
      return (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            aria-label="全選択"
            checked={allSelected}
            indeterminate={selectedCount > 0 && !allSelected}
            // Disabled when nothing on this page can be bulk-approved, so the control never
            // looks available on a page of decided / blocked rows.
            disabled={isStale || selectableRows.length === 0 || limitReached}
            onCheckedChange={(value) => {
              // At the limit, a partly-selected page cannot grow: the click clears it instead of
              // doing nothing.
              if (!value || remaining === 0) {
                selectableRows.forEach((row) => row.toggleSelected(false));
                return;
              }
              // Only fill up to the bulk-approve limit, across pages.
              selectableRows
                .filter((row) => !row.getIsSelected())
                .slice(0, remaining)
                .forEach((row) => row.toggleSelected(true));
            }}
          />
        </div>
      );
    },
    cell: ({ row, table }) => {
      const transfer = row.original;
      // A decided case has nothing left to approve — no checkbox at all, not a disabled one.
      if (!isTransferApplicationPending(transfer.status)) return <span />;
      const blockReason = getTransferSelectBlockReason(transfer, getStoreBlockReason);
      // The whole row is a navigation target; `meta.stopRowClick` keeps the full cell (padding
      // and the blank cell of a decided row included) from opening the detail (PAR033).
      const limitReached =
        !row.getIsSelected() &&
        countSelected(table.getState().rowSelection) >= TRANSFER_BULK_APPROVE_MAX;
      return (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {blockReason === null && limitReached ? (
            <DisabledWithReason reason={TRANSFER_BULK_APPROVE_LIMIT_REASON}>
              <Checkbox checked={false} disabled aria-label="選択上限" />
            </DisabledWithReason>
          ) : blockReason === null ? (
            <Checkbox
              aria-label={`${getTransferMemberName(transfer)}を選択`}
              checked={row.getIsSelected()}
              disabled={isStale}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
            />
          ) : (
            <DisabledWithReason reason={blockReason}>
              <Checkbox checked={false} disabled aria-label="選択不可" />
            </DisabledWithReason>
          )}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    meta: { className: 'w-[44px] text-center', stopRowClick: true },
  };

  const middleColumns: ColumnDef<TransferItem>[] = [
    {
      id: 'memberNumber',
      header: '会員ID',
      meta: { className: 'w-[100px]' },
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.member.memberNumber ?? '—'}
        </span>
      ),
    },
    {
      id: 'memberName',
      header: '会員名',
      cell: ({ row }) => (
        // A-02 FR-001: drill down from the list to the member detail (A-01-01).
        // Truncated with a tooltip so a long name cannot widen the column off-screen.
        <div
          className="min-w-0 cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onMemberClick(row.original);
          }}
        >
          <TextWithTooltip
            text={getTransferMemberName(row.original)}
            className="max-w-40 text-sm font-medium"
            wrapperClassName="min-w-0"
          />
        </div>
      ),
    },
    {
      id: 'brand',
      header: 'ブランド',
      meta: { className: 'w-[100px]' },
      cell: ({ row }) => {
        const group = toTransferBrandGroup(row.original.fromStore.brandEnum);
        if (!group) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <Badge variant="outline" className={`text-[10px] ${TRANSFER_BRAND_GROUP_CLASSES[group]}`}>
            {group}
          </Badge>
        );
      },
    },
    {
      id: 'fromStore',
      header: '移籍元店舗',
      cell: ({ row }) => <span className="text-xs">{row.original.fromStore.name ?? '—'}</span>,
    },
    {
      id: 'toStore',
      header: '移籍先店舗',
      cell: ({ row }) => <span className="text-xs">{row.original.toStore.name ?? '—'}</span>,
    },
    {
      id: 'appliedAt',
      header: '申請日',
      meta: { className: 'w-[100px]' },
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDateYYYYMMDD(row.original.appliedAt)}
        </span>
      ),
    },
    {
      id: 'scheduledTransferDate',
      header: '移籍予定日',
      meta: { className: 'w-[100px]' },
      cell: ({ row }) => (
        <span className="text-xs">
          {formatDateYYYYMMDD(row.original.scheduledTransferDate, '—')}
        </span>
      ),
    },
    {
      id: 'autoTransfer',
      header: '自動移籍可否',
      meta: { className: 'w-[120px]' },
      enableSorting: false,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <TransferAutoBadge autoTransfer={row.original.autoTransfer} />
        </div>
      ),
    },
    {
      id: 'status',
      header: 'ステータス',
      meta: { className: 'w-[130px]' },
      cell: ({ row }) => <TransferApplicationStatusBadge status={row.original.status} />,
    },
  ];

  const actionsColumn: ColumnDef<TransferItem> = {
    id: 'actions',
    header: '',
    meta: { className: 'w-[56px]', stopRowClick: true },
    enableSorting: false,
    cell: ({ row }) => {
      const transfer = row.original;
      // A decided transfer has nothing left to approve or reject, so the trigger is absent
      // rather than present-but-empty.
      if (!isTransferApplicationPending(transfer.status)) return null;
      // 承認 is blocked by a foreign approval step or an auto-transfer exclusion; 否認 only by
      // the former — an excluded case can still be closed.
      const storeBlockReason = getStoreBlockReason(transfer);
      const approveBlockReason =
        storeBlockReason ?? getTransferExclusionBlockReason(transfer.autoTransfer);
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isStale}
              className="hover:bg-muted flex size-8 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-50"
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">アクションを開く</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <RoleGatedMenuItem
                requiredPermission={Permission.MembersTransfersApprove}
                denyBadge="権限"
                tooltip={approveBlockReason ?? undefined}
                disabled={approveBlockReason !== null}
                onClick={() => onApproveClick(transfer)}
              >
                <CheckCircle className="size-4" />
                承認
              </RoleGatedMenuItem>
              <DropdownMenuSeparator />
              <RoleGatedMenuItem
                requiredPermission={Permission.MembersTransfersApprove}
                denyBadge="権限"
                tooltip={storeBlockReason ?? undefined}
                disabled={storeBlockReason !== null}
                className="text-destructive"
                onClick={() => onRejectClick(transfer)}
              >
                <XCircle className="size-4" />
                否認
              </RoleGatedMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  };

  return [
    ...(canApprove ? [selectColumn] : []),
    ...middleColumns,
    ...(canApprove ? [actionsColumn] : []),
  ];
}
