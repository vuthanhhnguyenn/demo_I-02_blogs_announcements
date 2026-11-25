import type { ColumnDef } from '@tanstack/react-table';
import { Ban, CheckCircle2, MoreHorizontal, Pencil } from 'lucide-react';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { OptionSetListItemDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import {
  OPTION_DISCOUNT_STATUS_BADGE_CLASSES,
  OPTION_DISCOUNT_STATUS_LABELS,
  OPTION_DISCOUNT_TYPE_BADGE_CLASSES,
  OPTION_DISCOUNT_TYPE_LABELS,
  formatOptionDiscountValue,
  toOptionSetStatus,
} from '../_constants/constants';

type OptionDiscountRow = OptionSetListItemDto;

interface OptionsTableColumnsProps {
  onEditClick?: (id: string) => void;
  onToggleStatusClick?: (optionDiscount: OptionDiscountRow) => void;
}

// Closing a ⋯ menu item can let the second click of a double-click land on the row underneath —
// the list ignores a row click that follows a menu action this closely.
let lastMenuActionAt = 0;
const markMenuAction = () => {
  lastMenuActionAt = Date.now();
};
export const isRightAfterMenuAction = () => Date.now() - lastMenuActionAt < 600;

function ActionsCell({
  optionDiscount,
  onEditClick,
  onToggleStatusClick,
}: {
  optionDiscount: OptionDiscountRow;
  onEditClick?: (id: string) => void;
  onToggleStatusClick?: (optionDiscount: OptionDiscountRow) => void;
}) {
  const { isActive } = optionDiscount;

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
          requiredPermission={Permission.OptionDiscountsEdit}
          onClick={(e) => {
            e.stopPropagation();
            markMenuAction();
            onEditClick?.(optionDiscount.id);
          }}
        >
          <Pencil className="size-4" />
          編集
        </RoleGatedMenuItem>
        {/* G-02 FR-006: the only management actions are list / create / edit / deactivate — no delete is defined. */}
        <RoleGatedMenuItem
          requiredPermission={Permission.OptionDiscountsEdit}
          onClick={(e) => {
            e.stopPropagation();
            markMenuAction();
            onToggleStatusClick?.(optionDiscount);
          }}
        >
          {isActive ? (
            <>
              <Ban className="size-4" />
              無効化する
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              有効化する
            </>
          )}
        </RoleGatedMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OptionDiscountTableColumns({
  onEditClick,
  onToggleStatusClick,
}: OptionsTableColumnsProps): ColumnDef<OptionDiscountRow>[] {
  return [
    // qa-196: only セット割名 and 割引額 are sortable — the API's `sort` accepts nothing else.
    {
      accessorKey: 'id',
      header: () => <span className="text-xs font-semibold">ID</span>,
      enableSorting: false,
      cell: ({ row }) => (
        // The id is a 36-character UUID; the prototype's ID column is 80px wide.
        <TextWithTooltip
          text={row.original.id}
          wrapperClassName="max-w-20"
          className="text-muted-foreground font-mono text-xs"
        />
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="セット割名" />,
      cell: ({ row }) => (
        <span className="block max-w-64 truncate text-xs font-medium" title={row.original.name}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'items',
      header: () => <span className="text-xs font-semibold">対象オプション</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.items.map((option) => (
            <Badge
              key={option.optionId}
              variant="outline"
              className="max-w-48 justify-start text-[10px]"
              title={option.optionName}
            >
              <span className="truncate">{option.optionName}</span>
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'discountType',
      header: () => <span className="text-xs font-semibold">割引タイプ</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const type = row.original.discountType;
        return (
          <Badge
            variant="outline"
            className={cn('text-[10px]', OPTION_DISCOUNT_TYPE_BADGE_CLASSES[type])}
          >
            {OPTION_DISCOUNT_TYPE_LABELS[type]}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'discountValue',
      header: ({ column }) => (
        <div className="flex justify-end">
          <DataTableColumnHeader column={column} title="割引額" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right text-xs font-medium">
          {formatOptionDiscountValue(row.original.discountType, row.original.discountValue)}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: () => <span className="text-xs font-semibold">状態</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const status = toOptionSetStatus(row.original.isActive);
        return (
          <Badge
            variant="outline"
            className={cn('text-[10px]', OPTION_DISCOUNT_STATUS_BADGE_CLASSES[status])}
          >
            {OPTION_DISCOUNT_STATUS_LABELS[status]}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => null,
      enableSorting: false,
      cell: ({ row }) => (
        <ActionsCell
          optionDiscount={row.original}
          onEditClick={onEditClick}
          onToggleStatusClick={onToggleStatusClick}
        />
      ),
    },
  ];
}
