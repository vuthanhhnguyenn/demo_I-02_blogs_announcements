'use client';
import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { formatYen } from '@/utils/format.util';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Loader2, MoreHorizontal, Pencil, Store, Trash2 } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminPlanControllerContractsCountOptions,
  adminPlanControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import {
  MAIN_CONTRACT_STATUS_BADGE_CLASSES,
  MAIN_CONTRACT_STATUS_LABELS,
  MAIN_CONTRACT_TYPE_BADGE_CLASSES,
  MAIN_CONTRACT_TYPE_LABELS,
  type MainContractRow,
  PLAN_BRAND_BADGE_CLASSES,
  PLAN_BRAND_LABELS,
  type PlanBrandEnum,
} from '../_constants/constants';
import { getContractCopyState } from '../_utils/contract-action-state';

interface UseContractsTableColumnsOptions {
  onDelete: (contract: MainContractRow) => void;
}

/**
 * ⋯ menu of one row. 編集/削除 are gated by the contract-count probe (API-087 §10), which is the
 * only source of `derivedChildCount` — the list row carries the contract count alone. One request
 * per menu opening, per the 2026-08-17 decision recorded in the API-087 review tracking.
 */
function ContractRowActions({
  contract,
  onDelete,
}: Readonly<{ contract: MainContractRow; onDelete: (contract: MainContractRow) => void }>) {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const queryClient = useQueryClient();
  const {
    data: guard,
    isPending: isGuardPending,
    error: guardError,
    isError: isGuardError,
  } = useQuery({
    ...adminPlanControllerContractsCountOptions({ path: { planId: contract.planId } }),
    enabled: isMenuOpen,
    // The backend's own message is toasted (e.g. 404 when the plan was deleted elsewhere).
    meta: { showErrorToast: true },
  });

  // A 404 means the row is stale (deleted in another session): refetch so it disappears.
  useEffect(() => {
    if (isGuardError && getApiErrorStatus(guardError) === 404) {
      queryClient.invalidateQueries({ queryKey: adminPlanControllerListQueryKey() });
    }
  }, [isGuardError, guardError, queryClient]);

  // Until the probe answers, both destructive actions stay locked rather than flickering open.
  const isProbing = isMenuOpen && isGuardPending;
  const canEdit = guard?.canEdit ?? false;
  const canDelete = guard?.canDelete ?? false;
  const probeFailedMessage = '契約者数を確認できませんでした。時間をおいて再度お試しください';
  const blockedMessage = guard
    ? `契約者 ${guard.activeContractCount.toLocaleString()}名・子主契約 ${guard.derivedChildCount}件が存在するため削除できません`
    : isGuardError
      ? probeFailedMessage
      : '契約者数を確認中です';
  // 特殊契約 cannot be copied; a derived child copies as a sibling under the same 親主契約.
  const { canCopy, copyBlockedMessage } = getContractCopyState(contract);

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" />}
        onClick={(e) => e.stopPropagation()}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <RoleGatedMenuItem
          requiredPermission={Permission.ContractsEdit}
          disabled={isProbing || !canEdit}
          tooltip={
            isProbing
              ? '契約者数を確認中です'
              : isGuardError
                ? probeFailedMessage
                : canEdit
                  ? undefined
                  : '契約者が存在するため編集できません。新規マスタを登録してください'
          }
          onClick={() => {
            router.push(withReturnTo(navigate('/contracts/[id]/edit', contract.planId)));
          }}
        >
          {isProbing ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
          編集
        </RoleGatedMenuItem>
        {/* 複製 runs under the create permission — it is a create flow prefilled from the source.
            Derived children and 特殊契約 cannot be copied (`isCopyable`, prototype 2026-09-17). */}
        <RoleGatedMenuItem
          requiredPermission={Permission.ContractsCreate}
          disabled={!canCopy}
          tooltip={copyBlockedMessage}
          onClick={() => {
            router.push(
              withReturnTo(`${navigate('/contracts/create')}?copyFrom=${contract.planId}`),
            );
          }}
        >
          <Copy className="size-4" />
          複製
        </RoleGatedMenuItem>
        <DropdownMenuSeparator />
        <RoleGatedMenuItem
          requiredPermission={Permission.ContractsDelete}
          className="text-destructive"
          disabled={isProbing || !canDelete}
          tooltip={canDelete && !isProbing ? undefined : blockedMessage}
          onClick={() => onDelete(contract)}
        >
          {isProbing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          削除
        </RoleGatedMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function useContractsTableColumns({
  onDelete,
}: UseContractsTableColumnsOptions): ColumnDef<MainContractRow>[] {
  // Memoised: react-table renders `header`/`cell` functions as components, so a fresh array on
  // every render remounts each header and resets its sort tooltip (flicker while a sort refetches).
  return useMemo(
    () => [
      {
        accessorKey: 'planCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.original.planCode}</span>
        ),
        meta: {
          className: 'min-w-[80px]',
        },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="主契約名" />,
        // Truncated: an unbounded 主契約名 stretches the cell and pushes the columns after it
        // (and the row-action control) off screen — same failure as BUG-P2-01-15 on スタッフ一覧.
        cell: ({ row }) => (
          <TextWithTooltip
            text={row.original.name}
            className="max-w-36 text-xs font-medium"
            wrapperClassName="min-w-0"
          />
        ),
        meta: {
          className: 'min-w-[160px]',
        },
      },
      {
        accessorKey: 'contractType',
        header: ({ column }) => <DataTableColumnHeader column={column} title="契約タイプ" />,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={`text-[10px] ${MAIN_CONTRACT_TYPE_BADGE_CLASSES[row.original.contractType]}`}
          >
            {MAIN_CONTRACT_TYPE_LABELS[row.original.contractType]}
          </Badge>
        ),
        meta: {
          className: 'min-w-[100px]',
        },
      },
      {
        accessorKey: 'brandEnum',
        header: 'ブランド',
        // `brandEnum` is typed as a bare string on the list DTO, so an unknown brand falls back
        // to the neutral badge instead of rendering an empty one.
        cell: ({ row }) => {
          const brand = row.original.brandEnum as PlanBrandEnum;
          return (
            <Badge
              variant="outline"
              className={`text-[10px] ${
                PLAN_BRAND_BADGE_CLASSES[brand] ?? 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {PLAN_BRAND_LABELS[brand] ?? row.original.brandEnum}
            </Badge>
          );
        },
        meta: {
          className: 'min-w-[100px]',
        },
        enableSorting: false,
      },
      {
        accessorKey: 'storeName',
        header: '店舗',
        // G-01 FR-M001「店舗（特殊契約の場合）」 — the column is filled for 特殊契約 alone (#117);
        // any other type is store-unrestricted and renders as ―, even when the row carries a store.
        cell: ({ row }) =>
          row.original.contractType === 'special' && row.original.storeName ? (
            <div className="flex min-w-0 items-center gap-1">
              <Store className="text-muted-foreground size-3 shrink-0" />
              <TextWithTooltip
                text={row.original.storeName}
                className="max-w-20 text-xs"
                wrapperClassName="min-w-0"
              />
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">―</span>
          ),
        meta: {
          className: 'min-w-[100px]',
        },
        enableSorting: false,
      },
      {
        accessorKey: 'priceMonthly',
        header: ({ column }) => <DataTableColumnHeader column={column} title="料金(税込)" />,
        cell: ({ row }) => (
          <span className="block text-right text-xs font-medium">
            {formatYen(row.original.priceMonthly)}
          </span>
        ),
        meta: {
          className: 'min-w-[100px] text-right',
        },
      },
      {
        accessorKey: 'hasCompanionBenefit',
        header: '同伴特典',
        cell: ({ row }) =>
          row.original.hasCompanionBenefit ? (
            <Badge
              variant="outline"
              className="bg-success/15 text-success border-success/20 text-[10px]"
            >
              あり
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">―</span>
          ),
        meta: {
          className: 'min-w-[90px]',
        },
        enableSorting: false,
      },
      {
        accessorKey: 'parentPlanName',
        header: '親主契約',
        cell: ({ row }) =>
          row.original.parentPlanName ? (
            <span className="flex min-w-0 items-center gap-1">
              <span className="text-muted-foreground shrink-0">└</span>
              <TextWithTooltip
                text={row.original.parentPlanName}
                className="max-w-32 text-xs font-medium"
                wrapperClassName="min-w-0"
              />
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">―</span>
          ),
        meta: {
          className: 'min-w-[100px]',
        },
        enableSorting: false,
      },
      {
        accessorKey: 'contractCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="契約者数" />,
        // G-01 FR-M001 列「契約者数」 — also the precondition 編集/削除 are judged on. The ⋯ menu still
        // probes `contracts/count`, because 子主契約数 is not carried by the list row.
        cell: ({ row }) => (
          <span
            className={`block text-right text-xs tabular-nums ${
              row.original.contractCount > 0 ? '' : 'text-muted-foreground'
            }`}
          >
            {row.original.contractCount.toLocaleString()}名
          </span>
        ),
        meta: {
          className: 'min-w-[90px] text-right',
        },
      },
      {
        accessorKey: 'isActive',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状態" />,
        cell: ({ row }) => {
          const statusKey = row.original.isActive ? 'active' : 'inactive';
          return (
            <Badge
              variant="outline"
              className={`text-[10px] ${MAIN_CONTRACT_STATUS_BADGE_CLASSES[statusKey]}`}
            >
              {MAIN_CONTRACT_STATUS_LABELS[statusKey]}
            </Badge>
          );
        },
        meta: {
          className: 'min-w-[80px]',
        },
      },
      {
        id: 'actions',
        header: '',
        // The wrapper swallows clicks on the cell's padding too, so only the button / menu react —
        // the row itself navigates to the detail.
        cell: ({ row }) => (
          <div
            className="-m-2 flex h-12 items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <ContractRowActions contract={row.original} onDelete={onDelete} />
          </div>
        ),
        enableSorting: false,
        meta: {
          // Pinned to the right edge so the ⋯ menu stays reachable while the wide table scrolls inside its card.
          className: 'sticky right-0 w-10',
          headerClassName: 'z-20',
          cellClassName: 'bg-background z-10',
        },
      },
    ],
    [onDelete],
  );
}
