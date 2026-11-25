'use client';

import { type ReactNode, useMemo } from 'react';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, Check, Copy, MoreHorizontal, Pencil, RotateCcw } from 'lucide-react';

import { DataTable } from '@/components/common/data-table';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { PromotionCodeListItemDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import {
  PROMO_CODE_INACTIVE_STATUSES,
  PROMO_CODE_SCOPE_LABELS,
  PROMO_CODE_STATUS_BADGE_CLASSES,
  PROMO_CODE_STATUS_LABELS,
} from '../../_constants/constants';
import type { PromoCodesTabHook } from '../_hooks/use-promo-codes-tab';

const DASH = '—';

type PromoCodeTableProps = {
  tab: PromoCodesTabHook;
  emptyContent: ReactNode;
  /** Title of the in-table error row shown when a refetch fails with rows still on screen. */
  errorTitle: string;
  /** 再試行 of that row; left out for failures a resend cannot fix (400/403/422). */
  onRetry?: () => void;
};

export function PromoCodeTable({
  tab,
  emptyContent,
  errorTitle,
  onRetry,
}: Readonly<PromoCodeTableProps>) {
  const { copiedCode, copyCode, setEditTarget, setDisableTarget, reEnableCode, isReEnabling } = tab;

  const columns: ColumnDef<PromotionCodeListItemDto>[] = useMemo(
    () => [
      {
        id: 'code',
        header: 'コード',
        meta: { className: 'min-w-[160px]' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <code className="bg-muted rounded px-2 py-1 font-mono text-xs">
              {row.original.code}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="size-6 p-0"
              onClick={() => copyCode(row.original.code)}
              aria-label="コードをコピー"
            >
              {copiedCode === row.original.code ? (
                <Check className="text-success size-3" />
              ) : (
                <Copy className="text-muted-foreground size-3" />
              )}
            </Button>
          </div>
        ),
      },
      {
        id: 'description',
        header: '説明',
        meta: { className: 'min-w-[180px]' },
        cell: ({ row }) => (
          <span
            className="block max-w-[280px] truncate text-xs"
            title={row.original.description ?? undefined}
          >
            {row.original.description ?? DASH}
          </span>
        ),
      },
      {
        id: 'validPeriod',
        header: '有効期間',
        meta: { className: 'min-w-[180px]', cellClassName: 'text-xs' },
        cell: ({ row }) =>
          `${formatDateYYYYMMDD(row.original.validFrom)} 〜 ${formatDateYYYYMMDD(row.original.validTo)}`,
      },
      {
        id: 'usage',
        header: '使用済み / 使用上限',
        meta: { className: 'w-[130px]', cellClassName: 'text-xs' },
        cell: ({ row }) => (
          <>
            <span className="font-medium">{row.original.usedCount}</span>
            <span className="text-muted-foreground">
              {' / '}
              {row.original.maxUses === null ? '無制限' : `${row.original.maxUses}回`}
            </span>
          </>
        ),
      },
      {
        id: 'remaining',
        header: '残数',
        meta: { className: 'w-[80px]', cellClassName: 'text-xs font-medium' },
        cell: ({ row }) =>
          row.original.usageStats.remaining === null ? (
            <span className="text-muted-foreground">{DASH}</span>
          ) : (
            row.original.usageStats.remaining
          ),
      },
      {
        id: 'usageRate',
        header: '使用率',
        meta: { className: 'w-[80px]', cellClassName: 'text-xs font-medium' },
        cell: ({ row }) =>
          row.original.usageStats.usageRate === null ? (
            <span className="text-muted-foreground">{DASH}</span>
          ) : (
            `${row.original.usageStats.usageRate}%`
          ),
      },
      {
        id: 'scope',
        header: '適用店舗',
        meta: { className: 'w-[120px]' },
        cell: ({ row }) => (
          <Badge variant="outline">{PROMO_CODE_SCOPE_LABELS[row.original.scopeType]}</Badge>
        ),
      },
      {
        id: 'status',
        header: 'ステータス',
        meta: { className: 'w-[110px]' },
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(PROMO_CODE_STATUS_BADGE_CLASSES[row.original.effectiveStatus])}
          >
            {PROMO_CODE_STATUS_LABELS[row.original.effectiveStatus]}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        meta: {
          headerClassName: 'right-0 z-20 w-10',
          cellClassName: 'bg-background sticky right-0 z-10',
        },
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="hover:bg-muted flex size-8 items-center justify-center rounded-md"
              aria-label="promo code actions"
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* API-089 §6a: 発行済みコードで編集できるのは説明のみ（他項目は新規発行で対応） */}
              <RoleGatedMenuItem
                requiredPermission={Permission.CampaignsPromoCodeEdit}
                onClick={() => setEditTarget(row.original)}
              >
                <Pencil className="size-4" />
                編集
              </RoleGatedMenuItem>
              {/* G-06 FR-007 途中無効化: 理由必須の確認ダイアログを開く */}
              <RoleGatedMenuItem
                requiredPermission={Permission.CampaignsPromoCodeDelete}
                className="text-destructive"
                disabled={row.original.status === 'disabled'}
                onClick={() => setDisableTarget(row.original)}
              >
                <Ban className="size-4" />
                無効化
              </RoleGatedMenuItem>
              {/* G-06 FR-007 無効化の取り消し（再有効化） */}
              <RoleGatedMenuItem
                requiredPermission={Permission.CampaignsPromoCodeDelete}
                disabled={row.original.status !== 'disabled' || isReEnabling}
                onClick={() => reEnableCode(row.original.id)}
              >
                <RotateCcw className="size-4" />
                有効化
              </RoleGatedMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [copiedCode, copyCode, setEditTarget, setDisableTarget, reEnableCode, isReEnabling],
  );

  return (
    <DataTable
      columns={columns}
      data={tab.promoCodes}
      variant="simple"
      isLoading={tab.isLoading}
      isFetching={tab.isFetching}
      isError={tab.isError}
      onRetry={onRetry}
      errorTitle={errorTitle}
      className="rounded-none border-x-0 border-b-0"
      containerClassName="max-h-[calc(100vh-420px)] min-h-[200px]"
      getRowClassName={(promoCode) =>
        PROMO_CODE_INACTIVE_STATUSES.includes(promoCode.effectiveStatus) ? 'opacity-60' : undefined
      }
      tableOptions={{ getRowId: (promoCode) => promoCode.id }}
      emptyContent={emptyContent}
    />
  );
}
