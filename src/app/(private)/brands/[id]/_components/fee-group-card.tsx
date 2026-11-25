'use client';

import { useRef } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { Ban, CheckCircle2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Permission } from '@/types/permission.type';

import type { BrandFeeGroup } from '../_types/brand-fee.type';
import { BrandStatusBadge } from './brand-status-badge';
import { CancelPolicyNote } from './cancel-policy-note';
import { FeeItemBlock } from './fee-item-block';

type MenuAction = 'disable' | 'delete';

interface FeeGroupCardProps {
  feeGroup: BrandFeeGroup;
  isEnabling: boolean;
  onEdit: (feeGroup: BrandFeeGroup) => void;
  onDisable: (feeGroup: BrandFeeGroup) => void;
  onEnable: (feeGroup: BrandFeeGroup) => void;
  onDelete: (feeGroup: BrandFeeGroup) => void;
}

/**
 * One sub-brand frame (Y-07 FR-002 サブブランド単位カード — the heading is just the name) holding
 * its 費用マスタ section. Status, 変更 and ⋯ sit on the section's heading row because what they act
 * on is the fee master, never the sub-brand (Y-07 260928_v3 FR-001).
 */
export function FeeGroupCard({
  feeGroup,
  isEnabling,
  onEdit,
  onDisable,
  onEnable,
  onDelete,
}: FeeGroupCardProps) {
  const { hasPermission } = useAuthUser();
  const canManageFee = hasPermission(Permission.BrandsEdit);
  const isActive = feeGroup.feeMasterStatus === 'active';

  // Open the dialog only once the menu has finished closing, so focus does not bounce between the
  // two layers (the option-contracts card's pattern).
  const pendingAction = useRef<MenuAction | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="min-w-0 text-base font-semibold [overflow-wrap:anywhere]">
          {feeGroup.title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          <section
            aria-label={`${feeGroup.title}の費用マスタ`}
            className="flex flex-col gap-4 rounded-lg border p-4"
          >
            {/* min-h-7 keeps the heading row 28px in all three states (有効 / 無効 / 未登録). */}
            <div className="flex min-h-7 items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <p className="text-sm font-medium">費用マスタ</p>
                <BrandStatusBadge status={isActive ? 'active' : 'inactive'} showDot={false} />
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <RoleGatedButton
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  requiredPermission={Permission.BrandsEdit}
                  denyTooltip="本部権限が必要です"
                  onClick={() => onEdit(feeGroup)}
                >
                  <Pencil className="size-3" />
                  変更
                </RoleGatedButton>

                {canManageFee ? (
                  <DropdownMenu
                    onOpenChangeComplete={(isOpen) => {
                      if (isOpen || !pendingAction.current) return;
                      const action = pendingAction.current;
                      pendingAction.current = null;
                      if (action === 'disable') onDisable(feeGroup);
                      else onDelete(feeGroup);
                    }}
                  >
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="費用マスタの操作"
                          disabled={isEnabling}
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isActive ? (
                        <DropdownMenuItem onClick={() => (pendingAction.current = 'disable')}>
                          <Ban className="size-4" />
                          費用マスタを無効化
                        </DropdownMenuItem>
                      ) : (
                        // 有効化 is immediate — no dialog (the prototype's choice: it is the
                        // harmless direction and fully reversible).
                        <DropdownMenuItem onClick={() => onEnable(feeGroup)}>
                          <CheckCircle2 className="size-4" />
                          費用マスタを有効化
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => (pendingAction.current = 'delete')}
                      >
                        <Trash2 className="size-4" />
                        費用マスタを削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <RoleGatedButton
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="費用マスタの操作"
                    requiredPermission={Permission.BrandsEdit}
                    denyTooltip="本部権限が必要です"
                  >
                    <MoreHorizontal className="size-4" />
                  </RoleGatedButton>
                )}
              </div>
            </div>

            {/* Inactive only: what stopped is the fee master, and its amounts / 予約 are kept. */}
            {!isActive && (
              <p className="text-muted-foreground text-xs">
                この費用マスタは無効です。金額と予約中の改定はそのまま残っています。
              </p>
            )}

            {/* Wrapped so the divider sits only between items, not under the heading row. */}
            <div className="flex flex-col gap-4">
              {feeGroup.feeItems.map((feeItem, index) => (
                <FeeItemBlock key={feeItem.feeType} feeItem={feeItem} itemNumber={index + 1} />
              ))}
            </div>
          </section>

          <CancelPolicyNote />
        </div>
      </CardContent>
    </Card>
  );
}
