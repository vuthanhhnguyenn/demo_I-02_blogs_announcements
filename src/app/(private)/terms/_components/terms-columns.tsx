'use client';

import {
  TERMS_STATUS_LABELS,
  TERMS_STATUS_TONES,
  termsBrandEnums,
} from '@/app/(private)/terms/_constants/constants';
import { formatDate } from '@/utils/format.util';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { BrandBadge } from '@/components/common/brand-badge';
import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { ToneBadge } from '@/components/common/tone-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { TermsDocumentSummaryDto } from '@/lib/api-real/types.gen';

import { UserRole } from '@/types/permission.type';

interface TermsColumnsProps {
  onViewClick?: (row: TermsDocumentSummaryDto) => void;
  onEditClick?: (row: TermsDocumentSummaryDto) => void;
  onDeleteClick?: (row: TermsDocumentSummaryDto) => void;
}

export function termsColumns({
  onViewClick,
  onEditClick,
  onDeleteClick,
}: TermsColumnsProps = {}): ColumnDef<TermsDocumentSummaryDto>[] {
  return [
    {
      accessorKey: 'id',
      header: () => <span className="text-xs font-semibold">ID</span>,
      meta: { className: 'w-25' },
      // UUID: truncated with the full id in a tooltip (lessons list pattern).
      cell: ({ row }) => (
        <TextWithTooltip
          text={row.original.id}
          className="text-muted-foreground max-w-21 font-mono text-xs"
        />
      ),
    },
    {
      accessorKey: 'title',
      header: () => <span className="text-xs font-semibold">規約名</span>,
      meta: { className: 'min-w-40' },
      cell: ({ row }) => (
        <TextWithTooltip text={row.original.title} className="max-w-70 text-sm font-medium" />
      ),
    },
    {
      accessorKey: 'version',
      header: () => <span className="text-xs font-semibold">現行バージョン</span>,
      meta: { className: 'w-25' },
      cell: ({ row }) => (
        <Badge variant="outline" className="max-w-24" title={row.original.version}>
          <span className="truncate">{row.original.version}</span>
        </Badge>
      ),
    },
    {
      accessorKey: 'brandEnum',
      header: () => <span className="text-xs font-semibold">ブランド</span>,
      meta: { className: 'w-40' },
      cell: ({ row }) => (
        <div className="flex flex-nowrap gap-1">
          {termsBrandEnums(row.original.brandEnum).map((brand) => (
            <BrandBadge key={brand} brand={brand} />
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'effectiveFrom',
      enableSorting: true,
      header: ({ column }) => <DataTableColumnHeader column={column} title="適用開始日" />,
      meta: { className: 'w-30' },
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.effectiveFrom)}</span>,
    },
    {
      accessorKey: 'status',
      header: () => <span className="text-xs font-semibold">ステータス</span>,
      meta: { className: 'w-25' },
      cell: ({ row }) => (
        <ToneBadge tone={TERMS_STATUS_TONES[row.original.status]}>
          {TERMS_STATUS_LABELS[row.original.status]}
        </ToneBadge>
      ),
    },
    {
      id: 'actions',
      header: () => null,
      meta: { className: 'w-10' },
      cell: ({ row }) => {
        const item = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="sm" />}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
              {item.isDeleted ? (
                <DropdownMenuItem onClick={() => onViewClick?.(item)}>
                  <Eye className="size-4" />
                  詳細を見る
                </DropdownMenuItem>
              ) : (
                <>
                  <RoleGatedMenuItem
                    allowedRoles={[UserRole.Headquarter, UserRole.System]}
                    onClick={() => onEditClick?.(item)}
                  >
                    <Pencil className="size-4" />
                    編集
                  </RoleGatedMenuItem>
                  <DropdownMenuSeparator />
                  <RoleGatedMenuItem
                    allowedRoles={[UserRole.Headquarter, UserRole.System]}
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDeleteClick?.(item)}
                  >
                    <Trash2 className="size-4" />
                    削除
                  </RoleGatedMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
