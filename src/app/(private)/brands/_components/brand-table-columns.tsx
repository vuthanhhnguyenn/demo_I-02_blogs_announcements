'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { DataTableRowActions } from '@/components/common/data-table/data-table-row-action';

import type { BrandListItemDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

export type BrandListItem = BrandListItemDto;

export function BrandTableColumns(
  onEditClick: (brand: BrandListItem) => void,
): ColumnDef<BrandListItem>[] {
  return [
    {
      accessorKey: 'brandGroup',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">ブランドID</span>,
      meta: { className: 'w-[140px]' },
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-500">{row.original.brandGroup}</span>
      ),
    },
    {
      accessorKey: 'displayName',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">ブランド名</span>,
      // The cell is nowrap by default; a long name (full-width or an unbroken token) must wrap
      // instead of pushing the ⋯ column off-screen.
      meta: { className: 'whitespace-normal [overflow-wrap:anywhere]' },
      cell: ({ row }) => (
        <span className="text-xs font-medium break-words" title={row.original.displayName}>
          {row.original.displayName}
        </span>
      ),
    },
    // ブランド名 is HQ-editable (Y-07 260928_v3 FR-001) — the prototype's row 編集.
    {
      id: 'actions',
      enableSorting: false,
      header: () => null,
      // stopRowClick: the whole cell (padding included) must not open the detail row link.
      meta: { className: 'w-10', stopRowClick: true },
      cell: ({ row }) => (
        <DataTableRowActions
          row={row.original}
          actions={['edit']}
          permissions={{ edit: Permission.BrandsEdit }}
          handlers={{ edit: onEditClick }}
        />
      ),
    },
  ];
}
