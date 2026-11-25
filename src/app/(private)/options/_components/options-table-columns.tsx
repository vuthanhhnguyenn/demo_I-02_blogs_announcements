'use client';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';
import type { ColumnDef } from '@tanstack/react-table';
import { LockKeyhole, MoreHorizontal, Pencil } from 'lucide-react';

import { BrandBadge } from '@/components/common/brand-badge';
import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { StoreScopeCount } from '@/components/common/store-scope-count';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { OptionListItemDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import {
  OPTION_LIST_PRORATION_METHOD_LABELS,
  OPTION_LIST_STATUS_LABELS,
  OPTION_LIST_TYPE_BADGE_CLASSES,
  OPTION_LIST_TYPE_LABELS,
  OPTION_LIST_USABILITY_LABELS,
  OPTION_STATUS_BADGE_CLASSES,
  OPTION_SUBCATEGORY_LABELS,
  isLockerContractType,
} from '../_constants/constants';

type OptionRow = OptionListItemDto;

interface OptionsTableColumnsProps {
  onEditClick?: (id: string) => void;
}

// G-02 has no delete FR (the permission matrix covers register/edit only) — retiring an option is
// done by switching it to 無効, so the row menu carries 編集 alone.
function ActionsCell({
  option,
  onEditClick,
}: {
  option: OptionRow;
  onEditClick?: (id: string) => void;
}) {
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
          requiredPermission={Permission.OptionsEdit}
          onClick={(e) => {
            e.stopPropagation();
            onEditClick?.(option.id);
          }}
        >
          <Pencil className="size-4" />
          編集
        </RoleGatedMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OptionsTableColumns({
  onEditClick,
}: OptionsTableColumnsProps): ColumnDef<OptionRow>[] {
  return [
    {
      // The business code (`OP-0001`), as the prototype's ID column shows — `id` is the UUID.
      // Not sortable: the API's `sort` covers only the FR-S001 axes (name / fee / created date).
      accessorKey: 'optionCode',
      header: () => <span className="text-xs font-semibold">ID</span>,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">{row.original.optionCode}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="オプション名" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="max-w-80 text-xs font-medium wrap-anywhere whitespace-normal">
            {row.original.name}
          </span>
          {isLockerContractType(row.original) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
                  <Badge
                    variant="outline"
                    className="bg-info/15 text-info border-info/20 gap-1 text-[10px]"
                  >
                    <LockKeyhole className="size-3" />
                    ロッカー契約種類
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">
                    ロッカー管理のスロットに契約形態コード「{row.original.optionCode}
                    」として紐づくオプションです
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'brandEnum',
      header: () => <span className="text-xs font-semibold">ブランド</span>,
      cell: ({ row }) => <BrandBadge brand={row.original.brandEnum} />,
    },
    {
      accessorKey: 'isProration',
      header: () => <span className="text-xs font-semibold">日割り</span>,
      cell: ({ row }) => {
        const { isProration, prorationMethod } = row.original;
        if (!isProration) {
          return <span className="text-muted-foreground text-xs">－</span>;
        }
        return (
          <span className="text-success text-xs">
            ✓ {OPTION_LIST_PRORATION_METHOD_LABELS[prorationMethod]}
          </span>
        );
      },
    },
    {
      accessorKey: 'optionType',
      header: () => <span className="text-xs font-semibold">種別</span>,
      cell: ({ row }) => {
        const type = row.original.optionType;
        return (
          <Badge
            variant="outline"
            className={cn('text-[10px]', OPTION_LIST_TYPE_BADGE_CLASSES[type])}
          >
            {OPTION_LIST_TYPE_LABELS[type]}
          </Badge>
        );
      },
    },
    {
      // G-02 FR-001 / prototype 2026-09-03: the service type is a column of its own, next to
      // the billing-type column.
      accessorKey: 'subcategory',
      header: () => <span className="text-xs font-semibold">サービス種別</span>,
      cell: ({ row }) => {
        const subcategory = row.original.subcategory;
        return subcategory ? (
          <span className="text-xs">{OPTION_SUBCATEGORY_LABELS[subcategory]}</span>
        ) : (
          <span className="text-muted-foreground text-xs">―</span>
        );
      },
    },
    {
      accessorKey: 'usability',
      header: () => <span className="text-xs font-semibold">利用可否</span>,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {OPTION_LIST_USABILITY_LABELS[row.original.usability]}
        </span>
      ),
    },
    {
      accessorKey: 'feeMonthly',
      header: ({ column }) => (
        <div className="flex justify-end">
          <DataTableColumnHeader column={column} title="料金(税込)" />
        </div>
      ),
      cell: ({ row }) => (
        <span className="block text-right text-xs font-medium">
          {formatYen(row.original.feeMonthly)}
        </span>
      ),
    },
    {
      accessorKey: 'taxRate',
      header: () => <span className="block text-right text-xs font-semibold">税率</span>,
      cell: ({ row }) => <span className="block text-right text-xs">{row.original.taxRate}%</span>,
    },
    {
      accessorKey: 'accountCode',
      header: () => <span className="text-xs font-semibold">会計コード</span>,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.accountCode ?? '―'}
        </span>
      ),
    },
    {
      accessorKey: 'storeCount',
      header: () => <span className="text-xs font-semibold">店舗</span>,
      cell: ({ row }) => <StoreScopeCount count={row.original.storeCount} />,
    },
    {
      // Not in the prototype: G-02 FR-S001 sorts on 登録日 (confirmed in qa-108), so the column
      // exists to carry that sort — recorded in api-integration-output/prototype-gap-list.md.
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="登録日" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDateYYYYMMDD(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: () => <span className="text-xs font-semibold">状態</span>,
      cell: ({ row }) => {
        const status = row.original.isActive ? 'active' : 'inactive';
        return (
          <Badge
            variant="outline"
            className={cn('text-[10px]', OPTION_STATUS_BADGE_CLASSES[status])}
          >
            {OPTION_LIST_STATUS_LABELS[status]}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => null,
      cell: ({ row }) => <ActionsCell option={row.original} onEditClick={onEditClick} />,
    },
  ];
}
