'use client';

import Link from 'next/link';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';

import type { BlacklistItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  BLACKLIST_SOURCE_LABEL,
  formatBlacklistReasons,
  getBlacklistSourceBadgeClass,
} from '../_constants/blacklist.constants';

type BlacklistRow = BlacklistItemDto;

/**
 * FR-006 — seven columns. V0 keeps an eighth, 照合結果, behind a feature flag that is off;
 * it is **not** built: the contract's `matchResult` is an FR-024 (Could) placeholder that is
 * null at v0.4, and the client confirmed on 2026-07-29 that the column stays hidden (Q-01).
 */
export function BlacklistTableColumns(): ColumnDef<BlacklistRow>[] {
  return [
    {
      id: 'memberNumber',
      header: '会員ID',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.member?.memberNumber ?? '—'}
        </span>
      ),
    },
    {
      id: 'memberName',
      header: '氏名',
      cell: ({ row }) => {
        const member = row.original.member;
        const name = [member?.lastName, member?.firstName].filter(Boolean).join(' ') || '—';
        if (!member) return <span className="text-sm font-medium">{name}</span>;
        /**
         * FR-008 — the name is its own link to the member detail. `stopPropagation` keeps
         * the row's own navigation (to the blacklist detail) from firing as well, so the
         * two destinations stay distinguishable.
         */
        return (
          <Link
            href={navigate('/members/[id]', member.memberId)}
            className="block max-w-56 text-sm font-medium [overflow-wrap:anywhere] whitespace-normal hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </Link>
        );
      },
    },
    {
      id: 'storeName',
      header: '店舗名',
      // FR-009 — a member with no primary store shows a dash, not an empty cell.
      cell: ({ row }) => (
        <span className="block max-w-48 text-xs [overflow-wrap:anywhere] whitespace-normal">
          {row.original.member?.primaryStore?.name ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'source',
      header: '登録経路',
      cell: ({ row }) => {
        // FR-010 — the registration-path axis; the reason axis is the next column.
        const source = row.original.source;
        return (
          <Badge
            variant="outline"
            className={`text-[10px] ${getBlacklistSourceBadgeClass(source)}`}
          >
            {BLACKLIST_SOURCE_LABEL[source]}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'reasonCategories',
      header: '登録理由',
      // FR-010a — the reason axis, as plain text.
      cell: ({ row }) => (
        <span className="block max-w-48 text-xs [overflow-wrap:anywhere] whitespace-normal">
          {formatBlacklistReasons(row.original.reasonCategories)}
        </span>
      ),
    },
    {
      accessorKey: 'unpaidAmount',
      header: () => <div className="text-right">未納金額</div>,
      cell: ({ row }) => {
        const amount = row.original.unpaidAmount;
        return (
          <div
            className={`text-right text-xs ${
              amount > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'
            }`}
          >
            ¥{amount.toLocaleString()}
          </div>
        );
      },
    },
    {
      accessorKey: 'registeredAt',
      header: '登録日',
      cell: ({ row }) => (
        <span className="text-xs">{formatDateYYYYMMDD(row.original.registeredAt)}</span>
      ),
    },
  ];
}
