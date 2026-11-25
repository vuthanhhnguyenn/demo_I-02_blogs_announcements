'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Ban, CheckCircle2 } from 'lucide-react';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { DataTableRowActions } from '@/components/common/data-table/data-table-row-action';
import { Badge } from '@/components/ui/badge';

import type { DomainMasterSummaryDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { DOMAIN_AUTH_METHOD_LABELS } from '../_constants/domain.constants';
import { DomainStatusBadge } from './domain-status-badge';

interface DomainTableColumnsProps {
  onEditClick?: (row: DomainMasterSummaryDto) => void;
  onToggleActiveClick?: (row: DomainMasterSummaryDto) => void;
  onDeleteClick?: (row: DomainMasterSummaryDto) => void;
}

export function DomainTableColumns({
  onEditClick,
  onToggleActiveClick,
  onDeleteClick,
}: DomainTableColumnsProps): ColumnDef<DomainMasterSummaryDto>[] {
  return [
    {
      accessorKey: 'id',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">ID</span>,
      meta: { className: 'w-[100px]' },
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.id}</span>,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="管理名" />,
      meta: { className: 'min-w-[160px] max-w-[280px]' },
      cell: ({ row }) => (
        <span className="block min-w-0 truncate text-sm font-medium" title={row.original.name}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'domain',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ドメイン" />,
      meta: { className: 'min-w-[180px] max-w-[280px]' },
      cell: ({ row }) => (
        <span className="block min-w-0 truncate font-mono text-sm" title={row.original.domain}>
          {row.original.domain}
        </span>
      ),
    },
    {
      accessorKey: 'authProvider',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">認証方式</span>,
      meta: { className: 'w-[120px]' },
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] font-medium">
          {DOMAIN_AUTH_METHOD_LABELS[row.original.authProvider]}
        </Badge>
      ),
    },
    {
      accessorKey: 'staffCount',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">スタッフ数</span>,
      meta: { className: 'w-[100px] text-right' },
      cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.staffCount}名</span>,
    },
    {
      // Y-14 FR-M001: 状態（isActive）は GAP-60 裁定で Phase 1 に前倒し。無効な行も隠さず表示する
      accessorKey: 'isActive',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">状態</span>,
      meta: { className: 'w-[100px]' },
      cell: ({ row }) => <DomainStatusBadge isActive={row.original.isActive} />,
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => null,
      meta: { className: 'w-10' },
      cell: ({ row }) => (
        <DataTableRowActions
          row={row.original}
          actions={['edit', 'toggle', 'delete']}
          permissions={{
            edit: Permission.DomainsEdit,
            // Y-14 権限マトリクス: 有効化・無効化は編集と同じ System / Headquarter のみ
            toggle: Permission.DomainsEdit,
            delete: Permission.DomainsDelete,
          }}
          labels={{ toggle: row.original.isActive ? '無効化する' : '有効化する' }}
          icons={{ toggle: row.original.isActive ? Ban : CheckCircle2 }}
          // FR-M004: 紐づきスタッフありでも削除は押せる。ブロックは確認ダイアログ側で N名版の文面を出して行う
          handlers={{
            edit: (item) => onEditClick?.(item),
            toggle: (item) => onToggleActiveClick?.(item),
            delete: (item) => onDeleteClick?.(item),
          }}
        />
      ),
    },
  ];
}
