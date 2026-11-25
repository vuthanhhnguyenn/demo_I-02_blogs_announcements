'use client';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';

import { BrandBadge } from '@/components/common/brand-badge';
import { DataTableRowActions } from '@/components/common/data-table/data-table-row-action';

import type { AppVersionDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import {
  APP_VERSION_OS_LABELS,
  APP_VERSION_SLOT_KIND_LABELS,
  type AppVersionOs,
  type AppVersionSlotKind,
  appVersionSlot,
} from '../_constants/app-version.constants';
import { APP_VERSION_NOT_SCHEDULED_REASON } from '../_utils/app-version-server-errors.util';
import { AppVersionPairValue } from './app-version-pair-value';
import { AppVersionStatusBadge } from './app-version-status-badge';

interface AppVersionTableColumnsProps {
  onEditClick?: (id: string) => void;
  onDeleteClick?: (item: AppVersionDto) => void;
}

// FR-M001 column order: iOS 最低 · Android 最低 · iOS 最新 · Android 最新.
const VERSION_COLUMNS: ReadonlyArray<{ os: AppVersionOs; kind: AppVersionSlotKind }> = [
  { os: 'ios', kind: 'Min' },
  { os: 'android', kind: 'Min' },
  { os: 'ios', kind: 'Latest' },
  { os: 'android', kind: 'Latest' },
];

export function AppVersionTableColumns({
  onEditClick,
  onDeleteClick,
}: AppVersionTableColumnsProps): ColumnDef<AppVersionDto>[] {
  return [
    {
      accessorKey: 'brandEnum',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">ブランド</span>,
      meta: { className: 'w-25' },
      cell: ({ row }) => <BrandBadge brand={row.original.brandEnum} />,
    },
    {
      accessorKey: 'effectiveAt',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">適用開始日時</span>,
      meta: { className: 'w-35' },
      cell: ({ row }) => (
        <span className="text-xs">{formatDateYYYYMMDD_HHMM(row.original.effectiveAt)}</span>
      ),
    },
    {
      accessorKey: 'status',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">状態</span>,
      meta: { className: 'w-22' },
      cell: ({ row }) => <AppVersionStatusBadge status={row.original.status} />,
    },
    ...VERSION_COLUMNS.map(
      ({ os, kind }): ColumnDef<AppVersionDto> => ({
        id: appVersionSlot(os, kind),
        enableSorting: false,
        header: () => (
          <span className="text-xs font-semibold">
            {APP_VERSION_OS_LABELS[os]} {APP_VERSION_SLOT_KIND_LABELS[kind]}
          </span>
        ),
        meta: { className: 'w-35' },
        cell: ({ row }) => (
          <AppVersionPairValue
            record={row.original}
            slot={appVersionSlot(os, kind)}
            className="text-xs"
            truncate
          />
        ),
      }),
    ),
    {
      accessorKey: 'remarks',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">備考</span>,
      meta: { className: 'min-w-45 max-w-70' },
      cell: ({ row }) => (
        <span className="block truncate text-xs" title={row.original.remarks ?? undefined}>
          {row.original.remarks}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => null,
      meta: { className: 'w-10' },
      cell: ({ row }) => {
        // FR-M004 / FR-M005: only a scheduled setting can be edited or deleted.
        const locked = row.original.status !== 'scheduled';
        return (
          <DataTableRowActions
            row={row.original}
            actions={['edit', 'delete']}
            permissions={{
              edit: Permission.AppVersionsEdit,
              delete: Permission.AppVersionsDelete,
            }}
            disabled={{ edit: locked, delete: locked }}
            disabledTooltips={{
              edit: APP_VERSION_NOT_SCHEDULED_REASON,
              delete: APP_VERSION_NOT_SCHEDULED_REASON,
            }}
            handlers={{
              edit: (item) => {
                onEditClick?.(item.id);
              },
              delete: (item) => {
                onDeleteClick?.(item);
              },
            }}
          />
        );
      },
    },
  ];
}
