'use client';

import { useAuthUser } from '@/contexts/auth-user.context';
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

import type { StoreSummaryDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { Permission, UserRole } from '@/types/permission.type';

import {
  STORE_BRAND_BADGE_CLASSES,
  STORE_BRAND_LABELS,
  STORE_BRAND_VALUES,
  STORE_STATUS_BADGE_CLASSES,
  STORE_STATUS_DOT_CLASSES,
  STORE_STATUS_LABELS,
  type StoreBrandEnum,
} from '../_constants/constants';
import { prefectureLabel } from '../_constants/store-prefecture.constant';
import { canEditStore } from '../_utils/can-edit-store.util';

interface StoresTableColumnsProps {
  /** Whether the bulk-select column is shown (HQ/System only — FR-024) */
  canBulkChange?: boolean;
  /** True when the filtered result spans more than the current page */
  hasMorePages?: boolean;
  /** Called when the header checkbox selects the whole current page while more pages exist */
  onRequestSelectAll?: () => void;
  /** Navigate to the store edit screen */
  onEditClick?: (storeId: string) => void;
}

/**
 * `StoreSummaryDto.brandEnum` is typed as a bare `string` on the wire, so the badge resolves it
 * against the known set rather than indexing the label table blindly: an unknown brand renders its
 * raw value in a neutral badge, which makes a backend addition visible instead of blank.
 */
function knownBrand(brandEnum: string): StoreBrandEnum | undefined {
  return STORE_BRAND_VALUES.find((value) => value === brandEnum);
}

/** Roles that may edit any store — the gate a Staff row outside their own store falls back to */
const HEADQUARTER_ROLES = [UserRole.System, UserRole.Headquarter] as const;

/**
 * FR-038: the row's 編集 entry. Gated on `stores.edit`, the same permission the
 * `/stores/:id/edit` route requires: the Y-02 permission matrix grants it to System /
 * Headquarter for every field (L197) and to Staff for their own store's limited set (L198),
 * where the form itself locks the head-office fields (spec `028-store-form` FR-083).
 * `canEditStore` adds the row-level half of the Staff rule — any other store's row falls back
 * to the HQ-only role gate, so it renders inert with the 本部 badge like every other denial.
 * A component of its own because the column factory below must stay hook-free.
 */
function StoreRowEditMenuItem({
  storeId,
  onEditClick,
}: {
  storeId: string;
  onEditClick?: (storeId: string) => void;
}) {
  const { user } = useAuthUser();

  return (
    <RoleGatedMenuItem
      allowedRoles={canEditStore(user, storeId) ? undefined : HEADQUARTER_ROLES}
      requiredPermission={Permission.StoresEdit}
      onClick={(e) => {
        e.stopPropagation();
        onEditClick?.(storeId);
      }}
    >
      <Pencil className="size-4" />
      編集
    </RoleGatedMenuItem>
  );
}

// Pure factory (no hooks) so the page can memoize the returned column defs — their inline
// `header` render functions are what `flexRender` treats as component types.
export function StoresTableColumns({
  canBulkChange = false,
  hasMorePages = false,
  onRequestSelectAll,
  onEditClick,
}: StoresTableColumnsProps): ColumnDef<StoreSummaryDto>[] {
  const selectColumn: ColumnDef<StoreSummaryDto> = {
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
              // FR-027: selecting a full page while more pages match offers the second step
              if (value && hasMorePages) {
                onRequestSelectAll?.();
              }
            }}
          />
        </div>
      );
    },
    cell: ({ row }) => <DataTableColumnCheckbox row={row} title={`${row.original.name}を選択`} />,
    enableSorting: false,
    enableHiding: false,
  };

  return [
    ...(canBulkChange ? [selectColumn] : []),
    {
      // The store-code column in Y-02 FR-001 is the business/club code. The internal store id (S-###)
      // is not a column on this screen (client's answer to QA #201, 2026-08-24).
      // The accessor key doubles as the column id, which is the `sort` value the list endpoint takes.
      accessorKey: 'clubCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title="店舗コード" />,
      // A fixed-width code: a long value truncates and the tooltip carries the full string
      cell: ({ row }) => (
        <TextWithTooltip
          text={row.original.clubCode || '—'}
          wrapperClassName="max-w-[10rem]"
          className="text-muted-foreground font-mono text-xs"
        />
      ),
      meta: { label: '店舗コード' },
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="店舗名" />,
      // Free text: wraps (unbroken tokens too) so a 255-char name never widens the table
      cell: ({ row }) => (
        <span className="block max-w-[28rem] min-w-[8rem] text-xs font-medium [overflow-wrap:anywhere] whitespace-normal">
          {row.original.name}
        </span>
      ),
      meta: { label: '店舗名' },
    },
    {
      accessorKey: 'brandEnum',
      header: 'ブランド',
      cell: ({ row }) => {
        const brand = knownBrand(row.original.brandEnum);
        return (
          <Badge
            variant="outline"
            className={cn(brand && STORE_BRAND_BADGE_CLASSES[brand], 'text-[10px]')}
          >
            {brand ? STORE_BRAND_LABELS[brand] : row.original.brandEnum}
          </Badge>
        );
      },
      enableSorting: false,
      meta: { label: 'ブランド' },
    },
    {
      // The wire carries the JIS X 0401 code; the cell shows the Japanese name (D4)
      accessorKey: 'prefecture',
      header: '都道府県',
      cell: ({ row }) => (
        <span className="text-xs">{prefectureLabel(row.original.prefecture) || '—'}</span>
      ),
      enableSorting: false,
      meta: { label: '都道府県' },
    },
    {
      // FR-004: the FC company's name for franchised stores, the direct-management label otherwise.
      // `fcCompanyName` is already resolved server-side and is the literal 直営 when the store has
      // no operating company, so the cell renders it as it comes.
      accessorKey: 'fcCompanyName',
      header: '運営企業',
      cell: ({ row }) => {
        const label = row.original.fcCompanyName ?? '—';
        return (
          <span className="block max-w-[14rem] truncate text-xs" title={label}>
            {label}
          </span>
        );
      },
      enableSorting: false,
      meta: { label: '運営企業' },
    },
    // TODO(round3) B1 — FR-005 テリトリー column, Phase 2 (Y-15 組織階層管理 is Phase 2 on the
    // client's CRM Category board). Commented out rather than deleted so Round 3 re-enables it:
    // restore the two-line territory/area cell with `TERRITORY_UNSET_LABEL` once the BE ships
    // `stores.territory_id` + the hierarchy read.
    // {
    //   id: 'territory',
    //   header: 'テリトリー',
    //   cell: () => <span className="text-muted-foreground text-xs">{API_UNSUPPORTED_NOTE}</span>,
    //   enableSorting: false,
    //   meta: { label: 'テリトリー' },
    // },
    {
      accessorKey: 'status',
      header: 'ステータス',
      cell: ({ row }) => {
        // D3: four independent states on the real master — the DTO's union matches `StoreStatus`
        const { status } = row.original;
        return (
          // Same tokens as the detail header pill: leading dot, text-xs
          <Badge
            variant="outline"
            className={cn(STORE_STATUS_BADGE_CLASSES[status], 'gap-1 text-xs font-medium')}
          >
            <span className={cn('size-1.5 rounded-full', STORE_STATUS_DOT_CLASSES[status])} />
            {STORE_STATUS_LABELS[status]}
          </Badge>
        );
      },
      enableSorting: false,
      meta: { label: 'ステータス' },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" />}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <StoreRowEditMenuItem storeId={row.original.id} onEditClick={onEditClick} />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
