'use client';

import { formatDate } from '@/utils/format.util';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil } from 'lucide-react';

import { DataTableColumnCheckbox } from '@/components/common/data-table/data-table-column-checkbox';
import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { MemberListItemDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import {
  GATE_STOP_CLASSES,
  GATE_STOP_LABEL,
  resolveMemberStatusBadge,
} from '../_constants/constants';

interface MembersTableColumnsProps {
  /** Whether the bulk-select column is shown (HQ/System only) */
  canBulkChange?: boolean;
  /** True when the filtered result spans more than the current page */
  hasMorePages?: boolean;
  /** Called when the header checkbox selects the whole current page while more pages exist */
  onRequestSelectAll?: () => void;
  /**
   * Whether the header store scope is 全店舗. The 店舗名 column only earns its width
   * there: under a single-store scope every row carries that same store name.
   */
  isAllStoresScope?: boolean;
  /** Navigate to the member edit screen */
  onEditClick?: (memberId: string) => void;
}

// Pure factory (no hooks) so the page can memoize the returned column defs. Their
// inline `header` render functions are what `flexRender` treats as component types;
// a fresh identity each render remounts the sort-tooltip and makes it blink.
export function MembersTableColumns({
  canBulkChange = false,
  hasMorePages = false,
  onRequestSelectAll,
  isAllStoresScope = true,
  onEditClick,
}: MembersTableColumnsProps): ColumnDef<MemberListItemDto>[] {
  const selectColumn: ColumnDef<MemberListItemDto> = {
    id: 'select',
    header: ({ table }) => {
      const allPageSelected = table.getIsAllPageRowsSelected();
      const somePageSelected = table.getIsSomePageRowsSelected();
      return (
        <div className="w-[32px] px-2 py-2.5">
          <Checkbox
            aria-label="このページ全選択"
            checked={allPageSelected}
            indeterminate={somePageSelected && !allPageSelected}
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value);
              if (value && hasMorePages) {
                onRequestSelectAll?.();
              }
            }}
          />
        </div>
      );
    },
    // Named after the member, the way `stores-table-columns` names the store: a screen
    // reader otherwise announces every row's checkbox identically.
    cell: ({ row }) => (
      <DataTableColumnCheckbox
        row={row}
        title={`${[row.original.lastName, row.original.firstName].filter(Boolean).join(' ') || row.original.memberNumber}を選択`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };

  const storeColumn: ColumnDef<MemberListItemDto> = {
    id: 'primaryStore',
    header: '店舗名',
    cell: ({ row }) => (
      <TextWithTooltip
        text={row.original.primaryStore?.name || '-'}
        className="max-w-40 text-xs"
        wrapperClassName="min-w-0"
      />
    ),
    enableSorting: false,
  };

  const actionsColumn: ColumnDef<MemberListItemDto> = {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const memberId = row.original.memberId;
      if (!memberId) return null;
      // A withdrawn member is read-only: the detail screen hides its edit button and
      // `/members/[id]/edit` refuses direct URL access, so the row action matches rather
      // than offering a door that closes on arrival.
      const status = row.original.memberStatus;
      const isWithdrawn = status === 'withdrawn' || status === 'forced_withdrawal';
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" />}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <RoleGatedMenuItem
              requiredPermission={Permission.MembersEdit}
              disabled={isWithdrawn}
              tooltip={isWithdrawn ? '退会済みのため編集できません' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onEditClick?.(memberId);
              }}
            >
              <Pencil className="mr-2 size-4" />
              編集
            </RoleGatedMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableHiding: false,
  };

  return [
    ...(canBulkChange ? [selectColumn] : []),
    // The id of every sortable column is the `sort` value the API accepts, so a
    // column header travels straight into the query with no lookup table.
    {
      accessorKey: 'memberNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="会員ID" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.memberNumber || '-'}
        </span>
      ),
      meta: { label: '会員ID' },
    },
    {
      // Sorted server-side by family name, which is what the API's `lastName` sort does.
      // The accessor is what makes the header sortable at all — TanStack's `getCanSort`
      // requires one, so an id-only column renders as a plain (unclickable) header.
      id: 'lastName',
      accessorFn: (row) => row.lastName,
      header: ({ column }) => <DataTableColumnHeader column={column} title="氏名" />,
      cell: ({ row }) => {
        const { lastName, firstName } = row.original;
        const fullName = [lastName, firstName].filter(Boolean).join(' ');
        return (
          <TextWithTooltip
            text={fullName || '-'}
            className="max-w-40 text-sm font-medium"
            wrapperClassName="min-w-0"
          />
        );
      },
      enableSorting: true,
      meta: { label: '氏名' },
    },
    ...(isAllStoresScope ? [storeColumn] : []),
    {
      id: 'memberStatus',
      accessorFn: (row) => row.memberStatus,
      header: ({ column }) => <DataTableColumnHeader column={column} title="ステータス" />,
      meta: { label: 'ステータス' },
      enableSorting: true,
      cell: ({ row }) => {
        const { memberStatus: status, hasGateStop } = row.original;
        // Gate stop is a flag orthogonal to the member status (customer answer
        // 2026-07-29, QA #120), so both are shown: the status is what the column
        // sorts on, the gate stop is the restriction the operator has to act on.
        const badge = status ? resolveMemberStatusBadge(status) : null;
        if (!badge && !hasGateStop) return <span>-</span>;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {badge && (
              <Badge className={`border text-[10px] ${badge.className}`}>
                {badge.showDot && (
                  <span className="mr-1 inline-block size-1.5 rounded-full bg-current" />
                )}
                {badge.label}
              </Badge>
            )}
            {hasGateStop && (
              <Badge className={`border text-[10px] ${GATE_STOP_CLASSES}`}>
                <span className="mr-1 inline-block size-1.5 rounded-full bg-current" />
                {GATE_STOP_LABEL}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'currentMainContract',
      header: '主契約',
      cell: ({ row }) => (
        <TextWithTooltip
          text={row.original.currentMainContract?.plan.name || '-'}
          className="max-w-48 text-xs"
          wrapperClassName="min-w-0"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'enrolledAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="入会日" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.enrolledAt, '-')}
        </span>
      ),
      meta: { label: '入会日' },
    },
    {
      accessorKey: 'lastEntryAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="最終来館日" />,
      cell: ({ row }) => (
        <span className="text-xs">{formatDate(row.original.lastEntryAt, '-')}</span>
      ),
      meta: { label: '最終来館日' },
    },
    actionsColumn,
  ];
}
